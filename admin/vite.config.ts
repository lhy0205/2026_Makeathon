import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_');
  return {
    plugins: [react()],
    server: {
      port: 5173,
      // 개발 중에는 프록시로 붙어 CORS를 피한다.
      // 배포할 때는 VITE_API_BASE_URL로 실제 주소를 준다.
      proxy: {
        '/api': {
          target: env.VITE_API_TARGET || 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
  };
});
