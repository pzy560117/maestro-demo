import { useState } from 'react';
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
  Smartphone,
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Wrench,
  Cpu,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { DevicesApi } from '@/lib/api/devices';
import { Device, DeviceStatus, DeviceType, CreateDeviceDto, UpdateDeviceDto } from '@/types/device';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

/**
 * 设备管理页面
 * 显示设备列表和 CRUD 操作
 */
export function DeviceList() {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [formData, setFormData] = useState<CreateDeviceDto>({
    serialNumber: '',
    model: '',
    androidVersion: '',
    type: DeviceType.REAL,
    tags: [],
  });

  const queryClient = useQueryClient();

  // 获取设备列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['devices', page, limit],
    queryFn: () => DevicesApi.getDevices({ page, limit }),
    refetchInterval: 30000, // 每30秒刷新
  });

  // 创建设备
  const createMutation = useMutation({
    mutationFn: (data: CreateDeviceDto) => DevicesApi.createDevice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      setCreateDialogOpen(false);
      resetForm();
    },
  });

  // 更新设备
  const updateMutation = useMutation({
    mutationFn: (data: { id: string; updates: UpdateDeviceDto }) =>
      DevicesApi.updateDevice(data.id, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      setEditDialogOpen(false);
      setSelectedDevice(null);
      resetForm();
    },
  });

  // 删除设备
  const deleteMutation = useMutation({
    mutationFn: (id: string) => DevicesApi.deleteDevice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      setDeleteDialogOpen(false);
      setSelectedDevice(null);
    },
  });

  /**
   * 重置表单
   */
  const resetForm = () => {
    setFormData({
      serialNumber: '',
      model: '',
      androidVersion: '',
      type: DeviceType.REAL,
      tags: [],
    });
  };

  /**
   * 打开编辑对话框
   */
  const openEditDialog = (device: Device) => {
    setSelectedDevice(device);
    setFormData({
      serialNumber: device.serialNumber,
      model: device.model,
      androidVersion: device.androidVersion,
      type: device.type,
      tags: device.tags,
    });
    setEditDialogOpen(true);
  };

  /**
   * 提交创建/编辑
   */
  const handleSubmit = () => {
    if (editDialogOpen && selectedDevice) {
      updateMutation.mutate({
        id: selectedDevice.id,
        updates: {
          model: formData.model,
          androidVersion: formData.androidVersion,
          tags: formData.tags,
        },
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  /**
   * 获取状态配置
   */
  const getStatusConfig = (status: DeviceStatus) => {
    const configs = {
      AVAILABLE: { label: '可用', icon: CheckCircle, color: 'text-green-500', variant: 'default' as const },
      BUSY: { label: '忙碌', icon: Clock, color: 'text-yellow-500', variant: 'default' as const },
      OFFLINE: { label: '离线', icon: XCircle, color: 'text-red-500', variant: 'destructive' as const },
      MAINTENANCE: { label: '维护中', icon: Wrench, color: 'text-blue-500', variant: 'secondary' as const },
    };
    return configs[status];
  };

  /**
   * 获取设备类型图标
   */
  const getDeviceTypeIcon = (type: DeviceType) => {
    return type === DeviceType.REAL ? Smartphone : Cpu;
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">设备管理</h2>
          <p className="text-muted-foreground">管理测试设备和模拟器</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            添加设备
          </Button>
        </div>
      </div>

      {/* 设备统计 */}
      {data && (
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="bento-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                总设备数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Smartphone className="h-5 w-5 text-blue-500" />
                <span className="text-3xl font-bold">{data.total}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bento-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                可用设备
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-3xl font-bold">
                  {data.items.filter((d) => d.status === DeviceStatus.AVAILABLE).length}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bento-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                忙碌设备
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <span className="text-3xl font-bold">
                  {data.items.filter((d) => d.status === DeviceStatus.BUSY).length}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bento-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                离线设备
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-3xl font-bold">
                  {data.items.filter((d) => d.status === DeviceStatus.OFFLINE).length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 设备列表 */}
      <Card className="bento-card">
        <CardHeader>
          <CardTitle>设备列表</CardTitle>
          <CardDescription>共 {data?.total || 0} 台设备</CardDescription>
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
                    <TableHead>设备</TableHead>
                    <TableHead>型号</TableHead>
                    <TableHead>Android 版本</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>标签</TableHead>
                    <TableHead>最后心跳</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((device) => {
                    const statusConfig = getStatusConfig(device.status);
                    const StatusIcon = statusConfig.icon;
                    const TypeIcon = getDeviceTypeIcon(device.type);

                    return (
                      <TableRow key={device.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <TypeIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono text-sm">{device.serialNumber}</span>
                          </div>
                        </TableCell>
                        <TableCell>{device.model}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{device.androidVersion}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {device.type === DeviceType.REAL ? '真机' : '模拟器'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
                            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {device.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {device.tags.map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {device.lastHeartbeat
                            ? format(new Date(device.lastHeartbeat), 'MM-dd HH:mm', {
                                locale: zhCN,
                              })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(device)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedDevice(device);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* 分页 */}
              {data.totalPages > 1 && (
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
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <Smartphone className="h-16 w-16 text-muted-foreground/20 mb-4" />
              <p className="text-lg text-muted-foreground">暂无设备</p>
              <p className="text-sm text-muted-foreground mt-2">点击"添加设备"按钮开始添加</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 创建/编辑设备对话框 */}
      <Dialog
        open={createDialogOpen || editDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditDialogOpen(false);
            setSelectedDevice(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editDialogOpen ? '编辑设备' : '添加设备'}</DialogTitle>
            <DialogDescription>
              {editDialogOpen ? '更新设备信息' : '添加新的测试设备或模拟器'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="serialNumber">序列号 *</Label>
              <Input
                id="serialNumber"
                placeholder="设备序列号"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                disabled={editDialogOpen}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">型号 *</Label>
              <Input
                id="model"
                placeholder="设备型号"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="androidVersion">Android 版本 *</Label>
              <Input
                id="androidVersion"
                placeholder="例如：13"
                value={formData.androidVersion}
                onChange={(e) => setFormData({ ...formData, androidVersion: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">设备类型 *</Label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as DeviceType })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={editDialogOpen}
              >
                <option value={DeviceType.REAL}>真机</option>
                <option value={DeviceType.EMULATOR}>模拟器</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">标签（可选）</Label>
              <Input
                id="tags"
                placeholder="用逗号分隔，例如：测试,生产"
                value={formData.tags?.join(', ') || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                  })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setEditDialogOpen(false);
                setSelectedDevice(null);
                resetForm();
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !formData.serialNumber || !formData.model || !formData.androidVersion
              }
            >
              {editDialogOpen ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除设备</DialogTitle>
            <DialogDescription>
              确定要删除设备 "{selectedDevice?.serialNumber}" 吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedDevice && deleteMutation.mutate(selectedDevice.id)}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
