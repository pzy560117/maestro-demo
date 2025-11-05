import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { TasksApi } from '@/lib/api/tasks';
import { TaskStatus } from '@/types/task';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useWebSocket } from '@/lib/hooks/useWebSocket';

/**
 * 任务列表页面
 * 支持筛选、排序、分页
 * 支持 WebSocket 实时更新
 */
export function TaskList() {
  const queryClient = useQueryClient();

  // 筛选和分页状态
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');
  const [searchText, setSearchText] = useState('');

  // WebSocket 连接
  const { on } = useWebSocket({
    autoConnect: true,
  });

  // 监听任务更新事件
  useEffect(() => {
    const unsubscribe = on('task:update', (data) => {
      console.log('TaskList: Task update received', data);
      // 刷新当前页面的任务列表
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    });
    return unsubscribe;
  }, [on, queryClient]);

  // 获取任务列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tasks', page, limit, statusFilter, searchText],
    queryFn: () =>
      TasksApi.getTasks({
        page,
        limit,
        ...(statusFilter !== 'ALL' && { status: statusFilter }),
        ...(searchText && { search: searchText }),
      }),
    refetchInterval: 30000, // WebSocket 为主，降低轮询频率到30秒
  });

  // 状态徽章变体映射
  const getStatusVariant = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.RUNNING:
        return 'default';
      case TaskStatus.SUCCEEDED:
        return 'success';
      case TaskStatus.FAILED:
        return 'destructive';
      case TaskStatus.CANCELLED:
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // 状态文本映射
  const getStatusText = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.QUEUED:
        return '队列中';
      case TaskStatus.RUNNING:
        return '运行中';
      case TaskStatus.SUCCEEDED:
        return '成功';
      case TaskStatus.FAILED:
        return '失败';
      case TaskStatus.CANCELLED:
        return '已取消';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">遍历任务</h2>
          <p className="text-muted-foreground">管理和监控UI自动化遍历任务</p>
        </div>
        <Link to="/tasks/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            创建任务
          </Button>
        </Link>
      </div>

      {/* 筛选栏 */}
      <Card className="bento-card p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          {/* 搜索框 */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索任务名称..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* 状态筛选 */}
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as TaskStatus | 'ALL')}
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="筛选状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">全部状态</SelectItem>
              <SelectItem value={TaskStatus.QUEUED}>队列中</SelectItem>
              <SelectItem value={TaskStatus.RUNNING}>运行中</SelectItem>
              <SelectItem value={TaskStatus.SUCCEEDED}>成功</SelectItem>
              <SelectItem value={TaskStatus.FAILED}>失败</SelectItem>
              <SelectItem value={TaskStatus.CANCELLED}>已取消</SelectItem>
            </SelectContent>
          </Select>

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

      {/* 任务表格 */}
      <Card className="bento-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>任务名称</TableHead>
              <TableHead>应用版本</TableHead>
              <TableHead>设备数量</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : data?.items.length ? (
              data.items.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">
                    <Link
                      to={`/tasks/${task.id}`}
                      className="hover:text-accent transition-colors"
                    >
                      {task.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {task.appVersion?.app?.name} {task.appVersion?.version}
                  </TableCell>
                  <TableCell>{task.deviceIds.length}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(task.status)}>
                      {getStatusText(task.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(task.createdAt), 'yyyy-MM-dd HH:mm', {
                      locale: zhCN,
                    })}
                  </TableCell>
                  <TableCell>
                    <Link to={`/tasks/${task.id}`}>
                      <Button variant="ghost" size="sm">
                        查看详情
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  暂无任务数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* 分页 */}
        {data && data.total > 0 && (
          <div className="flex items-center justify-between px-4 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              共 {data.total} 条记录，第 {page} / {data.totalPages} 页
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
      </Card>
    </div>
  );
}

