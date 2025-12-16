<!-- src/components/SharedDocument.vue -->
<template>
  <div class="doc-overlay">
    <div class="doc-header">
      <h3>共享文档</h3>
      <button @click="closeDoc" class="close-btn">×</button>
    </div>
    <div
      ref="editor"
      class="doc-editor"
      contenteditable="true"
      @input="onInput"
      :placeholder="'在此输入会议纪要...'"
    ></div>
  </div>
</template>

<script>
export default {
  name: 'SharedDocument',
  emits: ['close'],
  data() {
    return {
      content: '<p>会议纪要</p>'
    };
  },
  mounted() {
    this.$refs.editor.innerHTML = this.content;
  },
  methods: {
    onInput() {
      this.content = this.$refs.editor.innerHTML;
      // 未来可通过 WebSocket 广播 this.content
    },
    closeDoc() {
      this.$emit('close');
    }
  }
};
</script>

<style scoped>
.doc-overlay {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 400px;
  height: 500px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  z-index: 1500;
  border: 1px solid #e0e0e0;
}

.doc-header {
  padding: 12px 16px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.doc-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.close-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #ccc;
  border: none;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: #aaa;
}

.doc-editor {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  outline: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 15px;
  line-height: 1.6;
  color: #333;
}

.doc-editor:empty::before {
  content: attr(placeholder);
  color: #999;
}
</style>