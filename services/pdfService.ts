import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb } from 'pdf-lib';
import { PageItem, UploadedFile, LayoutSettings } from '../types';

// Configure PDF.js worker
// We explicitly set the worker source to match the version defined in importmap
// This ensures compatibility between the main thread and worker thread
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs`;

export const loadPdfFile = async (file: File): Promise<UploadedFile> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Load document to get page count
    // Important: We must slice the ArrayBuffer because pdfjs might detach it
    const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer.slice(0),
        // cMapUrl and cMapPacked are needed for some PDFs with complex fonts
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
  // Use slice(0) to ensure we have a fresh copy of the buffer
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

  // Convert slider 0-100 to usable multipliers
  const brightnessMult = 1 + (whiteness / 100); // 1.0 to 2.0
  const contrastMult = 1 + (blackness / 100); // 1.0 to 2.0
  
  // Intercept calculation to minimize loop overhead
  const intercept = 128 * (1 - contrastMult);

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    // Alpha data[i+3] ignored for now

    // 1. Grayscale
    if (grayscale) {
      const avg = 0.299 * r + 0.587 * g + 0.114 * b;
      r = avg;
      g = avg;
      b = avg;
    }

    // 2. Invert
    if (invert) {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    }

    // 3. Scan Cleanup (Brightness/Contrast manual implementation)
    // Apply Brightness
    r *= brightnessMult;
    g *= brightnessMult;
    b *= brightnessMult;

    // Apply Contrast
    r = r * contrastMult + intercept;
    g = g * contrastMult + intercept;
    b = b * contrastMult + intercept;

    // Clamp values
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
  // We effectively "Screenshot" the page with filters applied
  const processPageImage = async (pageItem: PageItem): Promise<Uint8Array> => {
    // We need to re-render at higher quality for print
    const file = files[pageItem.fileId];
    // High quality render
    const { dataUrl, width, height } = await renderPageToThumbnail(file.data, pageItem.originalPageIndex, 1.5); // 1.5 scale for better quality
    
    // Load into an image element so we can draw it to a canvas
    const img = new Image();
    img.src = dataUrl;
    await new Promise(r => img.onload = r);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Canvas context failed");

    ctx.drawImage(img, 0, 0);
    
    // Apply filters at pixel level
    applyFiltersToContext(ctx, width, height, pageItem.filters);

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

  // A4 Standard Dimensions (at 72 DPI, typically PDF-lib uses points)
  // A4 is 595.28 x 841.89
  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN = 20;

  for (const chunk of chunkedPages) {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    
    // Calculate grid
    // 1-up: 1x1
    // 2-up: 1x2 (One on top of another)
    // 4-up: 2x2
    
    let cols = 1;
    let rows = 1;
    if (itemsPerPage === 2) { rows = 2; }
    if (itemsPerPage === 4) { cols = 2; rows = 2; }

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
      // PDF coordinates start at bottom left. We need to invert Y logic.
      // Top row is highest Y.
      const y = PAGE_HEIGHT - MARGIN - ((rowIndex + 1) * cellHeight) + (cellHeight - drawHeight) / 2;

      page.drawImage(embeddedImage, {
        x,
        y,
        width: drawWidth,
        height: drawHeight,
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
