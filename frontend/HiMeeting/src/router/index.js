// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'; // 使用命名导入
import LoginView from '../views/LoginView.vue';
import MeetingView from '../views/MeetingView.vue';

const routes = [
  {
    path: '/',
    name: 'login',
    component: LoginView,
  },
  {
    path: '/meeting',
    name: 'meeting',
    component: MeetingView,
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL), // 使用 createWebHistory 进行路由管理
  routes,
});

export default router;
