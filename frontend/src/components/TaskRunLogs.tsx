import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Loader2, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface TaskRunLogsProps {
  taskRunId: string;
}

/**
 * 任务运行日志组件
 * 实时显示任务执行事件（状态变更、动作执行、错误等）
 */
export function TaskRunLogs({ taskRunId }: TaskRunLogsProps) {
  const { data: taskRun, isLoading } = useQuery({
    queryKey: ['taskRunEvents', taskRunId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/orchestrator/task-runs/${taskRunId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch task run events');
      }
      return res.json();
    },
    refetchInterval: 2000, // 2秒刷新
    enabled: !!taskRunId,
  });

  const events = taskRun?.events || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">加载执行日志...</span>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="border-dashed">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Activity className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-sm text-muted-foreground">
            暂无执行日志
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            日志将在任务开始执行后自动显示
          </p>
        </div>
      </Card>
    );
  }

  const getEventTypeBadge = (eventType: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      STATE_CHANGE: { variant: 'default', label: '状态变更' },
      ERROR: { variant: 'destructive', label: '错误' },
      RECOVERY: { variant: 'secondary', label: '恢复' },
      NOTICE: { variant: 'outline', label: '通知' },
    };

    const config = variants[eventType] || { variant: 'default', label: eventType };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatEventDetail = (detail: any) => {
    if (!detail) return '-';

    // 状态变更事件
    if (detail.from !== undefined && detail.to !== undefined) {
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{detail.from || '初始'}</span>
            <span>→</span>
            <span className="font-medium">{detail.to}</span>
          </div>
          {detail.error && (
            <div className="text-xs text-destructive">{detail.error}</div>
          )}
        </div>
      );
    }

    // 错误事件
    if (detail.error) {
      return (
        <div className="text-sm text-destructive">
          {detail.error}
        </div>
      );
    }

    // 通用事件详情
    return (
      <pre className="text-xs text-muted-foreground max-w-xl overflow-x-auto">
        {JSON.stringify(detail, null, 2)}
      </pre>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          共 {events.length} 条日志记录
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Activity className="h-3 w-3 animate-pulse" />
          实时更新中
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">时间</TableHead>
              <TableHead className="w-[120px]">事件类型</TableHead>
              <TableHead>详情</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event: any) => (
              <TableRow key={event.id}>
                <TableCell className="font-mono text-xs">
                  {format(new Date(event.occurredAt), 'yyyy-MM-dd HH:mm:ss', {
                    locale: zhCN,
                  })}
                </TableCell>
                <TableCell>{getEventTypeBadge(event.eventType)}</TableCell>
                <TableCell>{formatEventDetail(event.detail)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

