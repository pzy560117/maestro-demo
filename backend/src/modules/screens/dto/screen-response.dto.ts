import { ApiProperty } from '@nestjs/swagger';
import { Screen, Element, ScreenOrientation } from '@prisma/client';

/**
 * 元素响应 DTO
 */
export class ElementResponseDto {
  @ApiProperty({ description: '元素 ID' })
  id: string;

  @ApiProperty({ description: '界面 ID' })
  screenId: string;

  @ApiProperty({ description: '元素哈希' })
  elementHash: string;

  @ApiProperty({ description: '元素类型' })
  elementType: string;

  @ApiProperty({ description: 'Resource ID', required: false })
  resourceId?: string | null;

  @ApiProperty({ description: '内容描述', required: false })
  contentDesc?: string | null;

  @ApiProperty({ description: '文本值', required: false })
  textValue?: string | null;

  @ApiProperty({ description: '无障碍标签', required: false })
  accessibilityLabel?: string | null;

  @ApiProperty({ description: 'XPath', required: false })
  xpath?: string | null;

  @ApiProperty({ description: '边界坐标' })
  bounds: any;

  @ApiProperty({ description: '可见性' })
  visibility: string;

  @ApiProperty({ description: '是否可交互' })
  interactable: boolean;

  @ApiProperty({ description: '版本号' })
  version: number;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  constructor(element: Element) {
    this.id = element.id;
    this.screenId = element.screenId;
    this.elementHash = element.elementHash;
    this.elementType = element.elementType;
    this.resourceId = element.resourceId;
    this.contentDesc = element.contentDesc;
    this.textValue = element.textValue;
    this.accessibilityLabel = element.accessibilityLabel;
    this.xpath = element.xpath;
    this.bounds = element.bounds;
    this.visibility = element.visibility;
    this.interactable = element.interactable;
    this.version = element.version;
    this.createdAt = element.createdAt;
    this.updatedAt = element.updatedAt;
  }
}

/**
 * 界面响应 DTO
 */
export class ScreenResponseDto {
  @ApiProperty({ description: '界面 ID' })
  id: string;

  @ApiProperty({ description: '应用版本 ID' })
  appVersionId: string;

  @ApiProperty({ description: '界面签名' })
  signature: string;

  @ApiProperty({ description: 'DOM 哈希' })
  domHash: string;

  @ApiProperty({ description: '主要文案', required: false })
  primaryText?: string | null;

  @ApiProperty({ description: '截图路径' })
  screenshotPath: string;

  @ApiProperty({ description: '截图公共访问 URL', required: false })
  screenshotPublicUrl?: string | null;

  @ApiProperty({ description: '缩略图路径', required: false })
  screenshotThumbPath?: string | null;

  @ApiProperty({ description: 'DOM 路径' })
  domPath: string;

  @ApiProperty({ description: '屏幕方向' })
  orientation: ScreenOrientation;

  @ApiProperty({ description: '宽度' })
  width: number;

  @ApiProperty({ description: '高度' })
  height: number;

  @ApiProperty({ description: '捕获时间' })
  capturedAt: Date;

  @ApiProperty({ description: '设备型号', required: false })
  deviceModel?: string | null;

  @ApiProperty({ description: '来源任务运行 ID', required: false })
  sourceTaskRunId?: string | null;

  @ApiProperty({ description: '来源动作 ID', required: false })
  sourceActionId?: string | null;

  @ApiProperty({ description: '元数据', required: false })
  metadata?: any;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '元素列表', type: [ElementResponseDto], required: false })
  elements?: ElementResponseDto[];

  constructor(screen: Screen & { elements?: Element[] }) {
    this.id = screen.id;
    this.appVersionId = screen.appVersionId;
    this.signature = screen.signature;
    this.domHash = screen.domHash;
    this.primaryText = screen.primaryText;
    this.screenshotPath = screen.screenshotPath;
    this.screenshotPublicUrl = screen.screenshotPublicUrl;
    this.screenshotThumbPath = screen.screenshotThumbPath;
    this.domPath = screen.domPath;
    this.orientation = screen.orientation;
    this.width = screen.width;
    this.height = screen.height;
    this.capturedAt = screen.capturedAt;
    this.deviceModel = screen.deviceModel;
    this.sourceTaskRunId = screen.sourceTaskRunId;
    this.sourceActionId = screen.sourceActionId;
    this.metadata = screen.metadata;
    this.createdAt = screen.createdAt;

    if (screen.elements) {
      this.elements = screen.elements.map((el) => new ElementResponseDto(el));
    }
  }
}
