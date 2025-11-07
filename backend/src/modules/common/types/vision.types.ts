/**
 * 视觉元素概要
 */
export interface VisionElementSummary {
  type?: string;
  text?: string;
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence?: number;
}

/**
 * 视觉摘要快照
 */
export interface VisionSnapshot {
  provider: string;
  analyzedAt: string;
  totalElements: number;
  elements: VisionElementSummary[];
}
