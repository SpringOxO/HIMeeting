<!-- src/components/VideoControl.vue -->
<template>
  <div class="control-bar">
    <button
      class="icon-button"
      :class="{ 'is-muted': !audioActive }"
      @click="$emit('toggle-mute')"
      title="麦克风"
    >
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path fill="currentColor" d="M12,14c1.66,0,3-1.34,3-3V5c0-1.66-1.34-3-3-3S9,3.34,9,5v6C9,12.66,10.34,14,12,14z M17,11c0,2.76-2.24,5-5,5s-5-2.24-5-5H5c0,3.53,2.61,6.43,6,6.92V21h2v-3.08c3.39-0.49,6-3.39,6-6.92H17z" />
      </svg>
    </button>

    <button
      class="icon-button"
      :class="{ 'is-muted': !cameraActive }"
      @click="$emit('toggle-camera')"
      title="摄像头"
    >
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path fill="currentColor" d="M17,10.5V7c0-0.55-0.45-1-1-1H4c-0.55,0-1,0.45-1,1v10c0,0.55,0.45,1,1,1h12c0.55,0,1-0.45,1-1v-3.5l4,4v-11L17,10.5z" />
      </svg>
    </button>

    <button
      class="icon-button"
      :class="{ active: screenSharing }"
      @click="$emit('toggle-screen-share')"
      title="共享屏幕"
    >
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path fill="currentColor" d="M20,6H4V4h16V6z M21,18c0,1.1-0.9,2-2,2H5c-1.1,0-2-0.9-2-2V8c0-1.1,0.9-2,2-2h14c1.1,0,2,0.9,2,2V18z M5,18h14V8H5V18z M12,10.5l4,3.5V12h2v4H6v-4h2v2l4-3.5z" />
      </svg>
    </button>

    <!-- 画板 -->
    <button
      class="icon-button"
      :class="{ active: whiteboardOpen }"
      @click="$emit('toggle-whiteboard')"
      title="共享画板"
    >
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path fill="currentColor" d="M19,3H5C3.9,3,3,3.9,3,5v14c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2V5C21,3.9,20.1,3,19,3z M19,19H5V5h14V19z M7,17h10v-2H7V17z M7,13h10V11H7V13z M7,9h7V7H7V9z" />
      </svg>
    </button>

    <!-- 聊天 -->
    <button
      class="icon-button"
      :class="{ active: chatOpen }"
      @click="$emit('toggle-chat')"
      title="聊天"
    >
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path fill="currentColor" d="M20,2H4C2.9,2,2,2.9,2,4v12c0,1.1,0.9,2,2,2h4v3c0,0.6,0.4,1,1,1s1-0.4,1-1v-3h8c1.1,0,2-0.9,2-2V4C20,2.9,19.1,2,18,2H20z M20,16H4V4h16V16z M7,14h10v-2H7V14z M7,10h10V8H7V10z" />
      </svg>
    </button>

    <!-- 共享文档 -->
    <button
      class="icon-button"
      :class="{ active: docOpen }"
      @click="$emit('toggle-doc')"
      title="共享文档"
    >
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path fill="currentColor" d="M14,2H6C4.9,2,4,2.9,4,4v16c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2V8l-6-6z M6,20V4h7v5h5v11H6z M13,9V4l5,5H13z" />
      </svg>
    </button>

    <button class="end-button" @click="$emit('end-meeting')" title="结束会议">
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41z" />
      </svg>
    </button>
  </div>
</template>

<script>
export default {
  name: 'VideoControl',
  props: {
    cameraActive: { type: Boolean, default: true },
    audioActive: { type: Boolean, default: true },
    screenSharing: { type: Boolean, default: false },
    whiteboardOpen: { type: Boolean, default: false },
    chatOpen: { type: Boolean, default: false },
    docOpen: { type: Boolean, default: false },
  },
  emits: [
    'toggle-mute',
    'toggle-camera',
    'toggle-screen-share',
    'toggle-whiteboard',
    'toggle-chat',
    'toggle-doc',
    'end-meeting'
  ],
};
</script>

<style scoped>
.control-bar {
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 16px;
  padding: 12px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 32px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  z-index: 1000;
}

.icon-button,
.end-button {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.icon-button:hover {
  background-color: #e0e0e0;
}

.icon-button.is-muted {
  background-color: #ff5f5f;
  color: white;
}

.icon-button.is-muted:hover {
  background-color: #ff4444;
}

.icon-button.active {
  background-color: #e6f4ff;
  color: #1ba1e6;
}

.icon-button.active:hover {
  background-color: #cce9ff;
}

.end-button {
  width: 52px;
  height: 52px;
  background-color: #ff5f5f;
  color: white;
}

.end-button:hover {
  background-color: #ff4444;
}

.icon-button svg,
.end-button svg {
  fill: currentColor;
}
</style>