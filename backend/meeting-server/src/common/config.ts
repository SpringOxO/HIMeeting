import { RtpCodecCapability, TransportListenIp } from 'mediasoup/types';
import * as os from 'os';

const getLocalIp = () => {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    if (!iface) continue;

    for (let i = 0; i < iface.length; i++) {
      const { family, address, internal } = iface[i];
      // 过滤：IPv4 且 不是回环地址 (127.0.0.1)
      if (family === 'IPv4' && !internal) {
        // 这里的 address 就是类似 192.168.x.x 或 10.x.x.x 的局域网 IP
        return address;
      }
    }
  }
  return '127.0.0.1'; // 兜底返回
};

const localIp = getLocalIp();
console.log('--- 自动检测到的局域网 IP:', localIp);

export const config = {
  // 1. Mediasoup Server 设置
  mediasoup: {
    // 获取 CPU 核心数，决定启动多少个 Worker
    numWorkers: Object.keys(os.cpus()).length,
    worker: {
      rtcMinPort: 10000, // UDP 最小端口
      rtcMaxPort: 10100, // UDP 最大端口 (开发环境开 100 个够用了)
      logLevel: 'warn',
      logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
    },
    router: {
      // 定义支持的媒体编解码格式
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
        {
          kind: 'video',
          mimeType: 'video/VP8', // 推荐 VP8，兼容性最好
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 1000,
          },
        },
      ] as RtpCodecCapability[],
    },
    // 2. WebRTC 传输设置 (最关键的部分)
    webRtcTransport: {
      listenIps: [
        {
          ip: '0.0.0.0', // 监听所有网卡
          // 【重要】如果你在本地开发，这里填 '127.0.0.1'
          // 【重要】如果你要手机连电脑测试，这里填电脑的局域网 IP (例如 '192.168.1.5')
          announcedIp: localIp, 
        },
      ] as TransportListenIp[],
      initialAvailableOutgoingBitrate: 1000000, // 初始带宽 1mbps
    },
  },
};