import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ArrowLeft, Plus, Loader2, Trash2 } from 'lucide-react';
import { TasksApi } from '@/lib/api/tasks';
import { AppsApi, AppVersionsApi } from '@/lib/api/apps';
import { DevicesApi } from '@/lib/api/devices';
import { CoverageStrategy } from '@/types/task';

/**
 * 创建任务表单验证 Schema
 */
const taskFormSchema = z.object({
  name: z
    .string()
    .min(3, { message: '任务名称至少3个字符' })
    .max(100, { message: '任务名称最多100个字符' }),
  appId: z.string().min(1, { message: '请选择应用' }),
  appVersionId: z.string().min(1, { message: '请选择应用版本' }),
  deviceIds: z.array(z.string()).min(1, { message: '至少选择一个设备' }),
  coverageStrategy: z.nativeEnum(CoverageStrategy, { required_error: '请选择覆盖策略' }),
  priority: z.number().int().min(0).max(10).default(5),
  blacklistPaths: z.array(z.string()).optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

/**
 * 创建任务页面
 */
export function TaskCreate() {
  const navigate = useNavigate();
  const [selectedAppId, setSelectedAppId] = useState<string>('');
  const [blacklistPath, setBlacklistPath] = useState('');

  // 获取应用列表
  const { data: appsData } = useQuery({
    queryKey: ['apps'],
    queryFn: () => AppsApi.getApps({ page: 1, limit: 100 }),
  });

  // 获取应用版本列表
  const { data: versionsData } = useQuery({
    queryKey: ['appVersions', selectedAppId],
    queryFn: () => AppVersionsApi.getAppVersions(selectedAppId, { page: 1, limit: 100 }),
    enabled: !!selectedAppId,
  });

  // 获取可用设备列表
  const { data: devicesData } = useQuery({
    queryKey: ['availableDevices'],
    queryFn: () => DevicesApi.getAvailableDevices(),
  });

  // 表单
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      name: '',
      appId: '',
      appVersionId: '',
      deviceIds: [],
      coverageStrategy: CoverageStrategy.CORE,
      priority: 5,
      blacklistPaths: [],
    },
  });

  // 创建任务
  const createMutation = useMutation({
    mutationFn: (data: TaskFormValues) =>
      TasksApi.createTask({
        name: data.name,
        appVersionId: data.appVersionId,
        deviceIds: data.deviceIds,
        coverageStrategy: data.coverageStrategy,
        priority: data.priority,
        blacklistPaths: data.blacklistPaths,
      }),
    onSuccess: (task) => {
      navigate(`/tasks/${task.id}`);
    },
    onError: (error) => {
      console.error('创建任务失败:', error);
    },
  });

  // 表单提交
  const onSubmit = (data: TaskFormValues) => {
    createMutation.mutate(data);
  };

  // 添加黑名单路径
  const addBlacklistPath = () => {
    if (blacklistPath.trim()) {
      const current = form.getValues('blacklistPaths') || [];
      form.setValue('blacklistPaths', [...current, blacklistPath.trim()]);
      setBlacklistPath('');
    }
  };

  // 移除黑名单路径
  const removeBlacklistPath = (index: number) => {
    const current = form.getValues('blacklistPaths') || [];
    form.setValue(
      'blacklistPaths',
      current.filter((_, i) => i !== index)
    );
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/tasks')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">创建遍历任务</h2>
          <p className="text-muted-foreground">配置并启动新的 UI 自动化遍历任务</p>
        </div>
      </div>

      {/* 表单 */}
      <Card className="bento-card">
        <CardHeader>
          <CardTitle>任务配置</CardTitle>
          <CardDescription>填写任务的基本信息和执行参数</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* 任务名称 */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>任务名称 *</FormLabel>
                    <FormControl>
                      <Input placeholder="例如：审批中心 v6.3.1 遍历" {...field} />
                    </FormControl>
                    <FormDescription>为任务起一个有意义的名称</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 应用选择 */}
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="appId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>应用 *</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedAppId(value);
                          form.setValue('appVersionId', '');
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择应用" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {appsData?.items.map((app) => (
                            <SelectItem key={app.id} value={app.id}>
                              {app.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="appVersionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>应用版本 *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!selectedAppId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择版本" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {versionsData?.items.map((version) => (
                            <SelectItem key={version.id} value={version.id}>
                              {version.version}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 覆盖策略和优先级 */}
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="coverageStrategy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>覆盖策略 *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择覆盖策略" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={CoverageStrategy.FULL}>全量遍历</SelectItem>
                          <SelectItem value={CoverageStrategy.CORE}>核心路径</SelectItem>
                          <SelectItem value={CoverageStrategy.CUSTOM}>自定义</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        全量遍历所有界面，核心路径仅遍历主要功能
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>优先级 (0-10)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={10}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                        />
                      </FormControl>
                      <FormDescription>数字越大优先级越高</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 设备选择 */}
              <FormField
                control={form.control}
                name="deviceIds"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel>选择设备 *</FormLabel>
                      <FormDescription>选择一个或多个设备执行任务</FormDescription>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {devicesData?.map((device) => (
                        <FormField
                          key={device.id}
                          control={form.control}
                          name="deviceIds"
                          render={({ field }) => {
                            return (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(device.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, device.id])
                                        : field.onChange(
                                            field.value?.filter((value) => value !== device.id)
                                          );
                                    }}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="font-normal">{device.serialNumber}</FormLabel>
                                  <p className="text-xs text-muted-foreground">
                                    {device.model}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Android {device.androidVersion}
                                  </p>
                                </div>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 黑名单路径 */}
              <FormField
                control={form.control}
                name="blacklistPaths"
                render={() => (
                  <FormItem>
                    <FormLabel>黑名单路径（可选）</FormLabel>
                    <FormDescription>
                      添加不需要遍历的路径，例如：/settings/dangerous
                    </FormDescription>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="/path/to/exclude"
                        value={blacklistPath}
                        onChange={(e) => setBlacklistPath(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addBlacklistPath();
                          }
                        }}
                      />
                      <Button type="button" variant="outline" onClick={addBlacklistPath}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {form.watch('blacklistPaths')?.length ? (
                      <div className="mt-2 space-y-2">
                        {form.watch('blacklistPaths')?.map((path, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between rounded-md border p-2"
                          >
                            <span className="text-sm font-mono">{path}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeBlacklistPath(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 提交按钮 */}
              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" onClick={() => navigate('/tasks')}>
                  取消
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  创建任务
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
