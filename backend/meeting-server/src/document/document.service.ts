
import * as Y from 'yjs';
import { DocumentState } from './document.model';
import { DocumentType } from './document.model';

export class DocumentService {
  static create(id: number, type: DocumentType): DocumentState {
    const ydoc = new Y.Doc();

    // 不同类型初始化不同结构
    if (type === 'text') {
      ydoc.getText('content');
    }
    if (type === 'whiteboard') {
      ydoc.getArray('paths');
    }

    if (type === 'chat') {
      ydoc.getArray('messages');
    }

    return {
      id,
      type,
      ydoc,
      createdAt: Date.now(),
    };
  }

  static applyUpdate(
    document: DocumentState,
    update: Uint8Array,
  ) {
    Y.applyUpdate(document.ydoc, update);
  }

  // 持久化文档
  static encodeState(document: DocumentState): Uint8Array {
    return Y.encodeStateAsUpdate(document.ydoc);
  }

  // 加载文档
  // const binary = await fs.promises.readFile(file);
  // const doc = DocumentService.loadFromBinary(binary);
  // room.document = doc;
  loadFromBinary(binary: Uint8Array): Y.Doc {
    const doc = new Y.Doc();
    Y.applyUpdate(doc, binary);
    return doc;
  }

}

// 前端
// const ydoc = new Y.Doc();
// // joinRoom 返回
// Y.applyUpdate(ydoc, documentState);

// // 本地编辑产生 update
// ydoc.on('update', update => {
//   socket.emit('updateDocument', {
//     roomId,
//     update: Array.from(update),
//   });
// });

// // 接收别人更新
// socket.on('documentUpdate', update => {
//   Y.applyUpdate(ydoc, Uint8Array.from(update));
// });