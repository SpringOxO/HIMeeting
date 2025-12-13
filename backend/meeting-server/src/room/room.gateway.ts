import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomService } from './room.service';

@WebSocketGateway({
  cors: {
    origin: '*', // 允许所有跨域 (开发时方便)
  },
})
export class RoomGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly roomService: RoomService) {}

  // 1. 用户加入房间
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    console.log(`Client ${client.id} joining room ${data.roomId}`);
    
    // 让 Socket 加入 socket.io 的房间，方便做广播
    client.join(data.roomId);
    
    // 调用 Service 逻辑
    const rtpCapabilities = await this.roomService.joinRoom(data.roomId, client.id);
    // console.log("Success.")
    // 返回给前端
    return { rtpCapabilities };
  }

  // 2. 创建 Transport (发流或收流管道)
  @SubscribeMessage('createWebRtcTransport')
  async handleCreateTransport(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const params = await this.roomService.createWebRtcTransport(data.roomId, client.id);
    return params;
  }

  // 3. 连接 Transport
  @SubscribeMessage('connectTransport')
  async handleConnectTransport(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; transportId: string; dtlsParameters: any },
  ) {
    await this.roomService.connectTransport(data.roomId, client.id, data.transportId, data.dtlsParameters);
    return { success: true };
  }

  // 4. 正式推流 (Produce)
  @SubscribeMessage('produce')
  async handleProduce(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { 
      roomId: string; 
      transportId: string; 
      kind: any; 
      rtpParameters: any; 
      appData: any; // <--- 🚀 新增：前端会传这个参数
    },
  ) {
    // 调用 Service，传入 appData
    const { id } = await this.roomService.produce(
      data.roomId,
      client.id,
      data.transportId,
      data.kind,
      data.rtpParameters,
      data.appData, // <--- 🚀 透传
    );

    // 【广播通知】
    // 告诉房间里其他人："有人发流了，ID是这个，类型是 appData.source"
    client.to(data.roomId).emit('newProducer', { 
      producerId: id,
      peerId: client.id,   // 顺便告诉是谁发的
      appData: data.appData // <--- 🚀 关键：让接收端知道这是屏幕共享还是摄像头
    });

    return { id };
  }

  // 5. 订阅流 (Consume)
  @SubscribeMessage('consume')
  async handleConsume(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; transportId: string; producerId: string; rtpCapabilities: any },
  ) {
    const params = await this.roomService.consume(
      data.roomId,
      client.id,
      data.transportId,
      data.producerId,
      data.rtpCapabilities,
    );
    return params;
  }

  @SubscribeMessage('resumeConsumer')
  async handleResumeConsumer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; consumerId: string },
  ) {
    await this.roomService.resumeConsumer(data.roomId, client.id, data.consumerId);
    return { success: true };
  }
}