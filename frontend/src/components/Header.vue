<!-- src/components/Header.vue -->
<template>
  <div class="header">
    <div class="header-left">
      <div class="logo">
        <span class="logo-text">HIMeeting</span>
      </div>
    </div>
    <div class="header-right">
      <button
        class="icon-btn"
        :class="{ active: cameraOn !== undefined ? cameraOn : true }"
        @click="toggleCamera"
        title="摄像头"
      >
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M17,10.5V7c0-0.55-0.45-1-1-1H4c-0.55,0-1,0.45-1,1v10c0,0.55,0.45,1,1,1h12c0.55,0,1-0.45,1-1v-3.5l4,4v-11L17,10.5z" />
        </svg>
      </button>

      <button
        class="icon-btn"
        :class="{ active: muted !== undefined ? !muted : false }"
        @click="toggleMute"
        title="麦克风"
      >
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M12,14c1.66,0,3-1.34,3-3V5c0-1.66-1.34-3-3-3S9,3.34,9,5v6C9,12.66,10.34,14,12,14z M17,11c0,2.76-2.24,5-5,5s-5-2.24-5-5H5c0,3.53,2.61,6.43,6,6.92V21h2v-3.08c3.39-0.49,6-3.39,6-6.92H17z" />
        </svg>
      </button>

      <button
        class="icon-btn"
        :class="{ active: screenSharing }"
        @click="toggleScreenShare"
        title="共享屏幕"
      >
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M20,6H4V4h16V6z M21,18c0,1.1-0.9,2-2,2H5c-1.1,0-2-0.9-2-2V8c0-1.1,0.9-2,2-2h14c1.1,0,2,0.9,2,2V18z M5,18h14V8H5V18z M12,10.5l4,3.5V12h2v4H6v-4h2v2l4-3.5z" />
        </svg>
      </button>

      <!-- 新增：画板 -->
      <button
        class="icon-btn"
        :class="{ active: whiteboardOpen }"
        @click="toggleWhiteboard"
        title="共享画板"
      >
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M19,3H5C3.9,3,3,3.9,3,5v14c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2V5C21,3.9,20.1,3,19,3z M19,19H5V5h14V19z M7,17h10v-2H7V17z M7,13h10V11H7V13z M7,9h7V7H7V9z" />
        </svg>
      </button>

      <!-- 新增：聊天 -->
      <button
        class="icon-btn"
        :class="{ active: chatOpen }"
        @click="toggleChat"
        title="聊天"
      >
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M20,2H4C2.9,2,2,2.9,2,4v12c0,1.1,0.9,2,2,2h4v3c0,0.6,0.4,1,1,1s1-0.4,1-1v-3h8c1.1,0,2-0.9,2-2V4C20,2.9,19.1,2,18,2H20z M20,16H4V4h16V16z M7,14h10v-2H7V14z M7,10h10V8H7V10z" />
        </svg>
      </button>

      <!-- 新增：共享文档 -->
      <button
        class="icon-btn"
        :class="{ active: docOpen }"
        @click="toggleDoc"
        title="共享文档"
      >
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M14,2H6C4.9,2,4,2.9,4,4v16c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2V8l-6-6z M6,20V4h7v5h5v11H6z M13,9V4l5,5H13z" />
        </svg>
      </button>

      <button class="end-meeting-btn" @click="endMeeting" title="结束会议">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41z" />
        </svg>
        <span>结束</span>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    toggleCamera: Function,
    toggleMute: Function,
    toggleScreenShare: Function,
    toggleWhiteboard: Function,
    toggleChat: Function,
    toggleDoc: Function,
    endMeeting: Function,
    cameraOn: { type: Boolean, default: undefined },
    muted: { type: Boolean, default: undefined },
    screenSharing: { type: Boolean, default: false },
    whiteboardOpen: { type: Boolean, default: false },
    chatOpen: { type: Boolean, default: false },
    docOpen: { type: Boolean, default: false },
  },
};
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 56px;
  padding: 0 20px;
  background-color: #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  border-bottom: 1px solid #ebebeb;
  box-sizing: border-box;
}

.logo {
  display: flex;
  align-items: center;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  color: #000000;
  letter-spacing: -0.3px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.icon-btn,
.end-meeting-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background-color: #f5f5f5;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.icon-btn:hover {
  background-color: #e0e0e0;
}

.icon-btn.active {
  background-color: #e6f4ff;
  color: #1ba1e6;
}

.icon-btn.active:hover {
  background-color: #cce9ff;
}

.end-meeting-btn {
  width: auto;
  padding: 0 16px;
  background-color: #ff5f5f;
  color: white;
  border-radius: 20px;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
}

.end-meeting-btn:hover {
  background-color: #ff4444;
}

.icon-btn svg,
.end-meeting-btn svg {
  fill: currentColor;
}
</style>