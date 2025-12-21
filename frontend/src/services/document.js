import * as Y from 'yjs';

class DocumentClient {
  constructor(socket) {
    this.socket = socket;
    this.docs = new Map(); // docId -> Y.Doc
  }

  /** 初始化一个文档（joinRoom 时调用） */
  initDocument(docId, binaryState) {
    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, new Uint8Array(binaryState));
    this.docs.set(docId, ydoc);

    // 监听本地变化 → 发给后端
    ydoc.on('update', (update, origin) => {
        
      console.log('[doc update]', docId, origin, update.length);
      
      if (origin === 'remote') return;
      
      this.socket.emit('updateDocument', {
        roomId: this.roomId,
        docId,
        update: Array.from(update),
      });
    });

    return ydoc;
  }

  /** 接收远端 update */
  applyRemoteUpdate(docId, update) {
    const doc = this.docs.get(docId);
    if (!doc) return;

    Y.applyUpdate(doc, Uint8Array.from(update), 'remote');
  }

  setRoom(roomId) {
    this.roomId = roomId;
  }
}

export default DocumentClient;
