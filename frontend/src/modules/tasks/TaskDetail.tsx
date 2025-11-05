import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Play,
  XCircle,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  Layers,
  Activity,
} from 'lucide-react';
import { TasksApi } from '@/lib/api/tasks';
import { TaskStatus, CoverageStrategy } from '@/types/task';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { formatDistanceToNow } from 'date-fns';
import { useWebSocket } from '@/lib/hooks/useWebSocket';

/**
 * 任务详情页面
 * 展示任务详细信息、运行记录、LLM 日志
 * 支持 WebSocket 实时更新
 */
export function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // WebSocket 连接
  const { on } = useWebSocket({
    autoConnect: true,
  });

  // 监听当前任务的更新事件
  useEffect(() => {
    const unsubscribeTask = on('task:update', (data) => {
      if (data.taskId === id) {
        console.log('TaskDetail: Task update received for current task', data);
        queryClient.invalidateQueries({ queryKey: ['task', id] });
      }
    });

    const unsubscribeRun = on('taskrun:update', (data) => {
      console.log('TaskDetail: Task run update received', data);
      queryClient.invalidateQueries({ queryKey: ['taskRuns', id] });
    });

    return () => {
      unsubscribeTask();
      unsubscribeRun();
    };
  }, [on, id, queryClient]);

  // 获取任务详情
  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: () => TasksApi.getTask(id!),
    enabled: !!id,
    refetchInterval: 30000, // WebSocket 为主，降低轮询频率
  });

  // 获取任务运行记录
  const { data: taskRuns } = useQuery({
    queryKey: ['taskRuns', id],
    queryFn: () => TasksApi.getTaskRuns(id!),
    enabled: !!id,
    refetchInterval: 30000,
  });

  // 取消任务
  const cancelMutation = useMutation({
    mutationFn: () => TasksApi.cancelTask(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // 重试任务
  const retryMutation = useMutation({
    mutationFn: () => TasksApi.retryTask(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg text-muted-foreground">任务不存在</p>
        <Button onClick={() => navigate('/tasks')} className="mt-4">
          返回任务列表
        </Button>
      </div>
    );
  }

  // 状态徽章变体
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

  // 状态文本
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

  // 覆盖策略文本
  const getCoverageText = (strategy: CoverageStrategy) => {
    switch (strategy) {
      case CoverageStrategy.FULL:
        return '全量遍历';
      case CoverageStrategy.CORE:
        return '核心路径';
      case CoverageStrategy.CUSTOM:
        return '自定义';
      default:
        return strategy;
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/tasks')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{task.name}</h2>
            <p className="text-muted-foreground">
              {task.appVersion?.app?.name} {task.appVersion?.version}
            </p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex space-x-2">
          {task.status === TaskStatus.RUNNING && (
            <Button
              variant="destructive"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              <XCircle className="mr-2 h-4 w-4" />
              取消任务
            </Button>
          )}
          {(task.status === TaskStatus.FAILED || task.status === TaskStatus.CANCELLED) && (
            <Button onClick={() => retryMutation.mutate()} disabled={retryMutation.isPending}>
              <Play className="mr-2 h-4 w-4" />
              重新运行
            </Button>
          )}
        </div>
      </div>

      {/* 任务概览 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bento-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">任务状态</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant={getStatusVariant(task.status)} className="text-lg">
              {getStatusText(task.status)}
            </Badge>
          </CardContent>
        </Card>

        <Card className="bento-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">设备数量</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{task.deviceIds.length}</div>
          </CardContent>
        </Card>

        <Card className="bento-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">覆盖策略</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">{getCoverageText(task.coverageStrategy)}</div>
          </CardContent>
        </Card>

        <Card className="bento-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">优先级</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{task.priority}</div>
          </CardContent>
        </Card>
      </div>

      {/* 详细信息 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 基本信息 */}
        <Card className="bento-card">
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">任务 ID</p>
                <p className="text-sm font-mono">{task.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">创建时间</p>
                <p className="text-sm">
                  {format(new Date(task.createdAt), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })}
                </p>
              </div>
              {task.startedAt && (
                <div>
                  <p className="text-sm text-muted-foreground">开始时间</p>
                  <p className="text-sm">
                    {format(new Date(task.startedAt), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })}
                  </p>
                </div>
              )}
              {task.completedAt && (
                <div>
                  <p className="text-sm text-muted-foreground">完成时间</p>
                  <p className="text-sm">
                    {format(new Date(task.completedAt), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })}
                  </p>
                </div>
              )}
              {task.createdBy && (
                <div>
                  <p className="text-sm text-muted-foreground">创建人</p>
                  <p className="text-sm">{task.createdBy}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">应用版本 ID</p>
                <p className="text-sm font-mono">{task.appVersionId}</p>
              </div>
            </div>
            {task.failureReason && (
              <div className="rounded-lg bg-destructive/10 p-4">
                <p className="text-sm font-medium text-destructive mb-1">失败原因</p>
                <p className="text-sm text-destructive/80">{task.failureReason}</p>
              </div>
            )}
            {task.blacklistPaths && task.blacklistPaths.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">黑名单路径</p>
                <div className="rounded-lg bg-muted p-3">
                  <ul className="text-sm space-y-1">
                    {task.blacklistPaths.map((path, index) => (
                      <li key={index} className="font-mono">
                        {path}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 操作时间线 */}
        <Card className="bento-card">
          <CardHeader>
            <CardTitle>操作时间线</CardTitle>
            <CardDescription>任务执行过程的关键时间点</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 创建 */}
              <div className="flex items-start space-x-4">
                <div className="mt-1 h-2 w-2 rounded-full bg-blue-500"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">任务创建</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(task.createdAt), {
                      addSuffix: true,
                      locale: zhCN,
                    })}
                  </p>
                </div>
              </div>

              {/* 开始 */}
              {task.startedAt && (
                <div className="flex items-start space-x-4">
                  <div className="mt-1 h-2 w-2 rounded-full bg-green-500"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">任务开始</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(task.startedAt), {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                    </p>
                  </div>
                </div>
              )}

              {/* 完成 */}
              {task.completedAt && (
                <div className="flex items-start space-x-4">
                  <div
                    className={`mt-1 h-2 w-2 rounded-full ${
                      task.status === TaskStatus.SUCCEEDED ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  ></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      任务{task.status === TaskStatus.SUCCEEDED ? '完成' : '失败'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(task.completedAt), {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                    </p>
                  </div>
                </div>
              )}

              {/* 运行中 */}
              {task.status === TaskStatus.RUNNING && (
                <div className="flex items-start space-x-4">
                  <div className="mt-1 h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">正在执行...</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 设备运行记录 */}
      {taskRuns && taskRuns.length > 0 && (
        <Card className="bento-card">
          <CardHeader>
            <CardTitle>设备运行记录</CardTitle>
            <CardDescription>各设备上的任务执行情况</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>设备 ID</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>访问界面</TableHead>
                  <TableHead>执行动作</TableHead>
                  <TableHead>生成定位</TableHead>
                  <TableHead>开始时间</TableHead>
                  <TableHead>完成时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taskRuns.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-mono">{run.deviceId.slice(0, 8)}...</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(run.status)}>
                        {getStatusText(run.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{run.screensVisited}</TableCell>
                    <TableCell>{run.actionsExecuted}</TableCell>
                    <TableCell>{run.locatorsGenerated}</TableCell>
                    <TableCell>
                      {run.startedAt
                        ? format(new Date(run.startedAt), 'MM-dd HH:mm', { locale: zhCN })
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {run.completedAt
                        ? format(new Date(run.completedAt), 'MM-dd HH:mm', { locale: zhCN })
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* LLM 日志 (预留) */}
      <Card className="bento-card">
        <CardHeader>
          <CardTitle>LLM 执行日志</CardTitle>
          <CardDescription>AI 决策和操作记录</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>LLM 日志功能即将上线</p>
            <p className="text-sm mt-2">将展示 AI 的决策过程、动作选择和推理逻辑</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
