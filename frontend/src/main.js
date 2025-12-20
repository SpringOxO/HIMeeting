// src/main.js
import { createApp } from 'vue'; // Vue 3 的正确引入方式
import App from './App.vue';
import router from './router'; // 引入路由配置

createApp(App).use(router).mount('#app'); // 挂载应用并使用路由
