<!-- src/views/MeetingView.vue -->
<template>
  <div class="meeting-wrapper">
    <!-- 顶部 Header -->
    <Header
      :toggleCamera="toggleCamera"
      :toggleMute="toggleMute"
      :toggleScreenShare="toggleScreenShare"
      :toggleWhiteboard="toggleWhiteboard"
      :toggleChat="toggleChat"
      :toggleDoc="toggleDoc"
      :endMeeting="endMeeting"
      :cameraOn="cameraActive"
      :muted="!audioActive"
      :screenSharing="screenSharing"
      :whiteboardOpen="whiteboardOpen"
      :chatOpen="chatOpen"
      :docOpen="docOpen"
    />

    <!-- 主视频区域 -->
    <div class="main-video-area">
      <div v-if="Object.keys(remoteUsers).length === 0" class="empty-placeholder">
        <p>等待其他与会者加入...</p>
      </div>

      <div
        v-for="(user, peerId) in remoteUsers"
        :key="peerId"
        class="remote-video-wrapper"
      >
        <video
          v-show="user.hasVideo"
          :id="`video-${peerId}`"
          autoplay
          playsinline
          class="remote-video"
        ></video>

        <div v-if="!user.hasVideo" class="audio-only-placeholder">
          <div class="avatar">{{ user.userName.charAt(0) }}</div>
        </div>

        <div class="user-info-tag">
          <span class="user-name">{{ user.userName }}</span>
        </div>
      </div>
    </div>

    <!-- 本地视频（画中画） -->
    <div class="local-pip">
      <VideoContainer :localStream="localStream" />
    </div>

    <!-- 底部控制栏 -->
    <VideoControl
      :cameraActive="cameraActive"
      :audioActive="audioActive"
      :screenSharing="screenSharing"
      :whiteboardOpen="whiteboardOpen"
      :chatOpen="chatOpen"
      :docOpen="docOpen"
      @toggleCamera="toggleCamera"
      @toggleMute="toggleMute"
      @toggleScreenShare="toggleScreenShare"
      @toggleWhiteboard="toggleWhiteboard"
      @toggleChat="toggleChat"
      @toggleDoc="toggleDoc"
      @endMeeting="endMeeting"
    />

    <!-- 功能面板 -->
    <Whiteboard v-if="whiteboardOpen" :docId="currentDocId" @close="whiteboardOpen = false" />
    <ChatPanel v-if="chatOpen" @close="chatOpen = false" />
    <SharedDocument v-if="docOpen" :docId="currentDocId" @close="docOpen = false" />
  </div>
</template>

<script>
import Header from '@/components/Header.vue';
import VideoContainer from '@/components/VideoContainer.vue';
import VideoControl from '@/components/VideoControl.vue';
import Whiteboard from '@/components/Whiteboard.vue';
import ChatPanel from '@/components/ChatPanel.vue';
import SharedDocument from '@/components/SharedDocument.vue';
import meetingService from '@/services/webrtc';

export default {
  components: {
    Header,
    VideoContainer,
    VideoControl,
    Whiteboard,
    ChatPanel,
    SharedDocument,
  },
  data() {
    return {
      localStream: null,
      remoteUsers: {}, // 存储结构为 { peerId: { videoStream: MediaStream, username: string } }
      cameraActive: true,
      audioActive: true,
      screenSharing: false,
      screenStream: null,
      whiteboardOpen: false,
      chatOpen: false,
      docOpen: false,
      meetingId: this.$route.query.meetingId,
      username: this.$route.query.username,
      videoProducers: new Map(), // 存储自己的 producers
      screenProducer: null,
      currentDocId: 0, // 0 = 文本，1 = 画板
    };
  },
  async mounted() {
    await this.initMeeting();
  },
  methods: {
    async initMeeting() {
      await this.startCamera();
      
      const serverUrl = `http://${window.location.hostname}:3000`;

      console.log('Connecting to server:', serverUrl); // 方便调试

      await meetingService.connect(serverUrl, this.meetingId, async (producerId, peerId, appData) => {
        await this.handleNewRemoteStream(producerId, peerId, appData);
      },
      (peerId) => {
        this.handlePeerLeft(peerId); // 🚀 处理离开
      },
      // 🚀 3. 新增：流关闭回调 (需要在 webrtc.js connect 方法中支持传入第三个回调)
      (producerId, peerId) => {
        const userObj = this.remoteUsers[peerId];
        if (userObj) {
          // 如果关掉的是视频流，我们要检查是否需要切回摄像头
          // 简单做法：只要有流关闭，就尝试重置该用户的显示状态
          userObj.isSharingScreen = false; 
          userObj.screenStream = new MediaStream(); // 清空屏幕流容器
          this.updateVideoSource(peerId); // 🚀 触发切回 cameraStream
        }
      });

      // 发布本地流时，建议带上名字，方便对方显示
      if (this.localStream) {
        const videoTrack = this.localStream.getVideoTracks()[0];
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (videoTrack) await meetingService.produce(videoTrack, { label: 'camera', userName: this.username });
        if (audioTrack) await meetingService.produce(audioTrack, { label: 'microphone', userName: this.username });
      }
    },

    async handleNewRemoteStream(producerId, peerId, appData) {
      // 1. 消费流
      const { stream, consumer } = await meetingService.consume(producerId);
      const kind = consumer.kind;

      // 2. 归类：确保同一个 peerId 只占用一个 remoteUsers 槽位
      if (!this.remoteUsers[peerId]) {
        this.remoteUsers[peerId] = {
          peerId: peerId,
          userName: appData?.userName || '远程用户',
          cameraStream: new MediaStream(),
          screenStream: new MediaStream(),
          hasVideo: false,
          isSharingScreen: false
        };
      }

      const userObj = this.remoteUsers[peerId];
      const track = consumer.track;
      const label = appData?.label || '';

      // 分流存储轨道
      if (consumer.kind === 'video') {
        userObj.hasVideo = true;
        if (label === 'screen') {
          // 清空旧的屏幕轨道(如果有)，加入新的
          userObj.screenStream.getVideoTracks().forEach(t => userObj.screenStream.removeTrack(t));
          userObj.screenStream.addTrack(track);
          userObj.isSharingScreen = true;
        } else {
          userObj.cameraStream.getVideoTracks().forEach(t => userObj.cameraStream.removeTrack(t));
          userObj.cameraStream.addTrack(track);
        }
      } else {
        // 音频轨道同时加入两个容器，保证切换流时声音不断
        userObj.cameraStream.addTrack(track);
        userObj.screenStream.addTrack(track);
      }


      this.updateVideoSource(peerId);
  
      // 4. 处理 unmute 刷新（参考你之前的逻辑）
      consumer.track.onunmute = () => {
        this.updateVideoSource(peerId);
      };
    },

    updateVideoSource(peerId) {
      this.$nextTick(() => {
        const userObj = this.remoteUsers[peerId];
        const videoEl = document.getElementById(`video-${peerId}`);
        if (!userObj || !videoEl) return;

        if (userObj.isSharingScreen && userObj.screenStream) {
          // 切换为屏幕共享流
          videoEl.srcObject = userObj.screenStream;
          console.log(`Peer ${peerId} switched to SCREEN stream`);
        } else {
          // 切换回摄像头流
          videoEl.srcObject = userObj.cameraStream;
          console.log(`Peer ${peerId} switched to CAMERA stream`);
        }
        
        videoEl.play().catch(() => {});
      });
    },

    async toggleScreenShare() {
      if (this.screenSharing) {
        await this.stopScreenShare();
      } else {
        try {
          const stream = await navigator.mediaDevices.getDisplayMedia({ 
              video: { width: 1920, height: 1080 } 
          });
          this.screenStream = stream;
          this.screenSharing = true;

          const track = stream.getVideoTracks()[0];
          
          // 🚀 关键：保存返回的 producer 实例
          this.screenProducer = await meetingService.produce(track, 'screen');

          // 监听浏览器自带的“停止共享”蓝色按钮
          track.onended = () => {
            this.stopScreenShare();
          };
        } catch (err) {
          console.error('Screen share error:', err);
        }
      }
    },

    // 🚀 新增 stopScreenShare 方法
    async stopScreenShare() {
      if (!this.screenSharing) return;

      // 1. 通知后端关闭屏幕 Producer
      if (this.screenProducer) {
        await meetingService.closeProducer(this.screenProducer.id);
        this.screenProducer = null;
      }

      // 2. 停止本地轨道采集
      if (this.screenStream) {
        this.screenStream.getTracks().forEach(track => track.stop());
        this.screenStream = null;
      }

      this.screenSharing = false;
      console.log('Local screen share stopped');
    },

    handlePeerLeft(peerId) {
      console.log(`Cleaning up peer: ${peerId}`);
      
      // 1. 从响应式对象中删除
      // 如果是 Vue 3，直接 delete 即可触发响应式更新
      if (this.remoteUsers[peerId]) {
        // 停止该用户流下的所有轨道，释放硬件资源
        this.remoteUsers[peerId].stream.getTracks().forEach(track => track.stop());
        
        // 删除对象属性，Vue 的 v-for 会自动移除对应的 DOM 元素
        delete this.remoteUsers[peerId];
      }
      
      console.log('Remaining remote users:', Object.keys(this.remoteUsers).length);
    },
    
    async startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true,
        });
        this.localStream = stream;
      } catch (err) {
        console.error('Error accessing camera/mic:', err);
        alert('无法访问摄像头或麦克风，请检查权限');
      }
    },

    // async toggleScreenShare() {
    //   if (this.screenSharing) {
    //     const streamToStop = this.screenStream;
    //     if (streamToStop) {
    //       streamToStop.getTracks().forEach(track => track.stop());
    //     }
    //     this.remoteStreams = this.remoteStreams.filter(stream => stream !== streamToStop);
    //     this.screenStream = null;
    //     this.screenSharing = false;
    //   } else {
    //     if (this.screenStream) return;
    //     try {
    //       const stream = await navigator.mediaDevices.getDisplayMedia({
    //         video: { width: 1920, height: 1080 },
    //         audio: false,
    //       });
    //       this.screenStream = stream;
    //       this.screenSharing = true;
    //       this.remoteStreams.push(stream);
    //       this.$nextTick(() => {
    //         const index = this.remoteStreams.length - 1;
    //         const videoEl = this.$refs[`remoteVideo${index}`];
    //         if (videoEl) {
    //           (Array.isArray(videoEl) ? videoEl[0] : videoEl).srcObject = stream;
    //         }
    //       });
    //       const track = stream.getVideoTracks()[0];
    //       if (track) {
    //         track.addEventListener('ended', () => {
    //           this.remoteStreams = this.remoteStreams.filter(s => s !== stream);
    //           this.screenStream = null;
    //           this.screenSharing = false;
    //         });
    //       }
    //     } catch (err) {
    //       console.warn('Screen sharing cancelled:', err);
    //       alert('屏幕共享已取消');
    //     }
    //   }
    // },

    toggleWhiteboard() {
      
      console.log('Updating remote user streams:', this.remoteUsers);
      this.whiteboardOpen = !this.whiteboardOpen;
      this.chatOpen = false;
      this.docOpen = false;
      this.currentDocId = 1; // 画板
    },
    toggleChat() {
      this.chatOpen = !this.chatOpen;
      this.whiteboardOpen = false;
      this.docOpen = false;
    },
    toggleDoc() {
      this.docOpen = !this.docOpen;
      this.whiteboardOpen = false;
      this.chatOpen = false;
      this.currentDocId = 0; // 文本
    },

    toggleCamera() {
      if (this.localStream) {
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = !videoTrack.enabled;
          this.cameraActive = videoTrack.enabled;
        }
      }
    },
    toggleMute() {
      if (this.localStream) {
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = !audioTrack.enabled;
          this.audioActive = audioTrack.enabled;
        }
      }
    },
    endMeeting() {
      // if (this.localStream) {
      //   this.localStream.getTracks().forEach(track => track.stop());
      // }
      // const streamToStop = this.screenStream;
      // if (streamToStop) {
      //   streamToStop.getTracks().forEach(track => track.stop());
      //   this.remoteStreams = this.remoteStreams.filter(s => s !== streamToStop);
      // }
      // this.remoteStreams.forEach(stream => {
      //   if (stream !== streamToStop) {
      //     stream.getTracks()?.forEach(track => track.stop());
      //   }
      // });
      if (meetingService.socket) meetingService.socket.disconnect();
      this.localStream = null;
      this.screenStream = null;
      this.screenSharing = false;
      this.remoteStreams = [];
      this.whiteboardOpen = false;
      this.chatOpen = false;
      this.docOpen = false;
      this.$router.push({ name: 'login' });
    },
  },
  beforeUnmount() {
    this.endMeeting();
  },
};
</script>

<style scoped>
.meeting-wrapper {
  position: relative;
  width: 100vw;
  height: 100vh;
  background-color: #f6f6f6;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.main-video-area {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  gap: 16px;
  flex-wrap: wrap;
}

.remote-video-wrapper {
  width: min(100%, 640px);
  aspect-ratio: 16 / 9;
  background-color: #000;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  position: relative;
}

.remote-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.empty-placeholder {
  color: #666;
  font-size: 18px;
  text-align: center;
}

.local-pip {
  position: absolute;
  bottom: 120px;
  right: 24px;
  z-index: 900;
  width: 200px;
}
</style>