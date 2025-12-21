
import * as Y from 'yjs';

export type DocumentType = 'text' | 'whiteboard';

export interface DocumentState {
  id: number;
  type: DocumentType;
  ydoc: Y.Doc;
  createdAt: number;
}