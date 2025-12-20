// src/document/document.gateway.ts
import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    OnGatewayConnection,
    OnGatewayDisconnect,
  } from '@nestjs/websockets';
  import { Server, Socket } from 'socket.io';
  import { DocumentService } from './document.service';
  import { SyncDocumentDto, JoinDocumentDto } from './dtos/sync-document.dto';
  
  @WebSocketGateway({
    namespace: '/document', // 使用独立命名空间，避免与房间消息冲突
    cors: {
      origin: '*',
    },
  })
  export class DocumentGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;
  
    constructor(private readonly documentService: DocumentService) {}
  
    /**
     * 客户端连接时
     */
    handleConnection(client: Socket) {
      console.log(`文档客户端连接: ${client.id}`);
    }
  
    /**
     * 客户端断开时
     */
    handleDisconnect(client: Socket) {
      console.log(`文档客户端断开: ${client.id}`);
      this.documentService.leaveDocumentRoom(client.id);
    }
  
    /**
     * 加入文档房间
     */
    @SubscribeMessage('join-document')
    async handleJoinDocument(
      @ConnectedSocket() client: Socket,
      @MessageBody() data: JoinDocumentDto,
    ) {
      console.log(`客户端 ${client.id} 请求加入文档房间: ${data.roomId}`);
      
      // 第一步：先检查是否在会议房间中
      const meetingRooms = Array.from(client.rooms);
      const isInMeetingRoom = meetingRooms.some(room => room === data.roomId);
      
      if (!isInMeetingRoom) {
        // 可选：也可以调用RoomService检查房间是否存在
        return { 
          success: false, 
          error: '请先加入对应的会议房间才能使用文档协同' 
        };
      }
      
      // 第二步：加入文档房间
      await client.join(`doc:${data.roomId}`); // 添加前缀区分
      
      // 第三步：调用服务加入文档房间（要求会议房间存在）
      const result = this.documentService.joinDocumentRoom(
        client.id,
        data.roomId,
        client as any,
        { requireMeetingRoom: true } // 强制要求会议房间存在
      );
      
      if (result.success) {
        // 发送初始文档状态
        client.emit('document-state', {
          roomId: data.roomId,
          update: Array.from(result.documentState),
        });
        
        // 通知房间内其他用户
        client.to(`doc:${data.roomId}`).emit('user-joined', {
          userId: client.id,
          roomId: data.roomId,
        });
        
        return { success: true, message: '加入文档协同成功' };
      }
      
      return { success: false, error: result.error };
    }
    
  
    /**
     * 同步文档更新
     */
    @SubscribeMessage('sync-document')
    async handleSyncDocument(
      @ConnectedSocket() client: Socket,
      @MessageBody() data: SyncDocumentDto,
    ) {
      // 验证客户端是否在对应的会议房间中
      const meetingRooms = Array.from(client.rooms);
      const isInMeetingRoom = meetingRooms.some(room => room === data.roomId);
      
      if (!isInMeetingRoom) {
        return { success: false, error: '请先加入对应的会议房间' };
      }
      
      // 验证客户端是否在文档房间中
      const docRoomName = `doc:${data.roomId}`;
      const room = this.server.sockets.adapter.rooms.get(docRoomName);
      if (!room || !room.has(client.id)) {
        return { success: false, error: '客户端不在该文档房间' };
      }
      
      // 将ArrayBuffer转换为Uint8Array
      const update = new Uint8Array(data.update);
      
      // 处理文档更新
      const result = this.documentService.handleDocumentUpdate(
        client.id,
        data.roomId,
        update,
      );
      
      if (result.success) {
        // 广播给房间内其他用户（通过Socket.IO）
        client.to(data.roomId).emit('document-update', {
          update: Array.from(update), // 转换为数组便于JSON传输
          from: client.id,
          timestamp: Date.now(),
        });
        
        return { success: true };
      }
      
      return { success: false, error: result.error };
    }
  
    /**
     * 获取文档统计信息（管理用）
     */
    @SubscribeMessage('get-stats')
    handleGetStats() {
      return this.documentService.getStats();
    }
  
    /**
     * 离开文档房间
     */
    @SubscribeMessage('leave-document')
    async handleLeaveDocument(
      @ConnectedSocket() client: Socket,
      @MessageBody() data: { roomId: string },
    ) {
      await client.leave(data.roomId);
      this.documentService.leaveDocumentRoom(client.id);
      
      // 通知房间内其他用户
      client.to(data.roomId).emit('user-left', {
        userId: client.id,
        roomId: data.roomId,
      });
      
      return { success: true };
    }
  }