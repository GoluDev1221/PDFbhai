
export interface PageFilters {
  invert: boolean;
  grayscale: boolean;
  whiteness: number; // 0-100, effectively brightness/gamma
  blackness: number; // 0-100, effectively contrast/threshold
}

export interface PageItem {
  id: string; // Unique ID for DnD
  fileId: string;
  originalPageIndex: number; // 0-based index in the original PDF
  thumbnailDataUrl: string; // Base64 image of the page
  width: number;
  height: number;
  isSelected: boolean;
  filters: PageFilters;
  drawingDataUrl: string | null; // Base64 PNG of the doodle layer (transparent)
  rotation: 0 | 90 | 180 | 270; // Rotation in degrees
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  pageCount: number;
  data: ArrayBuffer; // Raw PDF data
}

export interface LayoutSettings {
  nUp: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8; 
  showBorders: boolean;
}

export enum AppStep {
  UPLOAD = 1,
  WORKSHOP = 2,
  LAYOUT = 3,
  DOWNLOAD = 4,
}
