<!-- src/views/LoginView.vue -->
<template>
  <div class="login-container">
    <div class="logo">
      <h1 class="logo-text">腾讯会议</h1>
    </div>
    <div class="login-box">
      <input
        v-model="meetingId"
        type="text"
        inputmode="numeric"
        placeholder="请输入会议号"
        maxlength="12"
        @keyup.enter="focusUsername"
        @input="formatMeetingId"
      />
      <input
        v-model="username"
        ref="usernameInput"
        type="text"
        placeholder="请输入您的姓名"
        maxlength="20"
        @keyup.enter="enterMeeting"
      />
      <button @click="enterMeeting">进入会议</button>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      meetingId: '',
      username: '',
    };
  },
  methods: {
    // 自动移除非数字字符并限制长度
    formatMeetingId() {
      this.meetingId = this.meetingId.replace(/\D/g, '').slice(0, 12);
    },

    // 回车后聚焦到姓名输入框
    focusUsername() {
      if (this.meetingId) {
        this.$nextTick(() => {
          this.$refs.usernameInput?.focus();
        });
      }
    },

    enterMeeting() {
      if (!this.meetingId.trim()) {
        alert('请输入会议号');
        return;
      }
      if (!this.username.trim()) {
        alert('请输入您的姓名');
        return;
      }

      // 可选：验证会议号是否为纯数字（已通过 formatMeetingId 保证）
      if (!/^\d+$/.test(this.meetingId)) {
        alert('会议号只能包含数字');
        return;
      }

      // 传递会议号和用户名到会议页（通过路由 query 或 vuex，这里用 query）
      this.$router.push({
        name: 'meeting',
        query: {
          meetingId: this.meetingId,
          username: this.username.trim(),
        },
      });
    },
  },
};
</script>

<style scoped>
.login-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
  background-color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
    'Microsoft YaHei', sans-serif;
}

.logo {
  margin-bottom: 40px;
  text-align: center;
}

.logo-text {
  font-size: 32px;
  font-weight: 600;
  color: #000000;
  letter-spacing: -0.5px;
}

.login-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  max-width: 320px;
}

input {
  width: 100%;
  padding: 14px 16px;
  font-size: 16px;
  border: 1px solid #d0d0d0;
  border-radius: 8px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  background-color: #ffffff;
  box-sizing: border-box;
}

input:focus {
  border-color: #0066ff;
  box-shadow: 0 0 0 2px rgba(0, 102, 255, 0.2);
}

button {
  width: 100%;
  padding: 14px;
  font-size: 16px;
  font-weight: 500;
  color: white;
  background-color: #0066ff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
  box-shadow: 0 2px 6px rgba(0, 102, 255, 0.2);
}

button:hover {
  background-color: #0052cc;
}

button:active {
  transform: translateY(1px);
}
</style>