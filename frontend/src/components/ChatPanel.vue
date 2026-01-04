<!-- src/components/ChatPanel.vue -->
<template>
  <div class="chat-overlay">
    <div class="chat-header">
      <h3>聊天</h3>
      <button @click="closeChat" class="close-btn">×</button>
    </div>
    <div class="chat-messages" ref="messages">
      <div v-for="(msg, index) in messages" :key="index" class="message">
        <span class="sender">{{ msg.sender }}:</span>
        <span class="text">{{ msg.text }}</span>
      </div>
    </div>
    <div class="chat-input">
      <input
        v-model="newMessage"
        @keyup.enter="sendMessage"
        placeholder="输入消息..."
        maxlength="200"
      />
      <button @click="sendMessage">发送</button>
    </div>
  </div>
</template>

<script>
import MeetingService from '@/services/webrtc';

export default {
  name: 'ChatPanel',
  emits: ['close'],
  props: {
    docId: {
      type: Number,
      required: true
    }
  },

  data() {
    return {
      newMessage: '',
      messages: [],
      yarray: null,
      _observer: null
    };
  },

  mounted() {
    const docClient = MeetingService.documentClient;
    const ydoc = docClient.docs.get(this.docId);

    if (!ydoc) {
      console.error(`[ChatPanel] ydoc not found (docId=${this.docId})`);
      return;
    }

    this.yarray = ydoc.getArray('messages');

    // 初始化系统消息
    if (this.yarray.length === 0) {
      this.yarray.push([{
        id: crypto.randomUUID(),
        sender: '系统',
        text: '欢迎加入会议！',
        timestamp: Date.now()
      }]);
    }

    const syncMessages = () => {
      this.messages = this.yarray.toArray();
      this.$nextTick(this.scrollToBottom);
    };

    this.yarray.observe(syncMessages);
    syncMessages();
    this._observer = syncMessages;
  },

  beforeUnmount() {
    if (this.yarray && this._observer) {
      this.yarray.unobserve(this._observer);
    }
  },

  methods: {
    sendMessage() {
      if (!this.newMessage.trim()) return;

      this.yarray.push([{
        id: crypto.randomUUID(),
        // sender: '我',
        sender: MeetingService.peerId,
        text: this.newMessage.trim(),
        peerId: MeetingService.peerId,
        timestamp: Date.now()
      }]);

      this.newMessage = '';
    },

    scrollToBottom() {
      const container = this.$refs.messages;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    },

    closeChat() {
      this.$emit('close');
    }
  }
};
</script>


<style scoped>
.chat-overlay {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 320px;
  height: 400px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  z-index: 1500;
  border: 1px solid #e0e0e0;
}

.chat-header {
  padding: 12px 16px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-header h3 {
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

.chat-messages {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  background-color: #fafafa;
}

.message {
  margin-bottom: 10px;
  font-size: 14px;
  line-height: 1.4;
}

.sender {
  font-weight: bold;
  color: #0066ff;
  margin-right: 4px;
}

.text {
  color: #333;
}

.chat-input {
  display: flex;
  padding: 8px;
  background: white;
  border-top: 1px solid #e0e0e0;
}

.chat-input input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.chat-input button {
  margin-left: 8px;
  padding: 8px 12px;
  background: #0066ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.chat-input button:hover {
  background: #0052cc;
}
</style>