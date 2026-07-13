import React, { useState, useRef, useEffect } from "react";
import { Point, ImageInfo } from "../types";
import { warpPerspective } from "../utils/matrix";
import { Maximize2, Crop, RotateCcw, RotateCw, FlipHorizontal, Sliders } from "lucide-react";

interface WarpCanvasProps {
  imageInfo: ImageInfo;
  cropMode: "perspective" | "normal";
  rotationAngle: number;
  flipH: boolean;
  flipV: boolean;
  onApplyWarp: (newUrl: string, width: number, height: number) => void;
  isWarping: boolean;
  setIsWarping: (val: boolean) => void;
  executeTriggerRef?: React.MutableRefObject<(() => void) | null>;
}

export default function WarpCanvas({
  imageInfo,
  cropMode,
  rotationAngle,
  flipH,
  flipV,
  onApplyWarp,
  isWarping,
  setIsWarping,
  executeTriggerRef,
}: WarpCanvasProps) {
  // Draggable corners in relative coordinates [0, 1]
  const [corners, setCorners] = useState<Point[]>([
    { x: 0, y: 0 }, // Top-Left
    { x: 1, y: 0 }, // Top-Right
    { x: 1, y: 1 }, // Bottom-Right
    { x: 0, y: 1 }, // Bottom-Left
  ]);

  const [activeCorner, setActiveCorner] = useState<number | "frame" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragStartPos = useRef<Point>({ x: 0, y: 0 });
  const dragStartCorners = useRef<Point[]>([]);

  // Magnifier glass parameters
  const [magnifierCoords, setMagnifierCoords] = useState<Point | null>(null);
  const [magnifierStyle, setMagnifierStyle] = useState<React.CSSProperties>({});
  const lensCanvasRef = useRef<HTMLCanvasElement>(null);

  // Keep display dimensions
  const [displayDim, setDisplayDim] = useState({ width: 400, height: 300 });
  const [resizeTrigger, setResizeTrigger] = useState(0);

  // Reset handles when image changes or crop mode toggles
  useEffect(() => {
    setCorners([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ]);
  }, [imageInfo.dataUrl, cropMode]);

  // Observe container size changes using ResizeObserver to handle resizes instantly
  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return;

    const observer = new ResizeObserver(() => {
      setResizeTrigger((prev) => prev + 1);
    });

    observer.observe(parent);
    return () => {
      observer.disconnect();
    };
  }, []);

  // Handle free-rotation or flip change -> redraw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageInfo.dataUrl;
    img.onload = () => {
      // Fit image dimensions into display bounds
      const parent = containerRef.current;
      if (!parent) return;
      const maxW = parent.clientWidth - 48;
      const maxH = parent.clientHeight - 130;

      let w = imageInfo.width || 800;
      let h = imageInfo.height || 600;

      const scale = Math.min(maxW / w, maxH / h);
      if (scale < 1) {
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }

      canvas.width = w;
      canvas.height = h;
      setDisplayDim({ width: w, height: h });

      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate((rotationAngle * Math.PI) / 180);

      const scaleX_draw = flipH ? -1 : 1;
      const scaleY_draw = flipV ? -1 : 1;
      ctx.scale(scaleX_draw, scaleY_draw);

      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    };
  }, [imageInfo.dataUrl, rotationAngle, flipH, flipV, imageInfo.width, imageInfo.height, resizeTrigger]);

  // Drag handles management
  const handlePointerDown = (e: React.PointerEvent, index: number | "frame") => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    setActiveCorner(index);
    dragStartPos.current = { x: clientX / rect.width, y: clientY / rect.height };
    dragStartCorners.current = corners.map((c) => ({ ...c }));

    if (typeof index === "number") {
      updateMagnifier(clientX, clientY, index);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (activeCorner === null) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Relative mouse drag
    const relX = Math.max(0, Math.min(1, clientX / rect.width));
    const relY = Math.max(0, Math.min(1, clientY / rect.height));

    const updated = [...corners];

    if (activeCorner === "frame") {
      const dx = relX - dragStartPos.current.x;
      const dy = relY - dragStartPos.current.y;

      let canMove = true;
      const temp = dragStartCorners.current.map((c) => {
        const nx = c.x + dx;
        const ny = c.y + dy;
        if (nx < 0 || nx > 1 || ny < 0 || ny > 1) {
          canMove = false;
        }
        return { x: nx, y: ny };
      });

      if (canMove) {
        setCorners(temp);
      }
    } else {
      if (cropMode === "normal") {
        const idx = activeCorner as number;
        const dx = relX - dragStartCorners.current[idx].x;
        const dy = relY - dragStartCorners.current[idx].y;

        updated[idx] = { x: relX, y: relY };

        if (idx === 0) {
          // Top-Left
          updated[1].y = relY; // Top-Right y
          updated[3].x = relX; // Bottom-Left x
        } else if (idx === 1) {
          // Top-Right
          updated[0].y = relY; // Top-Left y
          updated[2].x = relX; // Bottom-Right x
        } else if (idx === 2) {
          // Bottom-Right
          updated[1].x = relX; // Top-Right x
          updated[3].y = relY; // Bottom-Left y
        } else if (idx === 3) {
          // Bottom-Left
          updated[0].x = relX; // Top-Left x
          updated[2].y = relY; // Bottom-Right y
        }

        // Cross-over prevention
        if (updated[0].x >= updated[1].x) {
          updated[0].x = updated[1].x - 0.01;
          updated[3].x = updated[0].x;
        }
        if (updated[0].y >= updated[3].y) {
          updated[0].y = updated[3].y - 0.01;
          updated[1].y = updated[0].y;
        }
        if (updated[1].x <= updated[0].x) {
          updated[1].x = updated[0].x + 0.01;
          updated[2].x = updated[1].x;
        }
        if (updated[1].y >= updated[2].y) {
          updated[1].y = updated[2].y - 0.01;
          updated[0].y = updated[1].y;
        }
        if (updated[2].x <= updated[3].x) {
          updated[2].x = updated[3].x + 0.01;
          updated[1].x = updated[2].x;
        }
        if (updated[2].y <= updated[1].y) {
          updated[2].y = updated[1].y + 0.01;
          updated[3].y = updated[2].y;
        }
        if (updated[3].x >= updated[2].x) {
          updated[3].x = updated[2].x - 0.01;
          updated[0].x = updated[3].x;
        }
        if (updated[3].y <= updated[0].y) {
          updated[3].y = updated[0].y + 0.01;
          updated[2].y = updated[3].y;
        }

        setCorners(updated);
      } else {
        // Perspective free corners
        updated[activeCorner as number] = { x: relX, y: relY };
        setCorners(updated);
      }

      updateMagnifier(clientX, clientY, activeCorner as number);
    }
  };

  const handlePointerUp = () => {
    setActiveCorner(null);
    setMagnifierCoords(null);
  };

  const updateMagnifier = (clientX: number, clientY: number, idx: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Original pixels mapping
    const origX = Math.round(corners[idx].x * imageInfo.width);
    const origY = Math.round(corners[idx].y * imageInfo.height);
    setMagnifierCoords({ x: origX, y: origY });

    // Placement coordinates
    setMagnifierStyle({
      left: `${clientX}px`,
      top: `${clientY - 90}px`,
      transform: "translateX(-50%)",
      display: "block",
    });

    const lensCanvas = lensCanvasRef.current;
    if (!lensCanvas) return;
    const lctx = lensCanvas.getContext("2d");
    if (!lctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageInfo.dataUrl;
    img.onload = () => {
      lctx.clearRect(0, 0, lensCanvas.width, lensCanvas.height);
      lctx.imageSmoothingEnabled = false;

      const zoomSize = 40; // Original sample window
      lctx.drawImage(
        img,
        origX - zoomSize / 2,
        origY - zoomSize / 2,
        zoomSize,
        zoomSize,
        0,
        0,
        lensCanvas.width,
        lensCanvas.height
      );

      // Draw crosshair
      lctx.strokeStyle = "#4f46ed";
      lctx.lineWidth = 1.5;
      lctx.beginPath();
      lctx.moveTo(lensCanvas.width / 2, 0);
      lctx.lineTo(lensCanvas.width / 2, lensCanvas.height);
      lctx.moveTo(0, lensCanvas.height / 2);
      lctx.lineTo(lensCanvas.width, lensCanvas.height / 2);
      lctx.stroke();
    };
  };

  // Perform Perspective Homography or Rectangular crop
  const executeCrop = () => {
    if (isWarping) return;
    setIsWarping(true);

    setTimeout(() => {
      try {
        const offscreen = document.createElement("canvas");
        offscreen.width = displayDim.width;
        offscreen.height = displayDim.height;
        const octx = offscreen.getContext("2d");
        if (!octx) throw new Error("Could not construct canvas 2D");

        // First bake rotation and flips on the display dimensions
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imageInfo.dataUrl;
        img.onload = () => {
          octx.translate(displayDim.width / 2, displayDim.height / 2);
          octx.rotate((rotationAngle * Math.PI) / 180);
          const scaleX_draw = flipH ? -1 : 1;
          const scaleY_draw = flipV ? -1 : 1;
          octx.scale(scaleX_draw, scaleY_draw);
          octx.drawImage(img, -displayDim.width / 2, -displayDim.height / 2, displayDim.width, displayDim.height);

          // Get exact pixel data of the rotated and scaled visual canvas
          const srcImageData = octx.getImageData(0, 0, displayDim.width, displayDim.height);

          // Target output dimensions mapping
          let outWidth = 0;
          let outHeight = 0;

          if (cropMode === "normal") {
            const sx = Math.round(corners[0].x * displayDim.width);
            const sy = Math.round(corners[0].y * displayDim.height);
            const sw = Math.round((corners[1].x - corners[0].x) * displayDim.width);
            const sh = Math.round((corners[3].y - corners[0].y) * displayDim.height);

            // Back scale to original
            const aspectX = imageInfo.width / displayDim.width;
            const aspectY = imageInfo.height / displayDim.height;

            outWidth = Math.round(sw * aspectX);
            outHeight = Math.round(sh * aspectY);

            const croppedCanvas = document.createElement("canvas");
            croppedCanvas.width = sw;
            croppedCanvas.height = sh;
            const cctx = croppedCanvas.getContext("2d");
            if (cctx) {
              cctx.putImageData(srcImageData, -sx, -sy);
              
              // Scale to original size so resolution is fully preserved
              const finalCanvas = document.createElement("canvas");
              finalCanvas.width = outWidth;
              finalCanvas.height = outHeight;
              const fctx = finalCanvas.getContext("2d");
              if (fctx) {
                fctx.drawImage(croppedCanvas, 0, 0, sw, sh, 0, 0, outWidth, outHeight);
                onApplyWarp(finalCanvas.toDataURL("image/png"), outWidth, outHeight);
              }
            }
          } else {
            // Perspective transform
            // Pixel coordinates in Display Space
            const displayPoints = corners.map((c) => ({
              x: c.x * displayDim.width,
              y: c.y * displayDim.height,
            }));

            // Display lengths
            const w1 = Math.hypot(displayPoints[1].x - displayPoints[0].x, displayPoints[1].y - displayPoints[0].y);
            const w2 = Math.hypot(displayPoints[2].x - displayPoints[3].x, displayPoints[2].y - displayPoints[3].y);
            const dispW = Math.max(w1, w2);

            const h1 = Math.hypot(displayPoints[3].x - displayPoints[0].x, displayPoints[3].y - displayPoints[0].y);
            const h2 = Math.hypot(displayPoints[2].x - displayPoints[1].x, displayPoints[2].y - displayPoints[1].y);
            const dispH = Math.max(h1, h2);

            // Preserve full original scale
            const avgScale = (imageInfo.width / displayDim.width + imageInfo.height / displayDim.height) / 2;
            outWidth = Math.round(dispW * avgScale);
            outHeight = Math.round(dispH * avgScale);

            if (outWidth <= 0) outWidth = 100;
            if (outHeight <= 0) outHeight = 100;

            const warpedData = warpPerspective(srcImageData, displayPoints, Math.round(dispW), Math.round(dispH));
            if (warpedData) {
              const tempWarpedCanvas = document.createElement("canvas");
              tempWarpedCanvas.width = Math.round(dispW);
              tempWarpedCanvas.height = Math.round(dispH);
              tempWarpedCanvas.getContext("2d")?.putImageData(warpedData, 0, 0);

              // Scale to full original density resolution
              const finalCanvas = document.createElement("canvas");
              finalCanvas.width = outWidth;
              finalCanvas.height = outHeight;
              const fctx = finalCanvas.getContext("2d");
              if (fctx) {
                fctx.drawImage(tempWarpedCanvas, 0, 0, Math.round(dispW), Math.round(dispH), 0, 0, outWidth, outHeight);
                onApplyWarp(finalCanvas.toDataURL("image/png"), outWidth, outHeight);
              }
            }
          }
        };
      } catch (e) {
        console.error(e);
        alert("An error occurred during cropping/perspective warp computation.");
      } finally {
        setIsWarping(false);
      }
    }, 100);
  };

  useEffect(() => {
    if (executeTriggerRef) {
      executeTriggerRef.current = executeCrop;
    }
    return () => {
      if (executeTriggerRef) {
        executeTriggerRef.current = null;
      }
    };
  });

  // Convert points string to standard polygon svg list
  const polyPointsString = corners
    .map((c) => `${c.x * displayDim.width},${c.y * displayDim.height}`)
    .join(" ");

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900/40 relative" id="crop-workspace-block">
      {/* Interactive canvas stage */}
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="flex-1 relative flex items-center justify-center p-6 select-none overflow-visible"
        style={{ touchAction: "none" }}
        id="warp-canvas-viewport"
      >
        {/* Dynamic Interactive Overlays container */}
        <div
          className="relative shadow-2xl rounded-sm border border-slate-700/40 overflow-visible"
          style={{ width: `${displayDim.width}px`, height: `${displayDim.height}px` }}
          id="canvas-overlays-group"
        >
          {/* Floating Magnifying Lens */}
          {magnifierCoords && (
            <div
              className="absolute pointer-events-none z-50 flex flex-col items-center"
              style={magnifierStyle}
              id="lens-float-overlay"
            >
              <div className="w-20 h-20 rounded-full border-2 border-white shadow-xl overflow-hidden bg-slate-950">
                <canvas
                  ref={lensCanvasRef}
                  width={80}
                  height={80}
                  className="w-full h-full block"
                />
              </div>
              <div className="mt-1 px-1.5 py-0.5 bg-slate-900/90 border border-slate-800 rounded text-[9px] font-mono text-slate-300 shadow">
                x: {magnifierCoords.x}, y: {magnifierCoords.y}
              </div>
            </div>
          )}

          {/* Main Display Canvas */}
          <canvas ref={canvasRef} className="block w-full h-full" id="canvas-main-viewer" />

          {/* SVG Crop polygon guides */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            viewBox={`0 0 ${displayDim.width} ${displayDim.height}`}
            id="guides-svg-mask"
          >
            {/* Overlay background mask with a hole */}
            <path
              d={`M 0,0 L ${displayDim.width},0 L ${displayDim.width},${displayDim.height} L 0,${displayDim.height} Z 
                  M ${corners[0].x * displayDim.width},${corners[0].y * displayDim.height} 
                  L ${corners[3].x * displayDim.width},${corners[3].y * displayDim.height} 
                  L ${corners[2].x * displayDim.width},${corners[2].y * displayDim.height} 
                  L ${corners[1].x * displayDim.width},${corners[1].y * displayDim.height} Z`}
              fill="rgba(15, 23, 42, 0.45)"
              fillRule="evenodd"
              id="svg-hollow-mask"
            />

            {/* Polygon connecting line */}
            <polygon
              points={polyPointsString}
              fill="rgba(59, 130, 246, 0.1)"
              stroke="#3b82f6"
              strokeWidth="2.5"
              strokeDasharray="4 4"
              id="svg-selected-boundary"
            />
          </svg>

          {/* Draggable handles rendered on top */}
          <div className="absolute inset-0 z-20 pointer-events-none" id="handles-hitboxes">
            {corners.map((c, idx) => {
              const label = ["TL", "TR", "BR", "BL"][idx];
              return (
                <div
                  key={idx}
                  onPointerDown={(e) => handlePointerDown(e, idx)}
                  className="absolute w-8 h-8 -ml-4 -mt-4 flex items-center justify-center cursor-grab active:cursor-grabbing pointer-events-auto group"
                  style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%` }}
                  id={`handle-point-${idx}`}
                >
                  <div className="w-5 h-5 rounded-full bg-[#3b82f6] border-2 border-white shadow-lg flex items-center justify-center transition-all group-hover:scale-110 active:scale-125">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                  <span className="absolute top-6 px-1 rounded bg-slate-950 text-[8px] font-bold text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase">
                    {label}
                  </span>
                </div>
              );
            })}

            {/* Inner drag handle for panning the entire selection frame */}
            <div
              onPointerDown={(e) => handlePointerDown(e, "frame")}
              className="absolute pointer-events-auto cursor-move"
              style={{
                left: `${((corners[0].x + corners[2].x) / 2) * 100}%`,
                top: `${((corners[0].y + corners[2].y) / 2) * 100}%`,
                transform: "translate(-50%, -50%)",
              }}
              title="Drag entire frame"
              id="frame-move-hitbox"
            >
              <div className="w-7 h-7 rounded-full bg-slate-900/90 border border-slate-700 text-slate-300 flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform">
                <Maximize2 className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive execution prompt block if warping is long */}
      {isWarping && (
        <div className="absolute inset-0 bg-slate-950/70 z-50 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-slate-800 border-t-indigo-500 animate-spin" />
          <span className="text-sm font-semibold text-slate-200">Executing high-fidelity transform...</span>
        </div>
      )}
    </div>
  );
}
