/**
 * 界面信息
 */
export interface Screen {
  id: string;
  signature: string;
  appVersionId: string;
  screenshotPath: string;
  thumbnailPath?: string;
  domPath: string;
  domHash: string;
  primaryText?: string;
  activity?: string;
  path?: string;
  hierarchy?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  elementCount?: number;
  versionCount?: number;
  firstSeenAt: Date;
  lastSeenAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  appVersion?: {
    version: string;
    app: {
      name: string;
    };
  };
}

/**
 * UI 元素信息
 */
export interface Element {
  id: string;
  screenId: string;
  elementType: string;
  resourceId?: string;
  text?: string;
  contentDesc?: string;
  className?: string;
  bounds?: string;
  xpath?: string;
  attributes?: Record<string, unknown>;
  visualFeatures?: Record<string, unknown>;
  createdAt: Date;
}

/**
 * 定位候选信息
 */
export interface LocatorCandidate {
  id: string;
  elementId: string;
  strategy: string;
  selector: string;
  confidence: number;
  isDynamic: boolean;
  dynamicFlags?: string[];
  status: string;
  lastVerifiedAt?: Date;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 界面差异信息
 */
export interface ScreenDiff {
  id: string;
  baselineScreenId: string;
  currentScreenId: string;
  diffSummary: Record<string, unknown>;
  elementsAdded: number;
  elementsRemoved: number;
  elementsModified: number;
  severity: string;
  createdAt: Date;
}

