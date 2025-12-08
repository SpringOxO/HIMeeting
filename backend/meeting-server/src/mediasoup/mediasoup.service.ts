import { Injectable, OnModuleInit } from '@nestjs/common';
import * as mediasoup from 'mediasoup';
import { Worker } from 'mediasoup/types';
import { config } from '../common/config';

@Injectable()
export class MediasoupService implements OnModuleInit {
  private workers: Worker[] = [];
  private nextWorkerIndex = 0;

  // 1. 系统启动时，初始化 Worker
  async onModuleInit() {
    console.log('正在启动 Mediasoup Workers...');
    for (let i = 0; i < config.mediasoup.numWorkers; i++) {
      const worker = await mediasoup.createWorker({
        logLevel: config.mediasoup.worker.logLevel as any,
        rtcMinPort: config.mediasoup.worker.rtcMinPort,
        rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
      });

      worker.on('died', () => {
        console.error(`Worker ${worker.pid} died, exiting...`);
        process.exit(1);
      });

      this.workers.push(worker);
    }
    console.log(`成功启动 ${this.workers.length} 个 Mediasoup Workers`);
  }

  // 2. 轮询获取一个 Worker (负载均衡)
  getWorker(): Worker {
    const worker = this.workers[this.nextWorkerIndex];
    this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.workers.length;
    return worker;
  }
}