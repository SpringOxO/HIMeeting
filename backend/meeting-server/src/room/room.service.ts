import { Injectable } from '@nestjs/common';
import { MediasoupService } from '../mediasoup/mediasoup.service';
import { config } from '../common/config';
import { Router, WebRtcTransport, Producer, Consumer } from 'mediasoup/types';
import { DocumentService } from '../document/document.service';
import { DocumentState } from '../document/document.model';
import { DocumentType } from '../document/document.model';
import * as fs from 'fs';
import * as path from 'path';

// 定义简单的接口
interface RoomState {
  router: Router;
  peers: Map<string, PeerState>; // socketId -> Peer
  documents: Map<number, DocumentState>;
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

  private clientRoomMap = new Map<string, string>(); // socketId -> roomId

  constructor(private readonly mediasoupService: MediasoupService) {}

  // --- 1. 房间与用户管理 ---

  async joinRoom(roomId: string, peerId: string) {
    this.clientRoomMap.set(peerId, roomId);

    let room = this.rooms.get(roomId);
    
    const existingProducers: { producerId: string; peerId: string; appData: any }[] = [];
    
    // 如果房间不存在，创建一个新的 Router
    if (!room) {
      const worker = this.mediasoupService.getWorker();
      const router = await worker.createRouter({ mediaCodecs: config.mediasoup.router.mediaCodecs });
      const textDoc = DocumentService.create(0, 'text'); // 默认文本文档
      const whiteboardDoc = DocumentService.create(1, 'whiteboard'); // 默认画板文档
      const chatDoc = DocumentService.create(2, 'chat'); // 默认聊天文档
    room = {
      router,
      peers: new Map(),
      documents: new Map<number, DocumentState>([
        [0, textDoc],
        [1, whiteboardDoc],
        [2, chatDoc],
      ]),
    };
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

    // 序列化所有文档
    const documents = Array.from(room.documents.values()).map(doc => ({
      id: doc.id,              // 0 / 1
      type: doc.type,          // text / whiteboard
      state: DocumentService.encodeState(doc),
      createdAt: doc.createdAt,
    }));

    room.peers.forEach((peer, existingPeerId) => {
      // 排除掉自己（虽然刚加入时自己还没发流，但这是个好习惯）
      if (existingPeerId !== peerId) {
        peer.producers.forEach((producer) => {
          existingProducers.push({
            producerId: producer.id,
            peerId: existingPeerId,
            appData: producer.appData, // 包含 label: 'camera' 等信息
          });
        });
      }
    });

    // 返回 Router 的能力 (RtpCapabilities)，前端必须拿到这个才能 load device, 新增现存的 producers 列表
    return {
      rtpCapabilities: room.router.rtpCapabilities,
      existingProducers, //  将存量列表返回给前端
      documents,
    };
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

  // 新增文档
  createDocument(
    roomId: string,
    docId: number,
    type: DocumentType,
  ): DocumentState {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    const document = DocumentService.create(docId, type);
    room.documents.set(document.id, document);

    return document;
  }

  // 修改文档
  applyDocumentUpdate(
    roomId: string,
    docId: number,
    update: Uint8Array,
  ) {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    const document = room.documents.get(docId);
    if (!document) {
      throw new Error(`Document ${docId} not found`);
    }

    DocumentService.applyUpdate(document, update);
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
    // console.log('Resuming consumer:', consumerId);
    const room = this.rooms.get(roomId);
    const peer = room?.peers.get(peerId);
    const consumer = peer?.consumers.get(consumerId);

    if (!consumer) throw new Error(`Consumer ${consumerId} not found`);
    // console.log('Consumer resuming:', consumerId);
    await consumer.resume(); // 核心：让 Mediasoup 开始发包
    console.log('Consumer resumed:', consumerId)
    await consumer.requestKeyFrame();
  }

  getRoomIdByClient(clientId: string): string {
    const roomId = this.clientRoomMap.get(clientId);
    if (!roomId) throw new Error(`Room ${roomId} not found in the map.`);
    return roomId;
  }

  getRoomByRoomId(roomId: string): RoomState {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error(`Room ${roomId} not found in the map.`);
    return room;
  }

  async handlePeerDisconnect(peerId: string): Promise<string | null> {
    let foundRoomId: string | null = null;

    // 1. 遍历所有房间寻找这个 peer
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.peers.has(peerId)) {
        foundRoomId = roomId;
        const peer = room.peers.get(peerId);

        // 2. 销毁该 Peer 拥有的所有 Mediasoup 资源 (Producers, Consumers, Transports)
        // 这一步非常重要，否则服务器内存会溢出
        if (peer) {
          // 关闭该 Peer 的所有 Producers
          peer.producers.forEach(p => p.close());
          // 关闭该 Peer 的所有 Consumers
          peer.consumers.forEach(c => c.close());
          // 假设你在 Peer 对象中也存了 transports，也需要全部 close
          // peer.transports.forEach(t => t.close());
        }

        // 3. 从 Room 的 Peer 列表中移除
        room.peers.delete(peerId);
        console.log(`Peer ${peerId} removed from room ${roomId}`);
        
        // 如果房间空了，可以考虑销毁
        if (room.peers.size === 0) { 
          await this.destroyRoom(roomId); 
        }
        
        break; 
      }
    }
    return foundRoomId;
  }

  async closeProducer(roomId: string, peerId: string, producerId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return; // 房间不存在直接返回

    const peer = room.peers.get(peerId);
    // 🚀 核心修复：如果找不到 peer，直接跳过逻辑
    if (!peer) {
      console.warn(`Peer ${peerId} not found in room ${roomId}`);
      return;
    }

    const producer = peer.producers.get(producerId);

    if (producer) {
      producer.close(); // Mediasoup 核心动作
      peer.producers.delete(producerId); // 此时 peer 已经被确认非空
      console.log(`Producer ${producerId} closed by peer ${peerId}`);
    }
  }

  async destroyRoom(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // 销毁房间时保存文档
    const dir = path.join(process.cwd(), 'documents');
    await fs.promises.mkdir(dir, { recursive: true });

    for (const doc of room.documents.values()) {
      const binary = DocumentService.encodeState(doc);
      const filename = `${roomId}-${doc.id}-${doc.type}-${Date.now()}.yjs`;
      await fs.promises.writeFile(
        path.join(dir, filename),
        Buffer.from(binary),
      );
    }

    this.rooms.delete(roomId);
  }
}