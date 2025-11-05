import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  RefreshCw,
  Image as ImageIcon,
  Code,
  Target,
  GitCompare,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { ScreensApi } from '@/lib/api/screens';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

/**
 * 界面详情页
 * 显示界面的详细信息、元素列表、定位候选和差异记录
 */
export function ScreenDetail() {
  const { signature } = useParams<{ signature: string }>();

  // 获取界面详情
  const { data: screen, isLoading: screenLoading, refetch: refetchScreen } = useQuery({
    queryKey: ['screen', signature],
    queryFn: () => ScreensApi.getScreenBySignature(signature!),
    enabled: !!signature,
  });

  // 获取界面元素
  const { data: elements, isLoading: elementsLoading } = useQuery({
    queryKey: ['screen-elements', screen?.id],
    queryFn: () => ScreensApi.getScreenElements(screen!.id),
    enabled: !!screen?.id,
  });

  // 获取界面差异
  const { data: diffs } = useQuery({
    queryKey: ['screen-diffs', signature],
    queryFn: () => ScreensApi.getScreenDiffs({ signature }),
    enabled: !!signature,
  });

  if (screenLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!screen) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/screens">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回
            </Button>
          </Link>
        </div>
        <Card className="bento-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <XCircle className="h-16 w-16 text-muted-foreground/20 mb-4" />
            <p className="text-lg text-muted-foreground">界面不存在</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/screens">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">界面详情</h2>
            <p className="text-sm text-muted-foreground font-mono">{screen.signature}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchScreen()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          刷新
        </Button>
      </div>

      {/* 界面概览 */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* 界面截图 */}
        <Card className="bento-card md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <ImageIcon className="mr-2 h-5 w-5" />
              界面截图
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-[9/16] bg-gradient-to-br from-accent/20 to-accent/5 rounded-lg overflow-hidden relative">
              {screen.screenshotPath ? (
                <img
                  src={`${import.meta.env.VITE_API_URL || '/api/v1'}/${screen.screenshotPath}`}
                  alt={screen.signature}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <ImageIcon className="h-16 w-16 text-muted-foreground/20" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 界面信息 */}
        <Card className="bento-card md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Code className="mr-2 h-5 w-5" />
              界面信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm text-muted-foreground mb-1">应用版本</div>
                <div className="font-medium">
                  {screen.appVersion?.app?.name || '未知应用'} {screen.appVersion?.version || ''}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Activity</div>
                <div className="font-medium font-mono text-sm break-all">
                  {screen.activity || '未知'}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">路径</div>
                <div className="font-medium">{screen.path || '/'}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">元素数量</div>
                <div className="font-medium">{screen.elementCount || 0} 个</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">DOM Hash</div>
                <div className="font-mono text-sm break-all">{screen.domHash.slice(0, 16)}...</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">版本数量</div>
                <div className="font-medium">{screen.versionCount || 1} 个版本</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1 flex items-center">
                  <Calendar className="mr-1 h-3 w-3" />
                  首次发现
                </div>
                <div className="text-sm">
                  {format(new Date(screen.firstSeenAt), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })}
                </div>
              </div>

              {screen.lastSeenAt && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1 flex items-center">
                    <Calendar className="mr-1 h-3 w-3" />
                    最后更新
                  </div>
                  <div className="text-sm">
                    {format(new Date(screen.lastSeenAt), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })}
                  </div>
                </div>
              )}
            </div>

            {screen.primaryText && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">主要文本</div>
                <div className="font-medium">{screen.primaryText}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 标签页内容 */}
      <Tabs defaultValue="elements" className="space-y-4">
        <TabsList>
          <TabsTrigger value="elements">
            <Target className="mr-2 h-4 w-4" />
            元素列表 ({elements?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="diffs">
            <GitCompare className="mr-2 h-4 w-4" />
            差异记录 ({diffs?.items?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* 元素列表 */}
        <TabsContent value="elements">
          <Card className="bento-card">
            <CardHeader>
              <CardTitle>UI 元素</CardTitle>
              <CardDescription>界面中识别的所有 UI 元素和定位信息</CardDescription>
            </CardHeader>
            <CardContent>
              {elementsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : elements && elements.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>类型</TableHead>
                      <TableHead>Resource ID</TableHead>
                      <TableHead>文本</TableHead>
                      <TableHead>描述</TableHead>
                      <TableHead>类名</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {elements.map((element) => (
                      <TableRow key={element.id}>
                        <TableCell>
                          <Badge variant="outline">{element.elementType}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {element.resourceId || '-'}
                        </TableCell>
                        <TableCell>{element.text || '-'}</TableCell>
                        <TableCell>{element.contentDesc || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {element.className?.split('.').pop() || '-'}
                        </TableCell>
                        <TableCell>
                          <ElementLocators elementId={element.id} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <Target className="h-12 w-12 text-muted-foreground/20 mb-2" />
                  <p className="text-muted-foreground">暂无元素数据</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 差异记录 */}
        <TabsContent value="diffs">
          <Card className="bento-card">
            <CardHeader>
              <CardTitle>差异记录</CardTitle>
              <CardDescription>界面版本之间的差异比对记录</CardDescription>
            </CardHeader>
            <CardContent>
              {diffs && diffs.items.length > 0 ? (
                <div className="space-y-4">
                  {diffs.items.map((diff) => (
                    <Card key={diff.id} className="bento-card">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Badge
                                variant={
                                  diff.severity === 'high'
                                    ? 'destructive'
                                    : diff.severity === 'medium'
                                    ? 'default'
                                    : 'secondary'
                                }
                              >
                                {diff.severity}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(diff.createdAt), 'yyyy-MM-dd HH:mm', {
                                  locale: zhCN,
                                })}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 text-sm">
                              <span className="text-green-500">
                                +{diff.elementsAdded} 新增
                              </span>
                              <span className="text-red-500">
                                -{diff.elementsRemoved} 移除
                              </span>
                              <span className="text-yellow-500">
                                ~{diff.elementsModified} 修改
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <GitCompare className="h-12 w-12 text-muted-foreground/20 mb-2" />
                  <p className="text-muted-foreground">暂无差异记录</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * 元素定位候选组件
 */
function ElementLocators({ elementId }: { elementId: string }) {
  const { data: locators } = useQuery({
    queryKey: ['element-locators', elementId],
    queryFn: () => ScreensApi.getElementLocators(elementId),
  });

  if (!locators || locators.length === 0) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  const bestLocator = locators.reduce((best, current) =>
    current.confidence > best.confidence ? current : best
  );

  return (
    <div className="flex items-center space-x-2">
      <Badge variant="outline" className="font-mono text-xs">
        {bestLocator.strategy}
      </Badge>
      {bestLocator.status === 'VALID' ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : bestLocator.status === 'INVALID' ? (
        <XCircle className="h-4 w-4 text-red-500" />
      ) : (
        <AlertCircle className="h-4 w-4 text-yellow-500" />
      )}
    </div>
  );
}
