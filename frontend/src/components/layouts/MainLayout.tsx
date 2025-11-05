import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

/**
 * 主布局组件
 * 包含导航栏、侧边栏和内容区
 */
export function MainLayout() {
  return (
    <div className="flex h-screen bg-background">
      {/* 侧边栏 */}
      <Sidebar />

      {/* 主内容区 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 顶部导航栏 */}
        <Navbar />

        {/* 内容区域 */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

