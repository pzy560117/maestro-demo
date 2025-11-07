import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8360',
        changeOrigin: true,
      },
    },
  },
  // 构建优化配置
  build: {
    // 生产源码映射（可选）
    sourcemap: false,
    
    // 代码分割策略
    rollupOptions: {
      output: {
        // 手动分块 - 按模块类型分割
        manualChunks: {
          // React 核心库
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // UI 组件库
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-tabs',
            '@radix-ui/react-select',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-label',
            '@radix-ui/react-slot',
          ],
          
          // 数据管理
          'data-vendor': [
            '@tanstack/react-query',
            '@tanstack/react-table',
            'axios',
            'zustand',
          ],
          
          // 表单处理
          'form-vendor': [
            'react-hook-form',
            '@hookform/resolvers',
            'zod',
          ],
          
          // 工具库
          'utils-vendor': [
            'date-fns',
            'clsx',
            'tailwind-merge',
            'class-variance-authority',
          ],
          
          // 图标库
          'icons-vendor': ['lucide-react'],
        },
        
        // 静态资源命名
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    
    // 代码压缩
    minify: 'terser',
    terserOptions: {
      compress: {
        // 删除 console
        drop_console: true,
        drop_debugger: true,
      },
    },
    
    // chunk 大小警告阈值（KB）
    chunkSizeWarningLimit: 1000,
    
    // 目标浏览器
    target: 'es2015',
    
    // 资源内联阈值（字节）
    assetsInlineLimit: 4096,
  },
  
  // 优化依赖预构建
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'axios',
    ],
  },
});

