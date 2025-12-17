
export class SyncDocumentDto {
    roomId: string;
    update: ArrayBuffer; // Yjs的二进制更新数据
}

export class JoinDocumentDto {
    roomId: string;
}