// src/services/webrtc.js
import io from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';

class MeetingService {
  constructor() {
    this.socket = null;
    this.device = null;
    this.sendTransport = null;
    this.recvTransport = null;
    this.roomId = null;
    this.peerId = null;
  }

  // 封装 Socket 请求
  request(event, data = {}) {
    return new Promise((resolve, reject) => {
      this.socket.emit(event, data, (res) => {
        if (res && res.error) reject(res.error);
        else resolve(res);
      });
    });
  }

  async connect(serverUrl, roomId, onNewProducer, onPeerLeft, onProducerClosed) {
    this.roomId = roomId;
    this.socket = io(serverUrl);

    return new Promise((resolve) => {
      this.socket.on('connect', async () => {
        this.peerId = this.socket.id;

        // 1. 加入房间，获取 RTP 能力和存量 Producer
        const { rtpCapabilities, existingProducers } = await this.request('joinRoom', { roomId });

        console.log(existingProducers);
        // 2. 加载设备
        this.device = new mediasoupClient.Device();
        await this.device.load({ routerRtpCapabilities: rtpCapabilities });

        // 3. 创建收发管道
        await this.createTransports();

        // 4. 处理已经在房间里的人 (存量)
        if (existingProducers && existingProducers.length > 0) {
          console.log(`Found ${existingProducers.length} existing producers. Consuming...`);
          existingProducers.forEach(({ producerId, peerId, appData }) => {
            onNewProducer(producerId, peerId, appData);
          });
        }

        // 5. 监听以后新加入的人 (增量)
        this.socket.on('newProducer', ({ producerId, peerId, appData }) => {
          onNewProducer(producerId, peerId, appData);
        });

        this.socket.on('peerLeft', ({ peerId }) => {
          onPeerLeft(peerId);
        });

        this.socket.on('producerClosed', ({ producerId, peerId }) => {
          onProducerClosed(producerId, peerId);
        });

        resolve();
      });
    });
  }

  async closeProducer(producerId) {
    // 通知后端
    await this.request('closeProducer', { 
        roomId: this.roomId, 
        producerId 
    });
}

  async createTransports() {
    // --- 创建发送管道 ---
    const sendParams = await this.request('createWebRtcTransport', { roomId: this.roomId });
    console.log('Transport Params from Backend:', sendParams); // 🚀 检查这里！
    this.sendTransport = this.device.createSendTransport(sendParams);

    this.sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await this.request('connectTransport', { roomId: this.roomId, transportId: this.sendTransport.id, dtlsParameters });
        callback();
      } catch (err) { errback(err); }
    });

    this.sendTransport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
      try {
        const { id } = await this.request('produce', { roomId: this.roomId, transportId: this.sendTransport.id, kind, rtpParameters, appData });
        callback({ id });
      } catch (err) { errback(err); }
    });

    // --- 创建接收管道 ---
    const recvParams = await this.request('createWebRtcTransport', { roomId: this.roomId });
    this.recvTransport = this.device.createRecvTransport(recvParams);

    this.recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await this.request('connectTransport', { roomId: this.roomId, transportId: this.recvTransport.id, dtlsParameters });
        callback();
      } catch (err) { errback(err); }
    });
  }

  async produce(track, label) {
    return await this.sendTransport.produce({
      track,
      appData: { label } // 标记是 camera 还是 screen
    });
  }

  async consume(producerId) {
    // 1. 获取消费参数
    const { id, kind, rtpParameters } = await this.request('consume', {
      roomId: this.roomId,
      transportId: this.recvTransport.id,
      producerId,
      rtpCapabilities: this.device.rtpCapabilities
    });

    // 2. 前端创建 Consumer
    const consumer = await this.recvTransport.consume({ id, producerId, kind, rtpParameters });

    console.log('Consumer created:', consumer.id, 'for producer:', producerId);
    // 🚀 【关键】必须通知后端 Resume，服务器才会开始发包
    await this.request('resumeConsumer', { 
      roomId: this.roomId, 
      consumerId: consumer.id 
    });
    
    const stream = new MediaStream([consumer.track]);
    return { stream, consumer };
  }
}

export default new MeetingService();