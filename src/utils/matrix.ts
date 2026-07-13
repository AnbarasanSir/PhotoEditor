import { Point } from "../types";

/**
 * Solves a system of linear equations A * X = B using Gaussian elimination with partial pivoting.
 * Returns the solution vector X, or null if the system is singular.
 */
export function solveLinearSystem(A: number[][], B: number[]): number[] | null {
  const n = B.length;

  // Make a copy of A and B to avoid mutating input parameters
  const a = A.map((row) => [...row]);
  const b = [...B];

  for (let i = 0; i < n; i++) {
    // Partial pivoting: find row with largest pivot in column i
    let maxEl = Math.abs(a[i][i]);
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(a[k][i]) > maxEl) {
        maxEl = Math.abs(a[k][i]);
        maxRow = k;
      }
    }

    // Swap maximum row with current row
    if (maxRow !== i) {
      const tempRow = a[i];
      a[i] = a[maxRow];
      a[maxRow] = tempRow;

      const tempVal = b[i];
      b[i] = b[maxRow];
      b[maxRow] = tempVal;
    }

    // Check if the matrix is singular
    if (Math.abs(a[i][i]) < 1e-10) {
      return null;
    }

    // Eliminate entries below pivot
    for (let k = i + 1; k < n; k++) {
      const c = -a[k][i] / a[i][i];
      for (let j = i; j < n; j++) {
        if (i === j) {
          a[k][j] = 0;
        } else {
          a[k][j] += c * a[i][j];
        }
      }
      b[k] += c * b[i];
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = b[i] / a[i][i];
    for (let k = i - 1; k >= 0; k--) {
      b[k] -= a[k][i] * x[i];
    }
  }

  return x;
}

/**
 * Computes the 3x3 homography matrix coefficients that map:
 *   (u, v) in destination coordinate space [0, W] x [0, H]
 *   to (x, y) in source coordinate space [x_i, y_i]
 *
 * Destination rectangle points:
 *   D0: (0, 0)       --> P0: (srcPoints[0].x, srcPoints[0].y)  [Top-Left]
 *   D1: (W, 0)       --> P1: (srcPoints[1].x, srcPoints[1].y)  [Top-Right]
 *   D2: (W, H)       --> P2: (srcPoints[2].x, srcPoints[2].y)  [Bottom-Right]
 *   D3: (0, H)       --> P3: (srcPoints[3].x, srcPoints[3].y)  [Bottom-Left]
 *
 * Using reverse mapping (Dest -> Source) so we don't have "holes" in the output.
 */
export function getHomographyMatrix(
  srcPoints: Point[],
  destWidth: number,
  destHeight: number
): number[] | null {
  // We need to map (u_i, v_i) -> (x_i, y_i)
  // Equations:
  // u_i * a + v_i * b + c - u_i * x_i * g - v_i * x_i * h = x_i
  // u_i * d + v_i * e + f - u_i * y_i * g - v_i * y_i * h = y_i

  const destPoints = [
    { x: 0, y: 0 }, // Top-Left (D0)
    { x: destWidth, y: 0 }, // Top-Right (D1)
    { x: destWidth, y: destHeight }, // Bottom-Right (D2)
    { x: 0, y: destHeight }, // Bottom-Left (D3)
  ];

  const A: number[][] = [];
  const B: number[] = [];

  for (let i = 0; i < 4; i++) {
    const u = destPoints[i].x;
    const v = destPoints[i].y;
    const x = srcPoints[i].x;
    const y = srcPoints[i].y;

    // Row for x-mapping
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]);
    B.push(x);

    // Row for y-mapping
    A.push([0, 0, 0, u, v, 1, -u * y, -v * y]);
    B.push(y);
  }

  // Solution is [a, b, c, d, e, f, g, h]
  return solveLinearSystem(A, B);
}

/**
 * Performs bilinear interpolation to sample a color at a fractional pixel coordinate (x, y)
 * from a source ImageData buffer.
 */
function sampleBilinear(
  srcData: ImageData,
  x: number,
  y: number
): [number, number, number, number] {
  const width = srcData.width;
  const height = srcData.height;
  const pixels = srcData.data;

  const x0 = Math.floor(x);
  const x1 = x0 + 1;
  const y0 = Math.floor(y);
  const y1 = y0 + 1;

  const tx = x - x0;
  const ty = y - y0;

  // Clamp source coordinates to edge pixels to prevent boundary artifacts
  const cx0 = Math.max(0, Math.min(width - 1, x0));
  const cx1 = Math.max(0, Math.min(width - 1, x1));
  const cy0 = Math.max(0, Math.min(height - 1, y0));
  const cy1 = Math.max(0, Math.min(height - 1, y1));

  // Surrounding pixel index offsets
  const i00 = (cy0 * width + cx0) * 4;
  const i10 = (cy0 * width + cx1) * 4;
  const i01 = (cy1 * width + cx0) * 4;
  const i11 = (cy1 * width + cx1) * 4;

  const r00 = pixels[i00], g00 = pixels[i00 + 1], b00 = pixels[i00 + 2], a00 = pixels[i00 + 3];
  const r10 = pixels[i10], g10 = pixels[i10 + 1], b10 = pixels[i10 + 2], a10 = pixels[i10 + 3];
  const r01 = pixels[i01], g01 = pixels[i01 + 1], b01 = pixels[i01 + 2], a01 = pixels[i01 + 3];
  const r11 = pixels[i11], g11 = pixels[i11 + 1], b11 = pixels[i11 + 2], a11 = pixels[i11 + 3];

  // Perform interpolation
  const r = (1 - tx) * (1 - ty) * r00 + tx * (1 - ty) * r10 + (1 - tx) * ty * r01 + tx * ty * r11;
  const g = (1 - tx) * (1 - ty) * g00 + tx * (1 - ty) * g10 + (1 - tx) * ty * g01 + tx * ty * g11;
  const b = (1 - tx) * (1 - ty) * b00 + tx * (1 - ty) * b10 + (1 - tx) * ty * b01 + tx * ty * b11;
  const a = (1 - tx) * (1 - ty) * a00 + tx * (1 - ty) * a10 + (1 - tx) * ty * a01 + tx * ty * a11;

  return [Math.round(r), Math.round(g), Math.round(b), Math.round(a)];
}

/**
 * Warps a source ImageData using perspective transform defined by 4 source points.
 * Outputs a new ImageData of size destWidth x destHeight.
 */
export function warpPerspective(
  srcData: ImageData,
  srcPoints: Point[],
  destWidth: number,
  destHeight: number
): ImageData | null {
  const homography = getHomographyMatrix(srcPoints, destWidth, destHeight);
  if (!homography) {
    return null;
  }

  const [a, b, c, d, e, f, g, h] = homography;
  const outputData = new ImageData(destWidth, destHeight);
  const outPixels = outputData.data;

  const srcWidth = srcData.width;
  const srcHeight = srcData.height;

  for (let v = 0; v < destHeight; v++) {
    const rowOffset = v * destWidth * 4;
    for (let u = 0; u < destWidth; u++) {
      // Denominator in projective division
      const denom = g * u + h * v + 1;
      
      // Target coordinates in source space
      const x = (a * u + b * v + c) / denom;
      const y = (d * u + e * v + f) / denom;

      // Sample source pixel if inside or reasonably near boundary (clamping handles coordinates)
      const pixelOffset = rowOffset + u * 4;
      if (x >= -1 && x <= srcWidth && y >= -1 && y <= srcHeight) {
        const [r, g, bVal, alpha] = sampleBilinear(srcData, x, y);
        outPixels[pixelOffset] = r;
        outPixels[pixelOffset + 1] = g;
        outPixels[pixelOffset + 2] = bVal;
        outPixels[pixelOffset + 3] = alpha;
      } else {
        // Transparent out of bounds
        outPixels[pixelOffset] = 0;
        outPixels[pixelOffset + 1] = 0;
        outPixels[pixelOffset + 2] = 0;
        outPixels[pixelOffset + 3] = 0;
      }
    }
  }

  return outputData;
}
