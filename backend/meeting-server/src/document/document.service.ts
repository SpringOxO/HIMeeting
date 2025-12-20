
import * as Y from 'yjs';
import { DocumentState } from './document.model';

export class DocumentService {
  static create(): DocumentState {
    return {
      ydoc: new Y.Doc(),
    };
  }

  static applyUpdate(
    document: DocumentState,
    update: Uint8Array,
  ) {
    Y.applyUpdate(document.ydoc, update);
  }

  static encodeState(document: DocumentState): Uint8Array {
    return Y.encodeStateAsUpdate(document.ydoc);
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