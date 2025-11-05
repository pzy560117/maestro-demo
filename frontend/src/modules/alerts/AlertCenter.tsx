import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Eye,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { AlertsApi } from '@/lib/api/alerts';
import { Alert, AlertStatus, AlertSeverity, AlertType } from '@/types/alert';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useWebSocket } from '@/lib/hooks/useWebSocket';

/**
 * 告警中心页面
 * 显示告警统计、列表和处理功能
 * 支持 WebSocket 实时更新
 */
export function AlertCenter() {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'ALL'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'ALL'>('ALL');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [actionDialog, setActionDialog] = useState<'acknowledge' | 'resolve' | 'ignore' | null>(
    null
  );
  const [operator, setOperator] = useState('');

  const queryClient = useQueryClient();

  // WebSocket 连接
  const { on } = useWebSocket({
    autoConnect: true,
  });

  // 监听告警事件
  useEffect(() => {
    const unsubscribeNew = on('alert:new', (data) => {
      console.log('AlertCenter: New alert received', data);
      // 刷新告警统计和列表
      queryClient.invalidateQueries({ queryKey: ['alertStats'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    });

    const unsubscribeUpdate = on('alert:update', (data) => {
      console.log('AlertCenter: Alert update received', data);
      // 刷新告警统计和列表
      queryClient.invalidateQueries({ queryKey: ['alertStats'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    });

    return () => {
      unsubscribeNew();
      unsubscribeUpdate();
    };
  }, [on, queryClient]);

  // 获取告警统计
  const { data: stats } = useQuery({
    queryKey: ['alert-stats'],
    queryFn: () => AlertsApi.getAlertStats(),
    refetchInterval: 30000, // 每30秒刷新
  });

  // 获取告警列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['alerts', page, limit, statusFilter, severityFilter],
    queryFn: () =>
      AlertsApi.getAlerts({
        page,
        limit,
        ...(statusFilter !== 'ALL' && { status: statusFilter }),
        ...(severityFilter !== 'ALL' && { severity: severityFilter }),
      }),
    refetchInterval: 30000,
  });

  // 确认告警
  const acknowledgeMutation = useMutation({
    mutationFn: (data: { id: string; operator: string }) =>
      AlertsApi.acknowledgeAlert(data.id, data.operator),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alert-stats'] });
      setActionDialog(null);
      setOperator('');
    },
  });

  // 解决告警
  const resolveMutation = useMutation({
    mutationFn: (data: { id: string; operator: string }) =>
      AlertsApi.resolveAlert(data.id, data.operator),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alert-stats'] });
      setActionDialog(null);
      setOperator('');
    },
  });

  // 忽略告警
  const ignoreMutation = useMutation({
    mutationFn: (id: string) => AlertsApi.ignoreAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alert-stats'] });
      setActionDialog(null);
    },
  });

  /**
   * 处理告警操作
   */
  const handleAction = () => {
    if (!selectedAlert) return;

    if (actionDialog === 'acknowledge' || actionDialog === 'resolve') {
      if (!operator.trim()) return;

      const mutation = actionDialog === 'acknowledge' ? acknowledgeMutation : resolveMutation;
      mutation.mutate({ id: selectedAlert.id, operator: operator.trim() });
    } else if (actionDialog === 'ignore') {
      ignoreMutation.mutate(selectedAlert.id);
    }
  };

  /**
   * 获取严重程度图标和颜色
   */
  const getSeverityConfig = (severity: AlertSeverity) => {
    const configs = {
      CRITICAL: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
      HIGH: { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
      MEDIUM: { icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
      LOW: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    };
    return configs[severity];
  };

  /**
   * 获取告警类型显示名称
   */
  const getAlertTypeName = (type: AlertType) => {
    const names = {
      LOCATOR_FAILURE: '定位失败',
      TASK_FAILURE: '任务失败',
      SCREEN_DIFF: '界面差异',
      DEVICE_OFFLINE: '设备离线',
      LLM_ERROR: 'LLM 错误',
      SYSTEM_ERROR: '系统错误',
    };
    return names[type];
  };

  /**
   * 获取状态徽章
   */
  const getStatusBadge = (status: AlertStatus) => {
    const configs = {
      PENDING: { label: '待处理', variant: 'destructive' as const },
      ACKED: { label: '已确认', variant: 'default' as const },
      RESOLVED: { label: '已解决', variant: 'secondary' as const },
      IGNORED: { label: '已忽略', variant: 'outline' as const },
    };
    return configs[status];
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">告警中心</h2>
          <p className="text-muted-foreground">监控和管理系统告警</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="bento-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                待处理告警
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span className="text-3xl font-bold">{stats.pending}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bento-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                已确认告警
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-yellow-500" />
                <span className="text-3xl font-bold">{stats.acked}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bento-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                已解决告警
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-3xl font-bold">{stats.resolved}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bento-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                严重告警
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-3xl font-bold">{stats.critical}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 筛选栏 */}
      <Card className="bento-card p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex-1 grid gap-4 md:grid-cols-2">
            {/* 状态筛选 */}
            <div>
              <Label htmlFor="status-filter" className="text-sm mb-2">
                状态
              </Label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as AlertStatus | 'ALL')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="ALL">全部状态</option>
                <option value="PENDING">待处理</option>
                <option value="ACKED">已确认</option>
                <option value="RESOLVED">已解决</option>
                <option value="IGNORED">已忽略</option>
              </select>
            </div>

            {/* 严重程度筛选 */}
            <div>
              <Label htmlFor="severity-filter" className="text-sm mb-2">
                严重程度
              </Label>
              <select
                id="severity-filter"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as AlertSeverity | 'ALL')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="ALL">全部程度</option>
                <option value="CRITICAL">严重</option>
                <option value="HIGH">高</option>
                <option value="MEDIUM">中</option>
                <option value="LOW">低</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* 告警列表 */}
      <Card className="bento-card">
        <CardHeader>
          <CardTitle>告警列表</CardTitle>
          <CardDescription>
            共 {data?.total || 0} 条告警
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : data && data.items.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>严重程度</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>标题</TableHead>
                    <TableHead>消息</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((alert) => {
                    const severityConfig = getSeverityConfig(alert.severity);
                    const statusConfig = getStatusBadge(alert.status);
                    const Icon = severityConfig.icon;

                    return (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className={`p-2 rounded-full ${severityConfig.bg}`}>
                              <Icon className={`h-4 w-4 ${severityConfig.color}`} />
                            </div>
                            <span className="text-sm">{alert.severity}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getAlertTypeName(alert.type)}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{alert.title}</TableCell>
                        <TableCell className="max-w-xs truncate">{alert.message}</TableCell>
                        <TableCell>
                          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(alert.createdAt), 'MM-dd HH:mm', { locale: zhCN })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {alert.status === 'PENDING' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedAlert(alert);
                                    setActionDialog('acknowledge');
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedAlert(alert);
                                    setActionDialog('resolve');
                                  }}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedAlert(alert);
                                    setActionDialog('ignore');
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {alert.status === 'ACKED' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedAlert(alert);
                                  setActionDialog('resolve');
                                }}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* 分页 */}
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-muted-foreground">
                  第 {page} / {data.totalPages} 页
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
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <CheckCircle className="h-16 w-16 text-green-500/20 mb-4" />
              <p className="text-lg text-muted-foreground">暂无告警</p>
              <p className="text-sm text-muted-foreground mt-2">系统运行正常</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 操作对话框 */}
      <Dialog open={actionDialog !== null} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog === 'acknowledge' && '确认告警'}
              {actionDialog === 'resolve' && '解决告警'}
              {actionDialog === 'ignore' && '忽略告警'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog === 'acknowledge' && '确认您已知悉此告警'}
              {actionDialog === 'resolve' && '标记此告警为已解决'}
              {actionDialog === 'ignore' && '确认要忽略此告警吗？'}
            </DialogDescription>
          </DialogHeader>

          {(actionDialog === 'acknowledge' || actionDialog === 'resolve') && (
            <div className="space-y-2">
              <Label htmlFor="operator">操作人</Label>
              <Input
                id="operator"
                placeholder="请输入您的姓名"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              取消
            </Button>
            <Button
              onClick={handleAction}
              disabled={
                (actionDialog === 'acknowledge' || actionDialog === 'resolve') && !operator.trim()
              }
            >
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
