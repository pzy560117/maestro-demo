import { Bell, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * 顶部导航栏组件
 */
export function Navbar() {
  return (
    <header className="glass sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border px-6">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold">Maestro</h1>
        <span className="text-sm text-muted-foreground">LLM驱动的UI自动化定位系统</span>
      </div>

      <div className="flex items-center space-x-4">
        {/* 通知按钮 */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent"></span>
        </Button>

        {/* 用户菜单 */}
        <Button variant="ghost" size="icon">
          <User className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}

