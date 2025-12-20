<!-- src/components/Whiteboard.vue -->
<template>
  <div class="whiteboard-overlay" @mousedown="startDrawing" @mouseup="stopDrawing" @mousemove="draw" @mouseleave="stopDrawing">
    <canvas ref="canvas" class="whiteboard-canvas"></canvas>
    <div class="whiteboard-toolbar">
      <button @click="clearCanvas" title="清空画板">清空</button>
      <button @click="closeWhiteboard" title="关闭画板">×</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Whiteboard',
  emits: ['close'],
  data() {
    return {
      isDrawing: false,
      context: null,
      color: '#1ba1e6',
      lineWidth: 3,
    };
  },
  mounted() {
    const canvas = this.$refs.canvas;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    this.context = canvas.getContext('2d');
    this.context.lineJoin = 'round';
    this.context.lineCap = 'round';
    this.context.strokeStyle = this.color;
    this.context.lineWidth = this.lineWidth;
  },
  methods: {
    startDrawing(e) {
      this.isDrawing = true;
      const rect = this.$refs.canvas.getBoundingClientRect();
      this.context.beginPath();
      this.context.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    },
    draw(e) {
      if (!this.isDrawing) return;
      const rect = this.$refs.canvas.getBoundingClientRect();
      this.context.lineTo(e.clientX - rect.left, e.clientY - rect.top);
      this.context.stroke();
    },
    stopDrawing() {
      this.isDrawing = false;
    },
    clearCanvas() {
      const canvas = this.$refs.canvas;
      this.context.clearRect(0, 0, canvas.width, canvas.height);
    },
    closeWhiteboard() {
      this.$emit('close');
    },
  },
};
</script>

<style scoped>
.whiteboard-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: white;
  z-index: 2000;
  cursor: crosshair;
}

.whiteboard-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.whiteboard-toolbar {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  gap: 8px;
}

.whiteboard-toolbar button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid #ddd;
  background-color: white;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

.whiteboard-toolbar button:hover {
  background-color: #f0f0f0;
}
</style>