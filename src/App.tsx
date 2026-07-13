/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { ImageInfo } from "./types";
import WarpCanvas from "./components/WarpCanvas";
import { 
  Upload, 
  Sparkles, 
  Trash2, 
  FileImage, 
  Maximize2,
  Crop,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  Link,
  Download,
  Sliders,
  Menu,
  Settings,
  X
} from "lucide-react";

// Generate a high-quality sample skewed receipt on a table for instant testing
function generateSampleSkewedImage(): ImageInfo {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not construct 2D context");
  }

  // 1. Dark table surface background
  ctx.fillStyle = "#0b0f19"; 
  ctx.fillRect(0, 0, 800, 600);

  // Table grain lines
  ctx.strokeStyle = "#151e33";
  ctx.lineWidth = 1.5;
  for (let i = -600; i < 800; i += 70) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 600, 600);
    ctx.stroke();
  }

  // 2. Skewed Paper Document (Paper sheet on the table)
  // Let's specify 4 distinct skewed corners
  // TL: (170, 90), TR: (590, 150), BR: (510, 520), BL: (110, 440)
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 8;
  ctx.shadowOffsetY = 12;

  ctx.beginPath();
  ctx.moveTo(170, 90);
  ctx.lineTo(590, 150);
  ctx.lineTo(510, 520);
  ctx.lineTo(110, 440);
  ctx.closePath();
  ctx.fill();

  // Reset shadow for drawing content
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Save state, translate & rotate context to draw items perfectly aligned to the skewed paper
  ctx.save();
  ctx.translate(345, 305); // Approximate center of paper
  ctx.rotate(0.141); // ~8.1 degrees tilt

  // Draw simulated document content
  ctx.fillStyle = "#1e293b";
  ctx.textAlign = "center";

  // Receipt Logo Header
  ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
  ctx.fillText("AI STUDIO CAFE", 0, -125);

  ctx.font = "10px monospace";
  ctx.fillStyle = "#64748b";
  ctx.fillText("TRANSACTION RECEIPT", 0, -105);
  ctx.fillText("STORE #5422 • SILICON VALLEY, CA", 0, -92);

  // Divider line
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-140, -80);
  ctx.lineTo(140, -80);
  ctx.stroke();

  // Table header
  ctx.fillStyle = "#1e293b";
  ctx.font = "bold 11px monospace";
  ctx.textAlign = "left";
  ctx.fillText("ITEM DESCRIPTION", -140, -62);
  ctx.textAlign = "right";
  ctx.fillText("TOTAL", 140, -62);

  // Thin separator
  ctx.strokeStyle = "#e2e8f0";
  ctx.beginPath();
  ctx.moveTo(-140, -54);
  ctx.lineTo(140, -54);
  ctx.stroke();

  // Purchased items list
  ctx.font = "11px monospace";
  ctx.fillStyle = "#334155";
  const coffeeItems = [
    { desc: "1x Double-Shot Mocha Latte", price: "$6.50" },
    { desc: "2x Fresh Blueberry Scones", price: "$9.00" },
    { desc: "1x Organic Matcha Latte", price: "$5.75" },
    { desc: "1x Sparkling Mineral Water", price: "$3.25" }
  ];

  let y = -36;
  coffeeItems.forEach((item) => {
    ctx.textAlign = "left";
    ctx.fillText(item.desc, -140, y);
    ctx.textAlign = "right";
    ctx.fillText(item.price, 140, y);
    y += 18;
  });

  // Separation divider
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-140, y + 2);
  ctx.lineTo(140, y + 2);
  ctx.stroke();

  // Totals calculations
  ctx.fillStyle = "#1e293b";
  ctx.font = "bold 11px monospace";
  ctx.textAlign = "left";
  ctx.fillText("SUBTOTAL", -140, y + 20);
  ctx.textAlign = "right";
  ctx.fillText("$24.50", 140, y + 20);

  ctx.textAlign = "left";
  ctx.fillText("SALES TAX (8.25%)", -140, y + 35);
  ctx.textAlign = "right";
  ctx.fillText("$2.02", 140, y + 35);

  ctx.font = "bold 14px monospace";
  ctx.textAlign = "left";
  ctx.fillText("TOTAL AMOUNT", -140, y + 58);
  ctx.textAlign = "right";
  ctx.fillText("$26.52", 140, y + 58);

  // Generate fake barcode graphics
  ctx.fillStyle = "#0f172a";
  const bx = -100;
  const by = y + 78;
  const bw = 200;
  const bh = 32;

  let currentX = bx;
  while (currentX < bx + bw) {
    const width = Math.random() > 0.4 ? (Math.random() > 0.6 ? 4 : 2) : 1;
    ctx.fillRect(currentX, by, width, bh);
    currentX += width + (Math.random() > 0.5 ? 2 : 1);
  }

  // Barcode numbers
  ctx.textAlign = "center";
  ctx.font = "9px monospace";
  ctx.fillStyle = "#64748b";
  ctx.fillText("* 0D6A5CBC1400 *", 0, by + bh + 12);

  ctx.restore();

  const dataUrl = canvas.toDataURL("image/jpeg");
  return {
    dataUrl,
    width: 800,
    height: 600,
    name: "sample_skewed_receipt.jpg",
    size: Math.round((dataUrl.length * 3) / 4), // rough approximation of base64 to byte size
    type: "image/jpeg"
  };
}

interface LoadedImageItem extends ImageInfo {
  id: string;
}

export default function App() {
  const [loadedImages, setLoadedImages] = useState<LoadedImageItem[]>([]);
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  const [cropMode, setCropMode] = useState<"perspective" | "normal">("perspective");
  
  // Rotations & Flips (temporary state before clicking Apply)
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);
  
  // Right Settings Panel state
  const [aspectRatioLock, setAspectRatioLock] = useState<boolean>(true);
  const [outWidth, setOutWidth] = useState<string>("");
  const [outHeight, setOutHeight] = useState<string>("");
  const [format, setFormat] = useState<string>("image/jpeg");
  const [quality, setQuality] = useState<number>(100);
  const [estimatedSize, setEstimatedSize] = useState<string>("-- KB");
  const [targetSizeEnabled, setTargetSizeEnabled] = useState<boolean>(false);
  const [targetSizeValue, setTargetSizeValue] = useState<string>("");
  const [targetSizeUnit, setTargetSizeUnit] = useState<"KB" | "MB">("KB");
  const [isFitting, setIsFitting] = useState<boolean>(false);
  const [isWarping, setIsWarping] = useState<boolean>(false);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [showImageList, setShowImageList] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [leftWidth, setLeftWidth] = useState<number>(256);
  const [rightWidth, setRightWidth] = useState<number>(320);
  const [isDesktop, setIsDesktop] = useState<boolean>(false);

  useEffect(() => {
    const checkSize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, []);

  const startResize = (mouseDownEvent: React.MouseEvent<HTMLDivElement>, direction: "left" | "right") => {
    mouseDownEvent.preventDefault();
    const startX = mouseDownEvent.clientX;
    const startWidth = direction === "left" ? leftWidth : rightWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      if (direction === "left") {
        const newWidth = Math.max(180, Math.min(400, startWidth + deltaX));
        setLeftWidth(newWidth);
      } else {
        const newWidth = Math.max(240, Math.min(450, startWidth - deltaX));
        setRightWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sidebarFileInputRef = useRef<HTMLInputElement>(null);
  const executeTriggerRef = useRef<(() => void) | null>(null);

  const activeImage = loadedImages.find((img) => img.id === activeImageId) || null;

  // Start with clean list by default as requested by user
  useEffect(() => {
    // Starts empty
  }, []);

  // Update output size inputs whenever active image or its aspect ratio changes
  useEffect(() => {
    if (activeImage) {
      setOutWidth(Math.round(activeImage.width).toString());
      setOutHeight(Math.round(activeImage.height).toString());
    } else {
      setOutWidth("");
      setOutHeight("");
    }
  }, [activeImage?.dataUrl, activeImage?.width, activeImage?.height]);

  // Estimate output file size debounced
  useEffect(() => {
    if (!activeImage) {
      setEstimatedSize("-- KB");
      return;
    }

    const timer = setTimeout(() => {
      try {
        const outW = parseInt(outWidth) || activeImage.width;
        const outH = parseInt(outHeight) || activeImage.height;

        const outCanvas = document.createElement("canvas");
        outCanvas.width = outW;
        outCanvas.height = outH;
        const ctxOut = outCanvas.getContext("2d");
        if (!ctxOut) return;

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = activeImage.dataUrl;
        img.onload = () => {
          ctxOut.drawImage(img, 0, 0, outW, outH);
          outCanvas.toBlob(
            (blob) => {
              if (blob) {
                const sizeKB = (blob.size / 1024).toFixed(1);
                let sizeText = sizeKB + " KB";
                if (blob.size > 1024 * 1024) {
                  sizeText = (blob.size / (1024 * 1024)).toFixed(2) + " MB";
                }
                setEstimatedSize(sizeText);
              }
            },
            format,
            format === "image/png" ? undefined : quality / 100
          );
        };
      } catch (err) {
        console.error("Size estimation error: ", err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [activeImage?.dataUrl, outWidth, outHeight, format, quality]);

  // Handlers for manual files upload
  const handleFilesAdded = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    let count = 0;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;

      const id = "img_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      const reader = new FileReader();

      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
          const item: LoadedImageItem = {
            id,
            dataUrl,
            width: img.naturalWidth,
            height: img.naturalHeight,
            name: file.name,
            size: file.size,
            type: file.type,
          };
          
          setLoadedImages((prev) => {
            const next = [...prev, item];
            // Activate the first added image from this batch
            if (count === 0) {
              setActiveImageId(id);
            }
            count++;
            return next;
          });
        };
      };
      reader.readAsDataURL(file);
    });
  };

  // Drag handshakes
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleRemoveImage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const nextImages = loadedImages.filter((img) => img.id !== id);
    setLoadedImages(nextImages);

    if (activeImageId === id) {
      if (nextImages.length > 0) {
        setActiveImageId(nextImages[0].id);
      } else {
        setActiveImageId(null);
      }
    }
  };

  // Dimensions inputs changes with aspect-ratio locked calculation
  const handleWidthChange = (val: string) => {
    setOutWidth(val);
    const parsedWidth = parseInt(val);
    if (aspectRatioLock && activeImage && parsedWidth > 0) {
      const ratio = activeImage.height / activeImage.width;
      setOutHeight(Math.round(parsedWidth * ratio).toString());
    }
  };

  const handleHeightChange = (val: string) => {
    setOutHeight(val);
    const parsedHeight = parseInt(val);
    if (aspectRatioLock && activeImage && parsedHeight > 0) {
      const ratio = activeImage.width / activeImage.height;
      setOutWidth(Math.round(parsedHeight * ratio).toString());
    }
  };

  // Bake perspective crop or normal crop onto image info list
  const handleWarpApplied = (newDataUrl: string, width: number, height: number) => {
    if (!activeImageId) return;

    // Estimate size of newly warped image
    const approxSize = Math.round((newDataUrl.length * 3) / 4);

    setLoadedImages((prev) =>
      prev.map((img) =>
        img.id === activeImageId
          ? {
              ...img,
              dataUrl: newDataUrl,
              width,
              height,
              size: approxSize,
            }
          : img
      )
    );

    // Reset temporary tools rotation & flips upon warp baked application!
    setRotationAngle(0);
    setFlipH(false);
    setFlipV(false);
  };

  // Helper to get blob size for a specific quality
  const getBlobSize = (canvas: HTMLCanvasElement, qualityVal: number, mimeType: string): Promise<number> => {
    return new Promise((resolve) => {
      if (mimeType === "image/png") {
        canvas.toBlob((blob) => {
          resolve(blob ? blob.size : 0);
        }, mimeType);
      } else {
        canvas.toBlob((blob) => {
          resolve(blob ? blob.size : 0);
        }, mimeType, qualityVal / 100);
      }
    });
  };

  // Find optimal quality to fit image into a target file size
  const fitQualityToTargetSize = async () => {
    if (!activeImage) return;
    const targetNum = parseFloat(targetSizeValue);
    if (isNaN(targetNum) || targetNum <= 0) return;

    setIsFitting(true);
    try {
      const targetBytes = targetNum * (targetSizeUnit === "MB" ? 1024 * 1024 : 1024);
      const outW = parseInt(outWidth) || activeImage.width;
      const outH = parseInt(outHeight) || activeImage.height;

      const outCanvas = document.createElement("canvas");
      outCanvas.width = outW;
      outCanvas.height = outH;
      const ctxOut = outCanvas.getContext("2d");
      if (!ctxOut) return;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = activeImage.dataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      ctxOut.drawImage(img, 0, 0, outW, outH);

      if (format === "image/png") {
        setIsFitting(false);
        return;
      }

      // Binary search for quality (1 to 100)
      let low = 1;
      let high = 100;
      let bestQuality = 100;

      for (let i = 0; i < 8; i++) {
        const mid = Math.round((low + high) / 2);
        const size = await getBlobSize(outCanvas, mid, format);

        if (size <= targetBytes) {
          bestQuality = mid;
          low = mid + 1; // Try to get higher quality while staying under target size
        } else {
          high = mid - 1; // Size is too big, must reduce quality
        }
      }

      setQuality(bestQuality);
    } catch (err) {
      console.error("Error auto-fitting quality to size: ", err);
    } finally {
      setIsFitting(false);
    }
  };

  // Export & Download high resolution image
  const handleSaveImage = () => {
    if (!activeImage) return;

    const outW = parseInt(outWidth) || activeImage.width;
    const outH = parseInt(outHeight) || activeImage.height;

    const outCanvas = document.createElement("canvas");
    outCanvas.width = outW;
    outCanvas.height = outH;
    const ctxOut = outCanvas.getContext("2d");
    if (!ctxOut) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = activeImage.dataUrl;
    img.onload = () => {
      ctxOut.drawImage(img, 0, 0, outW, outH);
      const ext = format === "image/png" ? "png" : format === "image/webp" ? "webp" : "jpg";
      const baseName = activeImage.name.replace(/\.[^/.]+$/, "") + "_edited";

      const link = document.createElement("a");
      link.download = `${baseName}.${ext}`;
      link.href = outCanvas.toDataURL(format, format === "image/png" ? undefined : quality / 100);
      link.click();
    };
  };

  return (
    <div className="min-h-screen w-screen bg-[#0f172a] text-slate-100 font-sans flex items-center justify-center p-0 md:p-4 lg:p-6" id="app-wrapper-frame">
      <main className="w-full max-w-7xl h-screen md:h-[92vh] flex bg-[#1e293b]/70 backdrop-blur-xl border border-white/10 rounded-none md:rounded-3xl shadow-2xl overflow-hidden relative" id="app-container">
        
        {/* Responsive Backdrop */}
        {(showImageList || showSettings) && (
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-xs z-20 lg:hidden cursor-pointer"
            onClick={() => {
              setShowImageList(false);
              setShowSettings(false);
            }}
            id="responsive-backdrop"
          />
        )}

        {/* IMAGE LIST SIDEBAR (LEFT) */}
        <aside 
          className={`absolute inset-y-0 left-0 z-30 w-64 border-r lg:border-r-0 border-white/10 bg-[#151f32]/95 lg:bg-black/20 backdrop-blur-xl flex flex-col shrink-0 transition-transform duration-300 lg:relative lg:translate-x-0 ${
            showImageList ? "translate-x-0" : "-translate-x-full"
          }`} 
          style={isDesktop ? { width: `${leftWidth}px` } : undefined}
          id="image-list-section"
        >
          <div className="p-4 border-b border-white/10 shrink-0 flex items-center gap-2">
            <button
              onClick={() => sidebarFileInputRef.current?.click()}
              className="flex-1 py-2.5 px-4 rounded-xl border border-white/10 text-xs font-semibold flex items-center justify-center gap-2 text-white hover:bg-white/5 transition-colors cursor-pointer"
              id="btn-add-images"
            >
              <FileImage className="w-4 h-4 text-indigo-400" />
              <span>Load Images</span>
            </button>
            <button
              onClick={() => setShowImageList(false)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white lg:hidden transition-all cursor-pointer"
              id="btn-close-images"
            >
              <X className="w-4 h-4" />
            </button>
            <input
              type="file"
              ref={sidebarFileInputRef}
              onChange={(e) => handleFilesAdded(e.target.files)}
              accept="image/*"
              multiple
              className="hidden"
              id="file-input-multiple"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 animate-fade-in" id="image-list">
            {loadedImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                <FileImage className="w-8 h-8 text-slate-600" />
                <span className="text-[11px] text-slate-500 font-medium">No assets opened</span>
              </div>
            ) : (
              loadedImages.map((img) => (
                <div
                  key={img.id}
                  onClick={() => {
                    setActiveImageId(img.id);
                    // Reset temporary flips & rotations when switching image files
                    setRotationAngle(0);
                    setFlipH(false);
                    setFlipV(false);
                    // Hide drawer on selection on mobile
                    setShowImageList(false);
                  }}
                  className={`group relative flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-transparent transition-all cursor-pointer ${
                    img.id === activeImageId
                      ? "border-indigo-500/80 bg-indigo-500/10 shadow-sm"
                      : "hover:bg-white/10"
                  }`}
                  id={`thumbnail-item-${img.id}`}
                >
                  <img
                    src={img.dataUrl}
                    alt={img.name}
                    className="w-12 h-12 rounded-lg object-cover bg-black border border-white/5 shrink-0"
                  />
                  <div className="flex-1 min-w-0 pr-6">
                    <span className="block text-xs font-semibold text-slate-200 truncate" title={img.name}>
                      {img.name}
                    </span>
                    <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                      {img.width}x{img.height}
                    </span>
                  </div>

                  {/* Remove asset button */}
                  <button
                    onClick={(e) => handleRemoveImage(img.id, e)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-white/5 opacity-0 group-hover:opacity-100 lg:opacity-0 transition-opacity"
                    title="Remove image"
                    id={`btn-remove-${img.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* LEFT RESIZABLE SPLITTER (DESKTOP) */}
        <div
          onMouseDown={(e) => startResize(e, "left")}
          className="hidden lg:flex items-center justify-center w-1.5 hover:w-2 h-full cursor-col-resize bg-transparent hover:bg-indigo-500/30 border-r border-white/10 select-none z-30 transition-all group/splitter shrink-0"
          id="left-splitter"
          title="Drag to resize images panel"
        >
          <div className="w-[1.5px] h-10 bg-white/15 group-hover/splitter:bg-indigo-400/80 rounded-full transition-all" />
        </div>

        {/* EDITOR SECTION (CENTER) */}
        <section className="flex-1 flex flex-col min-w-0 bg-black/10 border-r lg:border-r-0 border-white/10 relative" id="editor-section">
          {/* Main workspace header */}
          <header className="h-16 px-4 md:px-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#121b2d]/40" id="editor-header">
            <div className="flex items-center gap-2 md:gap-2.5">
              {/* Image list toggle button for mobile */}
              <button
                onClick={() => {
                  setShowImageList(!showImageList);
                  setShowSettings(false);
                }}
                className="p-2 -ml-1 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-slate-300 hover:text-white lg:hidden transition-all relative cursor-pointer flex items-center justify-center"
                title="Images"
                id="btn-toggle-images"
              >
                <Menu className="w-4 h-4" />
                {loadedImages.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 text-[9px] font-bold flex items-center justify-center text-white">
                    {loadedImages.length}
                  </span>
                )}
              </button>

              <Sparkles className="w-5 h-5 text-indigo-500 hidden sm:block" />
              <h1 className="text-xs sm:text-sm font-bold tracking-tight text-white uppercase">PhotoEditor</h1>
            </div>

            <div className="text-[10px] sm:text-xs font-bold text-slate-400 tracking-wider hidden md:block">
              GHS, Kadayam
            </div>

            <div className="flex items-center gap-2">
              {/* Settings toggle button for mobile */}
              <button
                onClick={() => {
                  setShowSettings(!showSettings);
                  setShowImageList(false);
                }}
                className={`p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-slate-300 hover:text-white lg:hidden transition-all cursor-pointer flex items-center justify-center ${
                  showSettings ? "bg-indigo-600 text-white border-indigo-500" : ""
                }`}
                title="Settings"
                id="btn-toggle-settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Draggable & drops workspace */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="flex-1 relative flex items-center justify-center p-6 min-h-0"
            id="workspace"
          >
            {!activeImage ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`max-w-md w-full border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                  isDraggingOver
                    ? "border-indigo-400 bg-indigo-500/5 shadow-lg"
                    : "border-slate-700 bg-[#0f172a]/40 hover:border-indigo-500/50 hover:bg-[#0f172a]/60 shadow-sm"
                }`}
                id="drop-zone"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFilesAdded(e.target.files)}
                  accept="image/*"
                  multiple
                  className="hidden"
                  id="file-input"
                />
                <Upload className="w-12 h-12 text-indigo-500 mb-4" />
                <h2 className="text-base font-bold text-white mb-1">Drag & Drop your image here</h2>
                <p className="text-xs text-slate-500 mb-4">or click to browse local folders</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-4 py-2 bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 hover:border-indigo-500/50 text-indigo-300 hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  id="btn-choose-image"
                >
                  Load Images
                </button>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col min-h-0 relative" id="active-image-stage">
                <WarpCanvas
                  imageInfo={activeImage}
                  cropMode={cropMode}
                  rotationAngle={rotationAngle}
                  flipH={flipH}
                  flipV={flipV}
                  onApplyWarp={handleWarpApplied}
                  isWarping={isWarping}
                  setIsWarping={setIsWarping}
                  executeTriggerRef={executeTriggerRef}
                />
              </div>
            )}

            {activeImage && (
              <div 
                className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2.5 bg-[#0f172a]/95 backdrop-blur-md rounded-xl px-4 py-2 border border-white/10 shadow-2xl z-20 select-none cursor-default" 
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                id="free-rotation-bar"
              >
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Free Rotate</span>
                <input
                  type="range"
                  min="-45"
                  max="45"
                  step="0.5"
                  value={rotationAngle}
                  onChange={(e) => setRotationAngle(parseFloat(e.target.value))}
                  className="w-28 sm:w-36 md:w-44 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  id="rotation-slider"
                />
                <span className="text-xs text-indigo-400 font-bold font-mono w-9 text-right" id="rotation-val">
                  {rotationAngle}°
                </span>
              </div>
            )}
          </div>

          {/* Horizontal Toolbar below preview */}
          {activeImage && (
            <div className="h-auto lg:h-16 py-3.5 lg:py-0 px-4 lg:px-6 border-t border-white/10 bg-black/30 flex flex-col sm:flex-row sm:flex-wrap lg:flex-nowrap items-center justify-between shrink-0 gap-3 sm:gap-4" id="editor-toolbar">
              
              {/* Crop Mode selector */}
              <div className="flex bg-[#0f172a] rounded-xl p-1 border border-white/5 w-full sm:w-auto justify-center" id="crop-mode-toggle">
                <button
                  onClick={() => setCropMode("perspective")}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    cropMode === "perspective"
                      ? "bg-indigo-600 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                  title="Perspective 4-Corner Warp"
                  id="mode-perspective"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Perspective</span>
                </button>
                <button
                  onClick={() => setCropMode("normal")}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    cropMode === "normal"
                      ? "bg-indigo-600 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                  title="Rectangular Crop Box"
                  id="mode-normal"
                >
                  <Crop className="w-3.5 h-3.5" />
                  <span>Normal</span>
                </button>
              </div>

              {/* Quick Rotation/Flips actions */}
              <div className="flex items-center justify-center gap-1.5 w-full sm:w-auto" id="quick-action-triggers">
                <button
                  onClick={() => setRotationAngle((prev) => (prev - 90) % 360)}
                  className="p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/15 text-slate-300 hover:text-white transition-all cursor-pointer flex-1 sm:flex-none flex justify-center"
                  title="Rotate Counter-Clockwise 90°"
                  id="btn-rotate-ccw"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setRotationAngle((prev) => (prev + 90) % 360)}
                  className="p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/15 text-slate-300 hover:text-white transition-all cursor-pointer flex-1 sm:flex-none flex justify-center"
                  title="Rotate Clockwise 90°"
                  id="btn-rotate-cw"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setFlipH(!flipH)}
                  className={`p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/15 transition-all cursor-pointer flex-1 sm:flex-none flex justify-center ${
                    flipH ? "bg-indigo-600 text-white border-indigo-500" : "text-slate-300 hover:text-white"
                  }`}
                  title="Flip Horizontal"
                  id="btn-flip-h"
                >
                  <FlipHorizontal className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setFlipV(!flipV)}
                  className={`p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/15 transition-all cursor-pointer flex-1 sm:flex-none flex justify-center ${
                    flipV ? "bg-indigo-600 text-white border-indigo-500" : "text-slate-300 hover:text-white"
                  }`}
                  title="Flip Vertical"
                  id="btn-flip-v"
                >
                  <FlipHorizontal className="w-4 h-4 rotate-90" />
                </button>
              </div>

              {/* Applying crops trigger */}
              <div className="w-full sm:w-auto flex justify-center" id="toolbar-actions">
                <button
                  onClick={() => executeTriggerRef.current?.()}
                  className="w-full sm:w-auto px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow shadow-indigo-600/25 active:scale-95 transition-all animate-pulse"
                  id="btn-warp"
                >
                  Apply Crop
                </button>
              </div>
            </div>
          )}
        </section>

        {/* RIGHT RESIZABLE SPLITTER (DESKTOP) */}
        <div
          onMouseDown={(e) => startResize(e, "right")}
          className="hidden lg:flex items-center justify-center w-1.5 hover:w-2 h-full cursor-col-resize bg-transparent hover:bg-indigo-500/30 border-l border-white/10 select-none z-30 transition-all group/splitter shrink-0"
          id="right-splitter"
          title="Drag to resize settings panel"
        >
          <div className="w-[1.5px] h-10 bg-white/15 group-hover/splitter:bg-indigo-400/80 rounded-full transition-all" />
        </div>

        {/* SETTINGS SECTION (RIGHT) */}
        <aside 
          className={`absolute inset-y-0 right-0 z-30 w-80 p-5 flex flex-col gap-5 overflow-y-auto bg-[#151f32]/95 lg:bg-black/5 backdrop-blur-xl border-l lg:border-l-0 border-white/10 transition-transform duration-300 lg:relative lg:translate-x-0 ${
            showSettings ? "translate-x-0" : "translate-x-full"
          }`} 
          style={isDesktop ? { width: `${rightWidth}px` } : undefined}
          id="settings-section"
        >
          {/* Header with close button on mobile */}
          <div className="flex items-center justify-between lg:hidden pb-2 border-b border-white/5 shrink-0" id="settings-mobile-header">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Editor Settings</span>
            <button
              onClick={() => setShowSettings(false)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer flex items-center justify-center"
              id="btn-close-settings"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* OUTPUT RESIZER CARD */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10" id="settings-card-dimensions">
            <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-3.5">Output Size</h3>
            <div className="flex items-center gap-2.5" id="size-inputs">
              <div className="flex-1 flex flex-col gap-1.5" id="input-box-w">
                <label className="text-[10px] text-slate-500 font-medium">Width (px)</label>
                <input
                  type="number"
                  value={outWidth}
                  disabled={!activeImage}
                  onChange={(e) => handleWidthChange(e.target.value)}
                  className="w-full bg-[#0f172a] border border-white/5 rounded-xl px-3 py-2 text-xs font-mono text-white text-center focus:outline-none focus:border-indigo-500/50 disabled:opacity-40 font-bold"
                  placeholder="Auto"
                  id="out-width"
                />
              </div>

              {/* aspect Lock icon button */}
              <button
                onClick={() => setAspectRatioLock(!aspectRatioLock)}
                disabled={!activeImage}
                className={`mt-5 p-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center ${
                  aspectRatioLock
                    ? "bg-indigo-600/10 border-indigo-500 text-indigo-400 shadow-sm"
                    : "bg-[#0f172a] border-white/5 text-slate-500 hover:text-slate-300"
                }`}
                title="Lock aspect ratio"
                id="aspect-lock"
              >
                <Link className="w-3.5 h-3.5" />
              </button>

              <div className="flex-1 flex flex-col gap-1.5" id="input-box-h">
                <label className="text-[10px] text-slate-500 font-medium">Height (px)</label>
                <input
                  type="number"
                  value={outHeight}
                  disabled={!activeImage}
                  onChange={(e) => handleHeightChange(e.target.value)}
                  className="w-full bg-[#0f172a] border border-white/5 rounded-xl px-3 py-2 text-xs font-mono text-white text-center focus:outline-none focus:border-indigo-500/50 disabled:opacity-40 font-bold"
                  placeholder="Auto"
                  id="out-height"
                />
              </div>
            </div>
          </div>

          {/* EXPORT COMPRESSION SETTINGS CARD */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10" id="settings-card-export">
            <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-3.5">Export Settings</h3>
            
            {/* Format toggle tabs */}
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5" id="export-format-control">
                <label className="text-[10px] text-slate-500 font-medium">Format</label>
                <div className="grid grid-cols-3 bg-[#0f172a] rounded-xl p-1 border border-white/5" id="format-toggle-group">
                  {[
                    { ext: "JPG", mime: "image/jpeg" },
                    { ext: "PNG", mime: "image/png" },
                    { ext: "WEBP", mime: "image/webp" },
                  ].map((f) => (
                    <button
                      key={f.mime}
                      onClick={() => setFormat(f.mime)}
                      disabled={!activeImage}
                      className={`py-1.5 rounded-lg text-[10px] font-bold tracking-tight uppercase cursor-pointer transition-all disabled:opacity-40 ${
                        format === f.mime
                          ? "bg-indigo-600 text-white shadow"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                      id={`fmt-${f.ext.toLowerCase()}`}
                    >
                      {f.ext}
                    </button>
                  ))}
                </div>
              </div>

              {/* Compression Slider */}
              <div className="flex flex-col gap-2" id="quality-group">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Quality</span>
                  <span className="text-indigo-400 font-bold font-mono" id="quality-val">
                    {format === "image/png" ? "N/A" : `${quality}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={quality}
                  disabled={!activeImage || format === "image/png"}
                  onChange={(e) => setQuality(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:opacity-35"
                  id="quality-slider"
                />
              </div>

              {/* Live size preview badge */}
              <div className="flex items-center gap-2 px-3 py-2.5 bg-[#0f172a] border border-white/5 rounded-xl text-slate-400" id="estimated-size-container">
                <Sliders className="w-4 h-4 text-slate-500" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Est. Size:</span>
                <strong className="ml-auto text-xs font-mono font-bold text-indigo-400" id="estimated-size">
                  {estimatedSize}
                </strong>
              </div>

              {/* Target File Size Custom Limit */}
              <div className="flex flex-col gap-2.5 pt-3 border-t border-white/10" id="custom-size-target-container">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Target Max Size</span>
                    <span className="text-[9px] text-slate-500">Auto-compress to match size</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={targetSizeEnabled} 
                      onChange={(e) => setTargetSizeEnabled(e.target.checked)} 
                      id="target-size-toggle"
                    />
                    <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 peer-checked:after:bg-indigo-400 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600/30 peer-checked:border peer-checked:border-indigo-500/30"></div>
                  </label>
                </div>

                {targetSizeEnabled && (
                  <div className="flex flex-col gap-2 bg-[#090d16] p-2.5 rounded-xl border border-white/5 animate-in fade-in duration-200" id="target-size-controls">
                    {format === "image/png" ? (
                      <p className="text-[10px] text-amber-400/80 leading-normal font-medium">
                        PNG does not support quality compression. Switch to JPG or WEBP format above.
                      </p>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            placeholder="e.g. 500"
                            value={targetSizeValue}
                            onChange={(e) => setTargetSizeValue(e.target.value)}
                            className="flex-1 min-w-0 bg-[#1e293b] text-white text-xs px-2.5 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-indigo-500 font-mono"
                            id="target-size-input"
                          />
                          <div className="flex rounded-lg bg-[#1e293b] p-0.5 border border-white/10 shrink-0">
                            {(["KB", "MB"] as const).map((unit) => (
                              <button
                                key={unit}
                                type="button"
                                onClick={() => setTargetSizeUnit(unit)}
                                className={`px-2 py-1 text-[10px] font-bold rounded-md uppercase transition-all ${
                                  targetSizeUnit === unit
                                    ? "bg-indigo-600 text-white"
                                    : "text-slate-400 hover:text-slate-200"
                                }`}
                              >
                                {unit}
                              </button>
                            ))}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={fitQualityToTargetSize}
                          disabled={isFitting || !targetSizeValue || parseFloat(targetSizeValue) <= 0}
                          className="w-full py-2 bg-indigo-600/20 hover:bg-indigo-600/35 text-indigo-400 hover:text-indigo-300 disabled:opacity-40 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border border-indigo-500/20 hover:border-indigo-500/40 cursor-pointer flex items-center justify-center gap-1.5"
                          id="btn-auto-fit"
                        >
                          {isFitting ? (
                            <>
                              <span className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span>
                              <span>Optimizing...</span>
                            </>
                          ) : (
                            <span>Auto-Fit Quality</span>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SAVE BUTTON */}
          <button
            onClick={handleSaveImage}
            disabled={!activeImage}
            className="w-full mt-auto py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold tracking-wider uppercase shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all cursor-pointer"
            id="btn-save"
          >
            <div className="flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              <span>Save Image</span>
            </div>
          </button>

        </aside>
      </main>
    </div>
  );
}
