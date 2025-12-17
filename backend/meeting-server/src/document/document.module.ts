// src/document/document.module.ts
import { Module } from '@nestjs/common';
import { DocumentService } from './document.service';
import { DocumentGateway } from './document.gateway';

@Module({
  providers: [DocumentService, DocumentGateway],
  exports: [DocumentService], // 导出服务
})
export class DocumentModule {}