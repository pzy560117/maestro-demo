import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Layers,
} from 'lucide-react';
import { ScreensApi } from '@/lib/api/screens';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

/**
 * 界面版本库页面
 * 展示所有收集到的界面快照，支持搜索和分页
 */
export function ScreenLibrary() {
  const [page, setPage] = useState(1);
  const [limit] = useState(24); // 网格布局，每页24个
  const [searchText, setSearchText] = useState('');

  // 获取界面列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['screens', page, limit, searchText],
    queryFn: () =>
      ScreensApi.getScreens({
        page,
        limit,
        ...(searchText && { search: searchText }),
      }),
    refetchInterval: 30000, // 每30秒刷新
  });

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">界面版本库</h2>
          <p className="text-muted-foreground">浏览和管理应用界面快照和差异</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Layers className="mr-2 h-4 w-4" />
            {data?.total || 0} 个界面
          </Badge>
        </div>
      </div>

      {/* 搜索栏 */}
      <Card className="bento-card p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          {/* 搜索框 */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索界面签名或路径..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* 刷新按钮 */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </Card>

      {/* 界面网格 */}
      <div>
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data?.items.length ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.items.map((screen) => (
              <Link key={screen.id} to={`/screens/${screen.signature}`}>
                <Card className="bento-card overflow-hidden hover:border-accent transition-all duration-200 group">
                  {/* 界面截图 */}
                  <div className="aspect-[9/16] bg-gradient-to-br from-accent/20 to-accent/5 relative overflow-hidden">
                    {screen.screenshotPath ? (
                      <img
                        src={`${import.meta.env.VITE_API_URL || '/api/v1'}/${screen.screenshotPath}`}
                        alt={screen.signature}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          // 图片加载失败时显示占位符
                          (e.target as HTMLImageElement).style.display = 'none';
                          const placeholder = (e.target as HTMLElement).nextElementSibling;
                          if (placeholder) {
                            (placeholder as HTMLElement).style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    {/* 占位符 */}
                    <div
                      className={`absolute inset-0 flex items-center justify-center ${
                        screen.screenshotPath ? 'hidden' : 'flex'
                      }`}
                    >
                      <ImageIcon className="h-16 w-16 text-muted-foreground/20" />
                    </div>

                    {/* 元素数量徽章 */}
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="backdrop-blur-sm bg-background/80">
                        {screen.elementCount || 0} 元素
                      </Badge>
                    </div>

                    {/* 版本数量徽章 */}
                    {screen.versionCount && screen.versionCount > 1 && (
                      <div className="absolute top-2 left-2">
                        <Badge className="backdrop-blur-sm bg-accent/80">
                          {screen.versionCount} 个版本
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* 界面信息 */}
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-mono truncate">
                      {screen.signature.slice(0, 16)}...
                    </CardTitle>
                    {screen.path && (
                      <CardDescription className="text-xs truncate">{screen.path}</CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {format(new Date(screen.firstSeenAt), 'MM-dd HH:mm', { locale: zhCN })}
                      </span>
                      {screen.lastSeenAt && (
                        <span>
                          更新于{' '}
                          {format(new Date(screen.lastSeenAt), 'MM-dd', { locale: zhCN })}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="bento-card">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <ImageIcon className="h-16 w-16 text-muted-foreground/20 mb-4" />
              <p className="text-lg text-muted-foreground">暂无界面数据</p>
              <p className="text-sm text-muted-foreground mt-2">
                执行遍历任务后将自动收集界面快照
              </p>
            </CardContent>
          </Card>
        )}

        {/* 分页 */}
        {data && data.total > 0 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-muted-foreground">
              共 {data.total} 个界面，第 {page} / {data.totalPages} 页
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
              >
                下一页
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
