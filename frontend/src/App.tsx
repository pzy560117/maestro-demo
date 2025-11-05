import { Suspense, lazy } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layouts/MainLayout';

// 懒加载页面组件 - 按路由分割代码
const Dashboard = lazy(() => import('./modules/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const TaskList = lazy(() => import('./modules/tasks/TaskList').then(m => ({ default: m.TaskList })));
const TaskDetail = lazy(() => import('./modules/tasks/TaskDetail').then(m => ({ default: m.TaskDetail })));
const TaskCreate = lazy(() => import('./modules/tasks/TaskCreate').then(m => ({ default: m.TaskCreate })));
const ScreenLibrary = lazy(() => import('./modules/screens/ScreenLibrary').then(m => ({ default: m.ScreenLibrary })));
const ScreenDetail = lazy(() => import('./modules/screens/ScreenDetail').then(m => ({ default: m.ScreenDetail })));
const AlertCenter = lazy(() => import('./modules/alerts/AlertCenter').then(m => ({ default: m.AlertCenter })));
const DeviceList = lazy(() => import('./modules/devices/DeviceList').then(m => ({ default: m.DeviceList })));
const AppList = lazy(() => import('./modules/apps/AppList').then(m => ({ default: m.AppList })));

// 创建 QueryClient 实例
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000, // 5秒内数据视为新鲜
      retry: 1,
    },
  },
});

/**
 * 加载占位组件
 * 在懒加载组件时显示
 */
function LoadingFallback() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">加载中...</p>
      </div>
    </div>
  );
}

/**
 * 应用主组件
 * 配置路由和布局，实现代码分割和懒加载
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              
              {/* 任务管理 */}
              <Route path="tasks">
                <Route index element={<TaskList />} />
                <Route path="create" element={<TaskCreate />} />
                <Route path=":id" element={<TaskDetail />} />
              </Route>

              {/* 界面版本库 */}
              <Route path="screens">
                <Route index element={<ScreenLibrary />} />
                <Route path=":signature" element={<ScreenDetail />} />
              </Route>

              {/* 告警中心 */}
              <Route path="alerts" element={<AlertCenter />} />

              {/* 设备管理 */}
              <Route path="devices" element={<DeviceList />} />

              {/* 应用管理 */}
              <Route path="apps" element={<AppList />} />

              {/* 404 */}
              <Route path="*" element={<div>页面未找到</div>} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

