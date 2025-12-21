<template>
  <div
    class="whiteboard-overlay"
    @mousedown="startDrawing"
    @mouseup="stopDrawing"
    @mousemove="draw"
    @mouseleave="stopDrawing"
  >
    <canvas ref="canvas" class="whiteboard-canvas"></canvas>

    <div class="whiteboard-toolbar">
      <button @click="clearCanvas" title="清空画板">清空</button>
      <button @click="closeWhiteboard" title="关闭画板">×</button>
    </div>
  </div>
</template>

<script>
import * as Y from 'yjs';
import MeetingService from '@/services/webrtc';

export default {
  name: 'Whiteboard',
  emits: ['close'],

  data() {
    return {
      // ===== Canvas 本地状态 =====
      isDrawing: false,
      context: null,
      color: '#1ba1e6',
      lineWidth: 3,
      currentPath: [],

      // ===== Yjs =====
      ydoc: null,
      ypaths: null,
    };
  },

  mounted() {
    // --- 初始化 Canvas ---
    const canvas = this.$refs.canvas;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    this.context = canvas.getContext('2d');
    this.context.lineJoin = 'round';
    this.context.lineCap = 'round';

    // --- 接入 Yjs 文档 ---
    const docClient = MeetingService.documentClient;
    const ydoc = docClient?.docs.get(1); // 1 = 画板文档

    if (!ydoc) {
      console.error('[Whiteboard] ydoc not found (docId=1)');
      return;
    }

    this.ydoc = ydoc;
    this.ypaths = ydoc.getArray('paths');

    // 监听远端更新 → 重绘
    this.ypaths.observe(() => {
      this.redraw();
    });

    // 初次绘制
    this.redraw();
  },

  beforeUnmount() {
    if (this.ypaths) {
      this.ypaths.unobserve(this.redraw);
    }
  },

  methods: {
    // ===============================
    // 绘制逻辑
    // ===============================
    startDrawing(e) {
      this.isDrawing = true;
      this.currentPath = [];

      const rect = this.$refs.canvas.getBoundingClientRect();
      this.currentPath.push({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    },

    draw(e) {
      if (!this.isDrawing) return;

      const rect = this.$refs.canvas.getBoundingClientRect();
      const point = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      this.currentPath.push(point);
      this.redrawTemp();
    },

    stopDrawing() {
      if (!this.isDrawing) return;
      this.isDrawing = false;

      if (this.currentPath.length === 0) return;

      const path = {
        color: this.color,
        lineWidth: this.lineWidth,
        points: this.currentPath,
      };

      // 🚀 写入 Yjs（自动同步）
      this.ydoc.transact(() => {
        this.ypaths.push([path]);
      });

      this.currentPath = [];
    },

    // ===============================
    // 重绘
    // ===============================
    redraw() {
      const canvas = this.$refs.canvas;
      this.context.clearRect(0, 0, canvas.width, canvas.height);

      this.ypaths.forEach((path) => {
        this.drawPath(path);
      });
    },

    redrawTemp() {
      this.redraw();
      this.drawPath({
        color: this.color,
        lineWidth: this.lineWidth,
        points: this.currentPath,
      });
    },

    drawPath(path) {
      if (!path.points || path.points.length === 0) return;

      this.context.strokeStyle = path.color;
      this.context.lineWidth = path.lineWidth;
      this.context.beginPath();

      path.points.forEach((p, i) => {
        if (i === 0) this.context.moveTo(p.x, p.y);
        else this.context.lineTo(p.x, p.y);
      });

      this.context.stroke();
    },

    // ===============================
    // 工具
    // ===============================
    clearCanvas() {
      this.ydoc.transact(() => {
        this.ypaths.delete(0, this.ypaths.length);
      });
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
