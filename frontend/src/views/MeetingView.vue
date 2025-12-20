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
      <div v-if="remoteStreams.length === 0" class="empty-placeholder">
        <p>等待其他与会者加入...</p>
      </div>

      <div
        v-for="(stream, index) in remoteStreams"
        :key="index"
        class="remote-video-wrapper"
      >
        <video
          :ref="`remoteVideo${index}`"
          autoplay
          playsinline
          muted
          class="remote-video"
        ></video>
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
    <Whiteboard v-if="whiteboardOpen" @close="whiteboardOpen = false" />
    <ChatPanel v-if="chatOpen" @close="chatOpen = false" />
    <SharedDocument v-if="docOpen" @close="docOpen = false" />
  </div>
</template>

<script>
import Header from '@/components/Header.vue';
import VideoContainer from '@/components/VideoContainer.vue';
import VideoControl from '@/components/VideoControl.vue';
import Whiteboard from '@/components/Whiteboard.vue';
import ChatPanel from '@/components/ChatPanel.vue';
import SharedDocument from '@/components/SharedDocument.vue';

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
      remoteStreams: [],
      cameraActive: true,
      audioActive: true,
      screenSharing: false,
      screenStream: null,
      whiteboardOpen: false,
      chatOpen: false,
      docOpen: false,
    };
  },
  async mounted() {
    await this.startCamera();
  },
  methods: {
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

    async toggleScreenShare() {
      if (this.screenSharing) {
        const streamToStop = this.screenStream;
        if (streamToStop) {
          streamToStop.getTracks().forEach(track => track.stop());
        }
        this.remoteStreams = this.remoteStreams.filter(stream => stream !== streamToStop);
        this.screenStream = null;
        this.screenSharing = false;
      } else {
        if (this.screenStream) return;
        try {
          const stream = await navigator.mediaDevices.getDisplayMedia({
            video: { width: 1920, height: 1080 },
            audio: false,
          });
          this.screenStream = stream;
          this.screenSharing = true;
          this.remoteStreams.push(stream);
          this.$nextTick(() => {
            const index = this.remoteStreams.length - 1;
            const videoEl = this.$refs[`remoteVideo${index}`];
            if (videoEl) {
              (Array.isArray(videoEl) ? videoEl[0] : videoEl).srcObject = stream;
            }
          });
          const track = stream.getVideoTracks()[0];
          if (track) {
            track.addEventListener('ended', () => {
              this.remoteStreams = this.remoteStreams.filter(s => s !== stream);
              this.screenStream = null;
              this.screenSharing = false;
            });
          }
        } catch (err) {
          console.warn('Screen sharing cancelled:', err);
          alert('屏幕共享已取消');
        }
      }
    },

    toggleWhiteboard() {
      this.whiteboardOpen = !this.whiteboardOpen;
      this.chatOpen = false;
      this.docOpen = false;
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
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
      }
      const streamToStop = this.screenStream;
      if (streamToStop) {
        streamToStop.getTracks().forEach(track => track.stop());
        this.remoteStreams = this.remoteStreams.filter(s => s !== streamToStop);
      }
      this.remoteStreams.forEach(stream => {
        if (stream !== streamToStop) {
          stream.getTracks()?.forEach(track => track.stop());
        }
      });
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