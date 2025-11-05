import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ListTodo,
  Image,
  AlertTriangle,
  Smartphone,
  AppWindow,
} from 'lucide-react';

/**
 * 导航菜单项
 */
const navItems = [
  {
    title: '仪表盘',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: '遍历任务',
    href: '/tasks',
    icon: ListTodo,
  },
  {
    title: '界面版本库',
    href: '/screens',
    icon: Image,
  },
  {
    title: '告警中心',
    href: '/alerts',
    icon: AlertTriangle,
  },
  {
    title: '设备管理',
    href: '/devices',
    icon: Smartphone,
  },
  {
    title: '应用管理',
    href: '/apps',
    icon: AppWindow,
  },
];

/**
 * 侧边栏组件
 * 使用 Glassmorphism 样式
 */
export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="glass flex w-64 flex-col border-r border-border">
      {/* Logo 区域 */}
      <div className="flex h-16 items-center justify-center border-b border-border">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg gradient-primary"></div>
          <span className="text-xl font-bold">Maestro</span>
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center space-x-3 rounded-lg px-4 py-3 text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* 底部信息 */}
      <div className="border-t border-border p-4">
        <div className="text-xs text-muted-foreground">
          <div>版本: v0.1.0</div>
          <div>Iteration 4</div>
        </div>
      </div>
    </aside>
  );
}

