import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, CheckCircle2, XCircle, Clock, ArrowRight } from 'lucide-react';
import { TasksApi } from '@/lib/api/tasks';
import { AlertsApi } from '@/lib/api/alerts';
import { TaskStatus } from '@/types/task';
import { AlertSeverity } from '@/types/alert';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useWebSocket } from '@/lib/hooks/useWebSocket';

/**
 * 仪表盘页面
 * 展示系统概览、KPI 指标和最近活动
 * 支持 WebSocket 实时更新
 */
export function Dashboard() {
  const queryClient = useQueryClient();

  // WebSocket 连接
  const { on } = useWebSocket({
    autoConnect: true,
    onConnect: () => console.log('Dashboard: WebSocket connected'),
    onDisconnect: () => console.log('Dashboard: WebSocket disconnected'),
  });

  // 监听任务更新事件
  useEffect(() => {
    const unsubscribe = on('task:update', (data) => {
      console.log('Dashboard: Task update received', data);
      // 刷新任务统计和最近任务
      queryClient.invalidateQueries({ queryKey: ['taskStats'] });
      queryClient.invalidateQueries({ queryKey: ['recentTasks'] });
    });
    return unsubscribe;
  }, [on, queryClient]);

  // 监听告警事件
  useEffect(() => {
    const unsubscribeNew = on('alert:new', (data) => {
      console.log('Dashboard: New alert received', data);
      // 刷新告警统计和最近告警
      queryClient.invalidateQueries({ queryKey: ['alertStats'] });
      queryClient.invalidateQueries({ queryKey: ['recentAlerts'] });
    });

    const unsubscribeUpdate = on('alert:update', (data) => {
      console.log('Dashboard: Alert update received', data);
      // 刷新告警统计和最近告警
      queryClient.invalidateQueries({ queryKey: ['alertStats'] });
      queryClient.invalidateQueries({ queryKey: ['recentAlerts'] });
    });

    return () => {
      unsubscribeNew();
      unsubscribeUpdate();
    };
  }, [on, queryClient]);

  // 获取任务统计
  const { data: taskStats } = useQuery({
    queryKey: ['taskStats'],
    queryFn: () => TasksApi.getTaskStats(),
    refetchInterval: 30000, // WebSocket 为主，降低轮询频率到30秒
  });

  // 获取最近任务
  const { data: recentTasks } = useQuery({
    queryKey: ['recentTasks'],
    queryFn: () => TasksApi.getTasks({ page: 1, limit: 5 }),
    refetchInterval: 30000,
  });

  // 获取告警统计
  const { data: alertStats } = useQuery({
    queryKey: ['alertStats'],
    queryFn: () => AlertsApi.getAlertStats(),
    refetchInterval: 30000,
  });

  // 获取最近告警
  const { data: recentAlerts } = useQuery({
    queryKey: ['recentAlerts'],
    queryFn: () => AlertsApi.getAlerts({ page: 1, limit: 5 }),
    refetchInterval: 30000,
  });

  // 告警严重程度颜色映射
  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return 'bg-red-500';
      case AlertSeverity.HIGH:
        return 'bg-orange-500';
      case AlertSeverity.MEDIUM:
        return 'bg-yellow-500';
      case AlertSeverity.LOW:
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">仪表盘</h2>
        <p className="text-muted-foreground">系统运行状态和关键指标概览</p>
      </div>

      {/* KPI 卡片网格 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bento-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">运行中任务</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats?.running || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{taskStats?.queued || 0} 在队列中
            </p>
          </CardContent>
        </Card>

        <Card className="bento-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">成功任务</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats?.succeeded || 0}</div>
            <p className="text-xs text-muted-foreground">
              总共 {taskStats?.total || 0} 个任务
            </p>
          </CardContent>
        </Card>

        <Card className="bento-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">失败任务</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats?.failed || 0}</div>
            <p className="text-xs text-muted-foreground">
              {taskStats?.cancelled || 0} 已取消
            </p>
          </CardContent>
        </Card>

        <Card className="bento-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待处理告警</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alertStats?.pending || 0}</div>
            <p className="text-xs text-muted-foreground">
              {alertStats?.critical || 0} 高优先级
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 内容区域 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* 最近任务 */}
        <Card className="bento-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>最近任务</CardTitle>
                <CardDescription>最新的遍历任务执行情况</CardDescription>
              </div>
              <Link
                to="/tasks"
                className="flex items-center text-sm text-muted-foreground hover:text-accent"
              >
                查看全部 <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTasks?.items.length ? (
                recentTasks.items.map((task) => (
                  <Link
                    key={task.id}
                    to={`/tasks/${task.id}`}
                    className="flex items-center justify-between hover:bg-accent/5 rounded-lg p-2 -mx-2 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{task.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.appVersion?.app?.name} {task.appVersion?.version}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(task.createdAt), {
                          addSuffix: true,
                          locale: zhCN,
                        })}
                      </p>
                    </div>
                    <Badge
                      variant={
                        task.status === TaskStatus.RUNNING
                          ? 'default'
                          : task.status === TaskStatus.SUCCEEDED
                          ? 'success'
                          : 'destructive'
                      }
                    >
                      {task.status}
                    </Badge>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  暂无任务
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 告警时间线 */}
        <Card className="bento-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>告警时间线</CardTitle>
                <CardDescription>最近的系统告警</CardDescription>
              </div>
              <Link
                to="/alerts"
                className="flex items-center text-sm text-muted-foreground hover:text-accent"
              >
                查看全部 <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAlerts?.items.length ? (
                recentAlerts.items.map((alert) => (
                  <div key={alert.id} className="flex items-start space-x-4">
                    <div
                      className={`mt-1 h-2 w-2 rounded-full ${getSeverityColor(
                        alert.severity
                      )}`}
                    ></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {alert.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(alert.createdAt), {
                          addSuffix: true,
                          locale: zhCN,
                        })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  暂无告警
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

