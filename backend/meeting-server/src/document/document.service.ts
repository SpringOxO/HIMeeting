import ...

interface DocumentRoom {
  ydoc: Y.Doc;
  clients: Map<string, WebSocket>; // clientId -> WebSocket connection
  lastSaved: number;
}

@Injectable()
export class DocumentService implements OnModuleDestroy {
  private documentRooms: Map<string, DocumentRoom> = new Map();
  private clientRoomMap: Map<string, string> = new Map();

  constructor(
    @Inject(forwardRef(() => RoomService))
    private readonly roomService: RoomService, // 注入RoomService
  ) {}

  /**
   * 检查会议房间是否存在
   */
  private doesMeetingRoomExist(roomId: string): boolean {
    // 需要RoomService暴露检查方法
    // return this.roomService.roomExists(roomId);
    return true; // 临时实现
  }

  /**
   * 为房间创建文档协同
   */
  getDocumentRoom(roomId: string, checkMeetingRoom: boolean = true): DocumentRoom {
    // 检查会议房间是否存在
    if (checkMeetingRoom && !this.doesMeetingRoomExist(roomId)) {
      throw new Error(`会议房间 ${roomId} 不存在，无法创建文档协同`);
    }
    
    let room = this.documentRooms.get(roomId);
    
    if (!room) {
      const ydoc = new Y.Doc();
      
      // 设置初始数据结构
      const ytext = ydoc.getText('content');
      ytext.insert(0, '欢迎使用协作文档！\n');
      
      // 创建共享状态（用于光标、选择等）
      const awareness = new Y.UndoManager(ytext);
      
      room = {
        ydoc,
        clients: new Map(),
        lastSaved: Date.now(),
        awareness,
      };
      
      this.documentRooms.set(roomId, room);
      console.log(`为会议房间 ${roomId} 创建关联文档`);
    }
    
    return room;
  }

  /**
   * 客户端加入文档协同
   */
  joinDocumentRoom(
    clientId: string, 
    roomId: string, 
    ws: any,
    options?: {
      requireMeetingRoom: boolean; // 是否要求会议房间存在
    }
  ) {
    const requireMeetingRoom = options?.requireMeetingRoom ?? true;
    
    try {
      // 创建或获取文档房间
      const room = this.getDocumentRoom(roomId, requireMeetingRoom);
      
      // 保存客户端连接
      room.clients.set(clientId, ws);
      this.clientRoomMap.set(clientId, roomId);
      
      // 获取当前文档状态
      const documentState = Y.encodeStateAsUpdate(room.ydoc);
      
      console.log(`客户端 ${clientId} 加入文档房间（关联会议房间: ${roomId}）`);
      console.log(`房间 ${roomId} 当前客户端数: ${room.clients.size}`);
      
      return {
        success: true,
        documentState,
        roomExists: true,
      };
    } catch (error) {
      console.error(`加入文档房间失败:`, error);
      return {
        success: false,
        error: error.message,
        roomExists: false,
      };
    }
  }

  /**
   * 处理文档更新
   */
  handleDocumentUpdate(clientId: string, roomId: string, update: Uint8Array): {
    success: boolean;
    error?: string;
  } {
    try {
      const room = this.documentRooms.get(roomId);
      if (!room) {
        return { success: false, error: '文档房间不存在' };
      }

      // 应用更新到Yjs文档
      Y.applyUpdate(room.ydoc, update);
      
      // 广播给房间内其他所有客户端
      this.broadcastToRoom(roomId, clientId, update);
      
      // 更新最后保存时间
      room.lastSaved = Date.now();
      
      return { success: true };
    } catch (error) {
      console.error(`处理文档更新失败:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 广播更新到房间内的其他客户端
   */
  private broadcastToRoom(roomId: string, excludeClientId: string, update: Uint8Array): void {
    const room = this.documentRooms.get(roomId);
    if (!room) return;

    room.clients.forEach((ws, clientId) => {
      if (clientId !== excludeClientId && ws.readyState === WebSocket.OPEN) {
        const message = JSON.stringify({
          type: 'document-update',
          update: Array.from(update), // 转换为数组便于JSON传输
        });
        
        ws.send(message);
      }
    });
  }

  /**
   * 客户端离开
   */
  leaveDocumentRoom(clientId: string): void {
    const roomId = this.clientRoomMap.get(clientId);
    if (!roomId) return;

    const room = this.documentRooms.get(roomId);
    if (!room) return;

    // 从房间中移除客户端
    room.clients.delete(clientId);
    this.clientRoomMap.delete(clientId);

    console.log(`客户端 ${clientId} 离开文档房间: ${roomId}`);
    console.log(`房间 ${roomId} 剩余客户端数: ${room.clients.size}`);

    // 如果房间为空，可以考虑清理（或保留一段时间）
    if (room.clients.size === 0) {
      // 可选：设置清理定时器
      // setTimeout(() => this.cleanupEmptyRoom(roomId), 300000); // 5分钟后清理
    }
  }

  /**
   * 清理空房间
   */
  private cleanupEmptyRoom(roomId: string): void {
    const room = this.documentRooms.get(roomId);
    if (room && room.clients.size === 0) {
      // 清理Yjs文档
      room.ydoc.destroy();
      this.documentRooms.delete(roomId);
      console.log(`清理空文档房间: ${roomId}`);
    }
  }

  /**
   * 获取文档统计信息
   */
  getStats(): any {
    const stats = {
      totalRooms: this.documentRooms.size,
      totalClients: this.clientRoomMap.size,
      rooms: [] as Array<{
        roomId: string;
        clientCount: number;
        lastSaved: Date;
      }>,
    };

    this.documentRooms.forEach((room, roomId) => {
      stats.rooms.push({
        roomId,
        clientCount: room.clients.size,
        lastSaved: new Date(room.lastSaved),
      });
    });

    return stats;
  }

  /**
   * 模块销毁时清理资源
   */
  onModuleDestroy() {
    console.log('清理所有文档资源...');
    
    this.documentRooms.forEach((room) => {
      room.ydoc.destroy();
    });
    
    this.documentRooms.clear();
    this.clientRoomMap.clear();
  }
}