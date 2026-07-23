import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dialysis.kidneynotes',
  appName: '肾友笔记',
  webDir: 'dist',
  plugins: {
    // 启用 CapacitorHttp：APK 内全局 fetch 自动走原生 HTTP（OkHttp），
    // 绕过浏览器 CORS 限制，可直接请求 baike.baidu.com 等无 CORS 头的站点。
    // 等同手机原生浏览器访问，风控通过率远高于服务端/curl 抓取。
    // 浏览器开发环境仍受 CORS 限制（仅 APK 生效）。
    CapacitorHttp: {
      enabled: true
    }
  }
};

export default config;
