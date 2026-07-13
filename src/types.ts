export interface Point {
  x: number;
  y: number;
}

export interface ImageInfo {
  dataUrl: string;
  width: number;
  height: number;
  name: string;
  size: number; // in bytes
  type: string; // e.g., 'image/jpeg', 'image/png'
}

export interface CropAspectRatio {
  id: string;
  label: string;
  ratio: number | null; // width / height, null for Freeform
}

export interface ResizePreset {
  id: string;
  label: string;
  width: number;
  height: number;
}
