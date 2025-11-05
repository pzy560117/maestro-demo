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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  Box,
  FileCode,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Tag,
  Search,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import { AppsApi, AppVersionsApi } from '@/lib/api/apps';
import { App, CreateAppDto, CreateAppVersionDto } from '@/types/app';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

/**
 * 应用管理页面
 * 显示应用列表和版本管理
 */
export function AppList() {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [createAppDialogOpen, setCreateAppDialogOpen] = useState(false);
  const [editAppDialogOpen, setEditAppDialogOpen] = useState(false);
  const [deleteAppDialogOpen, setDeleteAppDialogOpen] = useState(false);
  const [createVersionDialogOpen, setCreateVersionDialogOpen] = useState(false);
  const [appFormData, setAppFormData] = useState<CreateAppDto>({
    name: '',
    packageName: '',
    description: '',
  });
  const [versionFormData, setVersionFormData] = useState<CreateAppVersionDto>({
    appId: '',
    version: '',
    apkHash: '',
    releaseNotes: '',
  });

  // 扫描应用相关状态
  const [scanMode, setScanMode] = useState<'manual' | 'scan'>('scan');
  const [scannedApps, setScannedApps] = useState<Array<{
    packageName: string;
    appName: string;
    versionName: string;
    versionCode: number;
    isExisting: boolean;
  }>>([]);
  const [selectedAppPackage, setSelectedAppPackage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const queryClient = useQueryClient();

  // 获取应用列表
  const { data: appsData, isLoading: appsLoading, refetch } = useQuery({
    queryKey: ['apps', page, limit],
    queryFn: () => AppsApi.getApps({ page, limit }),
  });

  // 获取选中应用的版本列表
  const { data: versionsData, isLoading: versionsLoading } = useQuery({
    queryKey: ['app-versions', selectedApp?.id],
    queryFn: () => AppVersionsApi.getAppVersions(selectedApp!.id),
    enabled: !!selectedApp?.id,
  });

  // 创建应用
  const createAppMutation = useMutation({
    mutationFn: (data: CreateAppDto) => AppsApi.createApp(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apps'] });
      setCreateAppDialogOpen(false);
      resetAppForm();
    },
  });

  // 更新应用
  const updateAppMutation = useMutation({
    mutationFn: (data: { id: string; updates: Partial<CreateAppDto> }) =>
      AppsApi.updateApp(data.id, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apps'] });
      setEditAppDialogOpen(false);
      setSelectedApp(null);
      resetAppForm();
    },
  });

  // 删除应用
  const deleteAppMutation = useMutation({
    mutationFn: (id: string) => AppsApi.deleteApp(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apps'] });
      setDeleteAppDialogOpen(false);
      setSelectedApp(null);
    },
  });

  // 创建应用版本
  const createVersionMutation = useMutation({
    mutationFn: (data: CreateAppVersionDto) => AppVersionsApi.createAppVersion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-versions'] });
      setCreateVersionDialogOpen(false);
      resetVersionForm();
    },
  });

  // 删除应用版本
  const deleteVersionMutation = useMutation({
    mutationFn: (id: string) => AppVersionsApi.deleteAppVersion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-versions'] });
    },
  });

  // 扫描应用
  const scanAppsMutation = useMutation({
    mutationFn: () => {
      setIsScanning(true);
      return AppsApi.scanApps();
    },
    onSuccess: (data) => {
      setScannedApps(data);
      setIsScanning(false);
    },
    onError: () => {
      setIsScanning(false);
    },
  });

  // 批量创建应用
  const batchCreateMutation = useMutation({
    mutationFn: (apps: CreateAppDto[]) => AppsApi.batchCreateApps(apps),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apps'] });
      setCreateAppDialogOpen(false);
      setScannedApps([]);
      setSelectedAppPackage(null);
    },
  });

  /**
   * 重置应用表单
   */
  const resetAppForm = () => {
    setAppFormData({
      name: '',
      packageName: '',
      description: '',
    });
  };

  /**
   * 重置版本表单
   */
  const resetVersionForm = () => {
    setVersionFormData({
      appId: selectedApp?.id || '',
      version: '',
      apkHash: '',
      releaseNotes: '',
    });
  };

  /**
   * 打开编辑应用对话框
   */
  const openEditAppDialog = (app: App) => {
    setSelectedApp(app);
    setAppFormData({
      name: app.name,
      packageName: app.packageName,
      description: app.description || '',
    });
    setEditAppDialogOpen(true);
  };

  /**
   * 打开创建版本对话框
   */
  const openCreateVersionDialog = (app: App) => {
    setSelectedApp(app);
    setVersionFormData({
      appId: app.id,
      version: '',
      apkHash: '',
      releaseNotes: '',
    });
    setCreateVersionDialogOpen(true);
  };

  /**
   * 提交应用表单
   */
  const handleAppSubmit = () => {
    if (editAppDialogOpen && selectedApp) {
      updateAppMutation.mutate({
        id: selectedApp.id,
        updates: appFormData,
      });
    } else {
      createAppMutation.mutate(appFormData);
    }
  };

  /**
   * 快速填充应用信息（从扫描结果）
   */
  const handleQuickFillApp = (app: typeof scannedApps[0]) => {
    setAppFormData({
      name: app.appName,
      packageName: app.packageName,
      description: `版本: ${app.versionName} (${app.versionCode})`,
    });
    setSelectedAppPackage(app.packageName);
    setScanMode('manual');
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">应用管理</h2>
          <p className="text-muted-foreground">管理测试应用和版本</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${appsLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button size="sm" onClick={() => setCreateAppDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            添加应用
          </Button>
        </div>
      </div>

      {/* 应用统计 */}
      {appsData && (
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="bento-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                总应用数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-blue-500" />
                <span className="text-3xl font-bold">{appsData.total}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bento-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                总版本数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Box className="h-5 w-5 text-green-500" />
                <span className="text-3xl font-bold">
                  {versionsData?.total || 0}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bento-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                当前选中
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <FileCode className="h-5 w-5 text-purple-500" />
                <span className="text-lg font-medium truncate">
                  {selectedApp?.name || '未选中'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 标签页 */}
      <Tabs defaultValue="apps" className="space-y-4">
        <TabsList>
          <TabsTrigger value="apps">
            <Package className="mr-2 h-4 w-4" />
            应用列表 ({appsData?.total || 0})
          </TabsTrigger>
          <TabsTrigger value="versions" disabled={!selectedApp}>
            <Tag className="mr-2 h-4 w-4" />
            版本管理 ({versionsData?.total || 0})
          </TabsTrigger>
        </TabsList>

        {/* 应用列表 */}
        <TabsContent value="apps">
          <Card className="bento-card">
            <CardHeader>
              <CardTitle>应用列表</CardTitle>
              <CardDescription>共 {appsData?.total || 0} 个应用</CardDescription>
            </CardHeader>
            <CardContent>
              {appsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : appsData && appsData.items && appsData.items.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>应用名称</TableHead>
                        <TableHead>包名</TableHead>
                        <TableHead>描述</TableHead>
                        <TableHead>创建时间</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appsData.items.map((app) => (
                        <TableRow
                          key={app.id}
                          className={selectedApp?.id === app.id ? 'bg-accent/50' : ''}
                        >
                          <TableCell className="font-medium">{app.name}</TableCell>
                          <TableCell className="font-mono text-sm">{app.packageName}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {app.description || '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(app.createdAt), 'yyyy-MM-dd', { locale: zhCN })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedApp(app)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openCreateVersionDialog(app)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditAppDialog(app)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedApp(app);
                                  setDeleteAppDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* 分页 */}
                  {appsData.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6">
                      <div className="text-sm text-muted-foreground">
                        第 {page} / {appsData.totalPages} 页
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
                          onClick={() => setPage((p) => Math.min(appsData.totalPages, p + 1))}
                          disabled={page === appsData.totalPages}
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
                  <Package className="h-16 w-16 text-muted-foreground/20 mb-4" />
                  <p className="text-lg text-muted-foreground">暂无应用</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    点击"添加应用"按钮开始添加
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 版本管理 */}
        <TabsContent value="versions">
          <Card className="bento-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedApp?.name} 版本列表</CardTitle>
                  <CardDescription>共 {versionsData?.total || 0} 个版本</CardDescription>
                </div>
                {selectedApp && (
                  <Button size="sm" onClick={() => openCreateVersionDialog(selectedApp)}>
                    <Plus className="mr-2 h-4 w-4" />
                    添加版本
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {versionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : versionsData && versionsData.items && versionsData.items.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>版本号</TableHead>
                      <TableHead>APK Hash</TableHead>
                      <TableHead>发布说明</TableHead>
                      <TableHead>创建时间</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {versionsData.items.map((version) => (
                      <TableRow key={version.id}>
                        <TableCell>
                          <Badge variant="default">{version.version}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {version.apkHash.slice(0, 16)}...
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {version.releaseNotes || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <div className="flex items-center">
                            <Calendar className="mr-1 h-3 w-3" />
                            {format(new Date(version.createdAt), 'yyyy-MM-dd HH:mm', {
                              locale: zhCN,
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteVersionMutation.mutate(version.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <Tag className="h-12 w-12 text-muted-foreground/20 mb-2" />
                  <p className="text-muted-foreground">暂无版本</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 创建/编辑应用对话框 */}
      <Dialog
        open={createAppDialogOpen || editAppDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateAppDialogOpen(false);
            setEditAppDialogOpen(false);
            setSelectedApp(null);
            resetAppForm();
            setScannedApps([]);
            setSelectedAppPackage(null);
            setScanMode('scan');
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editAppDialogOpen ? '编辑应用' : '添加应用'}</DialogTitle>
            <DialogDescription>
              {editAppDialogOpen ? '更新应用信息' : '扫描设备应用或手动添加'}
            </DialogDescription>
          </DialogHeader>

          {editAppDialogOpen ? (
            /* 编辑模式：仅显示表单 */
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">应用名称 *</Label>
                <Input
                  id="name"
                  placeholder="应用名称"
                  value={appFormData.name}
                  onChange={(e) => setAppFormData({ ...appFormData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="packageName">包名 *</Label>
                <Input
                  id="packageName"
                  placeholder="com.example.app"
                  value={appFormData.packageName}
                  onChange={(e) => setAppFormData({ ...appFormData, packageName: e.target.value })}
                  disabled={true}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">描述（可选）</Label>
                <Input
                  id="description"
                  placeholder="应用描述"
                  value={appFormData.description}
                  onChange={(e) => setAppFormData({ ...appFormData, description: e.target.value })}
                />
              </div>
            </div>
          ) : (
            /* 创建模式：扫描应用 + 手动添加 */
            <Tabs value={scanMode} onValueChange={(v) => setScanMode(v as 'manual' | 'scan')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="scan">
                  <Search className="mr-2 h-4 w-4" />
                  扫描应用
                </TabsTrigger>
                <TabsTrigger value="manual">
                  <Plus className="mr-2 h-4 w-4" />
                  手动添加
                </TabsTrigger>
              </TabsList>

              <TabsContent value="scan" className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">扫描连接设备上的第三方应用（排除系统应用）</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => scanAppsMutation.mutate()}
                    disabled={isScanning}
                  >
                    {isScanning ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        扫描中...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        扫描应用
                      </>
                    )}
                  </Button>
                </div>

                {scannedApps.length > 0 ? (
                  <div className="border rounded-lg max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>应用名称</TableHead>
                          <TableHead>包名</TableHead>
                          <TableHead>版本</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead>操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scannedApps.map((app) => (
                          <TableRow
                            key={app.packageName}
                            className={app.isExisting ? 'opacity-50' : ''}
                          >
                            <TableCell className="font-medium">{app.appName}</TableCell>
                            <TableCell className="font-mono text-xs">{app.packageName}</TableCell>
                            <TableCell className="text-sm">
                              {app.versionName} ({app.versionCode})
                            </TableCell>
                            <TableCell>
                              {app.isExisting ? (
                                <Badge variant="secondary">
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  已存在
                                </Badge>
                              ) : (
                                <Badge variant="outline">可添加</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={app.isExisting}
                                onClick={() => handleQuickFillApp(app)}
                              >
                                快速添加
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 border rounded-lg bg-muted/20">
                    <Package className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">未扫描到应用</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      点击"扫描应用"按钮开始扫描
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="manual" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">应用名称 *</Label>
                  <Input
                    id="name"
                    placeholder="应用名称"
                    value={appFormData.name}
                    onChange={(e) => setAppFormData({ ...appFormData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="packageName">包名 *</Label>
                  <Input
                    id="packageName"
                    placeholder="com.example.app"
                    value={appFormData.packageName}
                    onChange={(e) => setAppFormData({ ...appFormData, packageName: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">描述（可选）</Label>
                  <Input
                    id="description"
                    placeholder="应用描述"
                    value={appFormData.description}
                    onChange={(e) => setAppFormData({ ...appFormData, description: e.target.value })}
                  />
                </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateAppDialogOpen(false);
                setEditAppDialogOpen(false);
                setSelectedApp(null);
                resetAppForm();
                setScannedApps([]);
                setSelectedAppPackage(null);
                setScanMode('scan');
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleAppSubmit}
              disabled={!appFormData.name || !appFormData.packageName}
            >
              {editAppDialogOpen ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建版本对话框 */}
      <Dialog open={createVersionDialogOpen} onOpenChange={setCreateVersionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>添加版本</DialogTitle>
            <DialogDescription>为 {selectedApp?.name} 添加新版本</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="version">版本号 *</Label>
              <Input
                id="version"
                placeholder="1.0.0"
                value={versionFormData.version}
                onChange={(e) => setVersionFormData({ ...versionFormData, version: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apkHash">APK Hash *</Label>
              <Input
                id="apkHash"
                placeholder="APK 文件的 SHA256 哈希"
                value={versionFormData.apkHash}
                onChange={(e) => setVersionFormData({ ...versionFormData, apkHash: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="releaseNotes">发布说明（可选）</Label>
              <Input
                id="releaseNotes"
                placeholder="版本更新说明"
                value={versionFormData.releaseNotes}
                onChange={(e) =>
                  setVersionFormData({ ...versionFormData, releaseNotes: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateVersionDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={() => createVersionMutation.mutate(versionFormData)}
              disabled={!versionFormData.version || !versionFormData.apkHash}
            >
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除应用确认对话框 */}
      <Dialog open={deleteAppDialogOpen} onOpenChange={setDeleteAppDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除应用</DialogTitle>
            <DialogDescription>
              确定要删除应用 "{selectedApp?.name}" 吗？这将同时删除该应用的所有版本，此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAppDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedApp && deleteAppMutation.mutate(selectedApp.id)}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
