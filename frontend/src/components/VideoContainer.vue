<!-- src/components/VideoContainer.vue -->
<template>
  <div class="video-wrapper local-video">
    <video
      ref="local视频"
      autoplay
      muted
      playsinline
      class="video"
      :class="{ 'video-active': !!localStream }"
    ></video>
    <!-- 可选：当没有视频流时显示占位图（例如“你”） -->
    <div v-if="!localStream" class="video-placeholder">
      <span class="placeholder-text">你</span>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    localStream: Object,
  },
  watch: {
    localStream(newStream) {
      if (newStream && this.$refs.local视频) {
        this.$refs.local视频.srcObject = newStream;
      }
    },
  },
};
</script>

<style scoped>
.video-wrapper {
  width: 240px; /* 调整为更标准的 4:3 比例（240x180） */
  height: 180px;
  background-color: #000000;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 2px solid transparent;
}

/* 本地视频激活时带绿色边框（腾讯会议风格） */
.local-video .video-wrapper {
  border-color: #2ec44e;
}

.video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.video.video-active {
  opacity: 1;
}

.video-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #2d2d2d;
  color: #ffffff;
  font-size: 16px;
  font-weight: 500;
  border-radius: 12px;
}
</style>