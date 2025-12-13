import { Injectable } from '@nestjs/common';
import { MediasoupService } from '../mediasoup/mediasoup.service';
import { config } from '../common/config';
import { Router, WebRtcTransport, Producer, Consumer } from 'mediasoup/types';

// 定义简单的接口
interface RoomState {
  router: Router;
  peers: Map<string, PeerState>; // socketId -> Peer
}

interface PeerState {
  transports: Map<string, WebRtcTransport>; // transportId -> Transport
  producers: Map<string, Producer>;
  consumers: Map<string, Consumer>;
}

@Injectable()
export class RoomService {
  // 内存存储：roomId -> RoomState
  private rooms: Map<string, RoomState> = new Map();

  constructor(private readonly mediasoupService: MediasoupService) {}

  // --- 1. 房间与用户管理 ---

  async joinRoom(roomId: string, peerId: string) {
    let room = this.rooms.get(roomId);
    
    // 如果房间不存在，创建一个新的 Router
    if (!room) {
      const worker = this.mediasoupService.getWorker();
      const router = await worker.createRouter({ mediaCodecs: config.mediasoup.router.mediaCodecs });
      room = { router, peers: new Map() };
      this.rooms.set(roomId, room);
    }

    // 初始化 Peer 数据结构
    if (!room.peers.has(peerId)) {
      room.peers.set(peerId, {
        transports: new Map(),
        producers: new Map(),
        consumers: new Map(),
      });
    }

    // 返回 Router 的能力 (RtpCapabilities)，前端必须拿到这个才能 load device
    return room.router.rtpCapabilities;
  }

  // --- 2. 创建传输管道 (WebRtcTransport) ---

  async createWebRtcTransport(roomId: string, peerId: string) {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');

    // 在 Router 上创建 Transport
    const transport = await room.router.createWebRtcTransport(config.mediasoup.webRtcTransport);

    // 将 Transport 保存到内存，后面 connect 时要用
    const peer = room.peers.get(peerId);
    if (!peer) {
        await transport.close(); // 关闭刚创建的 transport，防止资源泄露
        throw new Error(`Peer ${peerId} not found in room ${roomId}. Did they join the room?`);
    }
    peer.transports.set(transport.id, transport);

    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };
  }

  // --- 3. 连接传输管道 (DTLS 握手) ---

  async connectTransport(roomId: string, peerId: string, transportId: string, dtlsParameters: any) {
    const transport = this.getTransport(roomId, peerId, transportId);
    await transport.connect({ dtlsParameters });
  }

  // --- 4. 发布媒体流 (Produce) ---

  async produce(
    roomId: string,
    peerId: string,
    transportId: string,
    kind: any,
    rtpParameters: any,
    appData: any = {}, // <--- 🚀 新增：接收 appData
  ) {
    const transport = this.getTransport(roomId, peerId, transportId);
    const room = this.rooms.get(roomId);
    if (!room) throw new Error(`Room ${roomId} not found during produce.`);
    const peer = room.peers.get(peerId);
    if (!peer) throw new Error(`Peer ${peerId} not found during produce.`);

    // 创建 Producer 时，将 appData 传给 Mediasoup
    const producer = await transport.produce({ 
      kind, 
      rtpParameters,
      appData, // <--- 🚀 关键：把元数据存入 Producer 对象中
    });

    // 保存 producer
    peer.producers.set(producer.id, producer);

    return { id: producer.id };
  }

  // --- 5. 消费/订阅媒体流 (Consume) ---

  async consume(roomId: string, peerId: string, transportId: string, producerId: string, rtpCapabilities: any) {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error(`Room ${roomId} not found during consume.`);
    const router = room.router;
    const transport = this.getTransport(roomId, peerId, transportId);

    // 检查是否可以消费
    if (!router.canConsume({ producerId, rtpCapabilities })) {
      throw new Error('Can not consume');
    }

    const consumer = await transport.consume({
      producerId,
      rtpCapabilities,
      paused: true, // 建议先暂停，等前端准备好后再 resume
    });

    // 保存 consumer
    const peer = room.peers.get(peerId);
    if (!peer) throw new Error(`Peer ${peerId} not found during consume.`);
    peer.consumers.set(consumer.id, consumer);

    return {
      id: consumer.id,
      producerId: producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
    };
  }

  // 辅助函数：查找 Transport
  private getTransport(roomId: string, peerId: string, transportId: string) {
    const room = this.rooms.get(roomId);
    const peer = room?.peers.get(peerId);
    const transport = peer?.transports.get(transportId);
    if (!transport) throw new Error(`Transport ${transportId} not found`);
    return transport;
  }

  async resumeConsumer(roomId: string, peerId: string, consumerId: string) {
    const room = this.rooms.get(roomId);
    const peer = room?.peers.get(peerId);
    const consumer = peer?.consumers.get(consumerId);

    if (!consumer) throw new Error(`Consumer ${consumerId} not found`);

    await consumer.resume(); // 核心：让 Mediasoup 开始发包

    await consumer.requestKeyFrame();
  }
}