
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb } from 'pdf-lib';
import { PageItem, UploadedFile, LayoutSettings } from '../types';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs`;

export const loadPdfFile = async (file: File): Promise<UploadedFile> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Load document to get page count
    const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer.slice(0),
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/cmaps/',
        cMapPacked: true,
    });
    
    const pdf = await loadingTask.promise;

    return {
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      pageCount: pdf.numPages,
      data: arrayBuffer,
    };
  } catch (error) {
    console.error("Detailed PDF Load Error:", error);
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};

export const renderPageToThumbnail = async (
  fileData: ArrayBuffer, 
  pageIndex: number,
  scale: number = 0.5
): Promise<{ dataUrl: string; width: number; height: number }> => {
  const loadingTask = pdfjsLib.getDocument({ 
    data: fileData.slice(0),
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/cmaps/',
    cMapPacked: true,
  });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(pageIndex + 1); // pdfjs is 1-based

  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) throw new Error('Could not get canvas context');

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({
    canvasContext: context,
    viewport: viewport,
  } as any).promise;

  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.8),
    width: viewport.width,
    height: viewport.height
  };
};

// Applies the visual filters to a canvas context
const applyFiltersToContext = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  filters: PageItem['filters']
) => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const { invert, grayscale, whiteness, blackness } = filters;

  const brightnessMult = 1 + (whiteness / 100);
  const contrastMult = 1 + (blackness / 100);
  const intercept = 128 * (1 - contrastMult);

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    if (grayscale) {
      const avg = 0.299 * r + 0.587 * g + 0.114 * b;
      r = avg;
      g = avg;
      b = avg;
    }

    if (invert) {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    }

    r *= brightnessMult;
    g *= brightnessMult;
    b *= brightnessMult;

    r = r * contrastMult + intercept;
    g = g * contrastMult + intercept;
    b = b * contrastMult + intercept;

    data[i] = Math.min(255, Math.max(0, r));
    data[i + 1] = Math.min(255, Math.max(0, g));
    data[i + 2] = Math.min(255, Math.max(0, b));
  }

  ctx.putImageData(imageData, 0, 0);
};

export const generateFinalPdf = async (
  pages: PageItem[],
  files: Record<string, UploadedFile>,
  layout: LayoutSettings
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.create();

  // Filter out unselected pages
  const activePages = pages.filter(p => p.isSelected);

  if (activePages.length === 0) {
    throw new Error("No pages selected");
  }

  // Helper to process a single visual page item into an embeddable image
  // This bakes filters, rotation, and doodles into a single JPG
  const processPageImage = async (pageItem: PageItem): Promise<Uint8Array> => {
    // 1. High quality render from PDF
    const file = files[pageItem.fileId];
    const { dataUrl, width, height } = await renderPageToThumbnail(file.data, pageItem.originalPageIndex, 1.5);
    
    // 2. Load base PDF image
    const img = new Image();
    img.src = dataUrl;
    await new Promise(r => img.onload = r);

    // 3. Setup Canvas (Handling Rotation)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Canvas context failed");

    const isRotated90or270 = pageItem.rotation === 90 || pageItem.rotation === 270;
    
    // Swap width/height if rotated 90 or 270
    canvas.width = isRotated90or270 ? height : width;
    canvas.height = isRotated90or270 ? width : height;

    // Apply Rotation to Context
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((pageItem.rotation * Math.PI) / 180);
    ctx.drawImage(img, -width / 2, -height / 2);
    
    // Reset Transform for Filters (Filters apply to pixels, so we apply to the whole rotated canvas)
    // Actually filters should apply to the content.
    // However, applyFiltersToContext works on ImageData. 
    // We need to apply filters BEFORE rotation to handle them correctly per pixel relative to content?
    // No, applyFiltersToContext is a simple pixel manipulator. Applying it after rotation is fine.
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // 4. Apply Filters
    applyFiltersToContext(ctx, canvas.width, canvas.height, pageItem.filters);

    // 5. Apply Drawing / Doodle Layer
    // We need to rotate the context again to match the image orientation if we want the drawing to stick to the image
    // OR, we assume the drawing was made ON TOP of the visual orientation.
    // In Step2_Workshop, the user draws on the displayed image. If the image wasn't rotated then, the doodle is upright.
    // Since rotation happens in Step 3, the doodle should rotate WITH the image.
    if (pageItem.drawingDataUrl) {
        const doodleImg = new Image();
        doodleImg.src = pageItem.drawingDataUrl;
        await new Promise(r => doodleImg.onload = r);
        
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((pageItem.rotation * Math.PI) / 180);
        // Doodle is drawn on original dimensions
        ctx.drawImage(doodleImg, -width / 2, -height / 2, width, height);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    // Return compressed JPEG bytes
    const processedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const base64 = processedDataUrl.split(',')[1];
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  // N-Up Logic
  const itemsPerPage = layout.nUp;
  const chunkedPages = [];
  
  for (let i = 0; i < activePages.length; i += itemsPerPage) {
    chunkedPages.push(activePages.slice(i, i + itemsPerPage));
  }

  // A4 Standard Dimensions
  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN = 20;

  for (const chunk of chunkedPages) {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    
    // Dynamic Grid Calculation
    // We try to fill the page logically based on N
    let cols = 1;
    let rows = 1;

    switch(itemsPerPage) {
        case 1: cols = 1; rows = 1; break;
        case 2: cols = 1; rows = 2; break; // 1x2 split
        case 3: cols = 1; rows = 3; break; // 1x3 stacked
        case 4: cols = 2; rows = 2; break; // 2x2
        case 5: cols = 2; rows = 3; break; // 2x3 (one empty)
        case 6: cols = 2; rows = 3; break; // 2x3
        case 7: cols = 2; rows = 4; break; // 2x4
        case 8: cols = 2; rows = 4; break; // 2x4
        default: cols = 1; rows = 1;
    }

    const cellWidth = (PAGE_WIDTH - (MARGIN * 2)) / cols;
    const cellHeight = (PAGE_HEIGHT - (MARGIN * 2)) / rows;

    for (let i = 0; i < chunk.length; i++) {
      const pageItem = chunk[i];
      const imageBytes = await processPageImage(pageItem);
      const embeddedImage = await pdfDoc.embedJpg(imageBytes);

      // Determine Grid Position
      const colIndex = i % cols;
      const rowIndex = Math.floor(i / cols);

      // Scale image to fit cell, maintaining aspect ratio
      const imgDims = embeddedImage.scale(1);
      
      const scaleX = (cellWidth - 10) / imgDims.width;
      const scaleY = (cellHeight - 10) / imgDims.height;
      const scale = Math.min(scaleX, scaleY);
      
      const drawWidth = imgDims.width * scale;
      const drawHeight = imgDims.height * scale;

      const x = MARGIN + (colIndex * cellWidth) + (cellWidth - drawWidth) / 2;
      // PDF coordinates: Top row is highest Y
      const y = PAGE_HEIGHT - MARGIN - ((rowIndex + 1) * cellHeight) + (cellHeight - drawHeight) / 2;

      page.drawImage(embeddedImage, {
        x,
        y,
        width: drawWidth,
        height: drawHeight,
        // We do NOT use rotate here because we baked it into the imageBuffer in processPageImage
      });

      if (layout.showBorders) {
        page.drawRectangle({
          x: MARGIN + (colIndex * cellWidth),
          y: PAGE_HEIGHT - MARGIN - ((rowIndex + 1) * cellHeight),
          width: cellWidth,
          height: cellHeight,
          borderWidth: 1,
          borderColor: rgb(0.8, 0.8, 0.8),
        });
      }
    }
  }

  return await pdfDoc.save();
};
