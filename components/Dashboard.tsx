
import React, { useState, useRef, useEffect } from 'react';
import { PageItem, LayoutSettings, UploadedFile } from '../types';
import { generateFinalPdf } from '../services/pdfService';
import { 
  Download, Settings, Sliders, Loader2, CheckCircle, RefreshCcw, 
  Moon, Sun, RotateCw, PenTool, X, Save, Pencil, Highlighter, Eraser, Plus, ChevronDown
} from 'lucide-react';

// --- Doodle Modal Component (Integrated) ---
interface DoodleModalProps {
    page: PageItem;
    onClose: () => void;
    onSave: (drawingDataUrl: string) => void;
}

const DoodleModal: React.FC<DoodleModalProps> = ({ page, onClose, onSave }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState<'pencil' | 'marker' | 'eraser'>('pencil');
    const [color, setColor] = useState('#000000');
    const [markerSize, setMarkerSize] = useState(15);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        canvas.width = page.width;
        canvas.height = page.height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (page.drawingDataUrl) {
            const img = new Image();
            img.src = page.drawingDataUrl;
            img.onload = () => ctx.drawImage(img, 0, 0);
        }
        
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, [page]);

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? (e as any).touches[0].clientX : (e as any).clientX;
        const clientY = 'touches' in e ? (e as any).touches[0].clientY : (e as any).clientY;
        
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        setIsDrawing(true);
        const { x, y } = getCoordinates(e);

        ctx.beginPath();
        ctx.moveTo(x, y);
        
        if (tool === 'pencil') {
            ctx.strokeStyle = color;
            ctx.lineWidth = 3; // Fixed pencil width relative to canvas usually, but simple is ok
            ctx.globalAlpha = 0.9;
            ctx.globalCompositeOperation = 'source-over';
        } else if (tool === 'marker') {
            ctx.strokeStyle = color;
            ctx.lineWidth = markerSize;
            ctx.globalAlpha = 0.4;
            ctx.globalCompositeOperation = 'source-over';
        } else if (tool === 'eraser') {
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 40;
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'destination-out';
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        e.preventDefault(); // Prevent scrolling on touch
        const { x, y } = getCoordinates(e);

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => setIsDrawing(false);

    const handleSave = () => {
        if (canvasRef.current) {
            onSave(canvasRef.current.toDataURL());
        }
        onClose();
    };

    const brightnessVal = 1 + (page.filters.whiteness / 100);
    const contrastVal = 1 + (page.filters.blackness / 100);
    const filterString = `
        grayscale(${page.filters.grayscale ? 1 : 0}) 
        invert(${page.filters.invert ? 1 : 0}) 
        brightness(${brightnessVal}) 
        contrast(${contrastVal})
    `;

    const presetColors = ['#000000', '#FFFFFF', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white dark:bg-[#1a1a1a] w-full max-w-4xl h-[90vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-fade-in">
                <div className="p-4 border-b border-gray-200 dark:border-zinc-800 flex justify-between items-center bg-gray-50 dark:bg-zinc-900">
                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><PenTool size={18} /> Doodle Studio</h3>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-lg text-gray-500"><X size={20} /></button>
                        <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium flex items-center gap-2 hover:bg-indigo-700"><Save size={18} /> Save</button>
                    </div>
                </div>

                <div className="p-4 border-b border-gray-200 dark:border-zinc-800 flex gap-4 items-center overflow-x-auto">
                    <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl">
                        {['pencil', 'marker', 'eraser'].map((t) => (
                            <button 
                                key={t}
                                onClick={() => setTool(t as any)}
                                className={`p-2 rounded-lg capitalize text-xs font-bold flex flex-col items-center gap-1 w-16 ${tool === t ? 'bg-white dark:bg-zinc-700 shadow text-indigo-600' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-zinc-700'}`}
                            >
                                {t === 'pencil' && <Pencil size={16} />}
                                {t === 'marker' && <Highlighter size={16} />}
                                {t === 'eraser' && <Eraser size={16} />}
                                {t}
                            </button>
                        ))}
                    </div>
                    
                    {(tool === 'pencil' || tool === 'marker') && (
                        <div className="flex items-center gap-2 pl-4 border-l border-gray-200 dark:border-zinc-700">
                             {presetColors.map(c => (
                                <button 
                                    key={c} 
                                    onClick={() => setColor(c)}
                                    className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-indigo-600 scale-110' : 'border-transparent hover:scale-105'} transition-all shadow-sm`}
                                    style={{ backgroundColor: c, borderColor: c === '#FFFFFF' ? '#e5e7eb' : undefined }}
                                />
                             ))}
                             <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-8 h-8 rounded-full cursor-pointer overflow-hidden border-0 p-0" />
                        </div>
                    )}
                </div>

                <div className="flex-1 bg-gray-200 dark:bg-zinc-950 overflow-auto flex items-center justify-center p-8 relative">
                    <div className="relative shadow-2xl bg-white" style={{ width: 'fit-content', height: 'fit-content' }}>
                        <img 
                            src={page.thumbnailDataUrl} 
                            style={{ maxWidth: '100%', maxHeight: '65vh', display: 'block', filter: filterString }} 
                            className="pointer-events-none select-none"
                        />
                        <canvas
                            ref={canvasRef}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                            className={`absolute inset-0 touch-none ${tool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair'}`}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- Main Dashboard Component ---

interface DashboardProps {
  pages: PageItem[];
  setPages: React.Dispatch<React.SetStateAction<PageItem[]>>;
  files: Record<string, UploadedFile>;
  layout: LayoutSettings;
  setLayout: React.Dispatch<React.SetStateAction<LayoutSettings>>;
  onReset: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ pages, setPages, files, layout, setLayout, onReset }) => {
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingPage, setEditingPage] = useState<PageItem | null>(null);
  const [displayCount, setDisplayCount] = useState(20);

  // Derived global stats for filters (using first page as source of truth for UI sliders)
  const firstPage = pages[0];
  
  const handleDownload = async () => {
    setIsGenerating(true);
    try {
        const pdfBytes = await generateFinalPdf(pages, files, layout);
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'PDFbhai-Optimized.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error(err);
        alert('Failed to generate PDF. Please try again.');
    } finally {
        setIsGenerating(false);
    }
  };

  // --- Bulk Filter Updates ---
  const updateGlobalFilter = (key: keyof PageItem['filters'], value: any) => {
      setPages(prev => prev.map(p => ({
          ...p,
          filters: { ...p.filters, [key]: value }
      })));
  };

  // --- Individual Page Actions ---
  const rotatePage = (pageId: string) => {
      setPages(prev => prev.map(p => {
          if (p.id === pageId) {
              const nextRotation = (p.rotation + 90) % 360 as 0 | 90 | 180 | 270;
              return { ...p, rotation: nextRotation };
          }
          return p;
      }));
  };

  const handleDoodleSave = (dataUrl: string) => {
      if (editingPage) {
          setPages(prev => prev.map(p => p.id === editingPage.id ? { ...p, drawingDataUrl: dataUrl } : p));
      }
  };

  // --- Rendering Logic ---
  const selectedPages = pages.filter(p => p.isSelected);
  const chunks = [];
  for (let i = 0; i < selectedPages.length; i += layout.nUp) {
    chunks.push(selectedPages.slice(i, i + layout.nUp));
  }
  
  const visibleChunks = chunks.slice(0, displayCount);
  const totalOriginalPages = pages.length;
  const pagesToPrint = chunks.length;
  const savingsPercent = Math.round(((totalOriginalPages - pagesToPrint) / totalOriginalPages) * 100);

  return (
    <div className="w-full flex flex-col items-center animate-fade-in relative">
      
      {/* 1. Hero / Controls Section */}
      <div className="w-full sticky top-16 z-40 bg-[#fafafa]/95 dark:bg-[#0f0f0f]/95 backdrop-blur-sm border-b border-gray-200 dark:border-zinc-800 transition-all shadow-sm">
         <div className="max-w-5xl mx-auto p-4">
            
            {!isCustomizing ? (
                 <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                     <div className="flex items-center gap-3">
                         <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                             <CheckCircle size={12} />
                             {savingsPercent > 0 ? `Saved ${savingsPercent}% Paper` : 'Ready to Print'}
                         </div>
                         <p className="text-sm text-gray-500">
                             <span className="font-bold text-gray-900 dark:text-white">{pagesToPrint}</span> Sheets total
                         </p>
                     </div>
                     
                     <div className="flex items-center gap-3">
                         <button 
                             onClick={() => setIsCustomizing(true)}
                             className="text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                         >
                             <Sliders size={16} /> Customize
                         </button>
                         <button 
                             onClick={handleDownload}
                             disabled={isGenerating}
                             className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2 transition-transform active:scale-95"
                         >
                             {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                             {isGenerating ? 'Processing...' : 'Download PDF'}
                         </button>
                     </div>
                 </div>
            ) : (
                <div className="animate-slide-up space-y-6 pb-2">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-lg flex items-center gap-2 text-gray-800 dark:text-white"><Settings size={18} /> Studio Controls</h3>
                        <button onClick={() => setIsCustomizing(false)} className="text-xs font-bold bg-gray-900 text-white dark:bg-white dark:text-black px-4 py-1.5 rounded-full hover:opacity-80">
                            Done
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Layout */}
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Layout Grid</label>
                            <div className="flex gap-2">
                                {[1, 2, 4, 6, 8].map(n => (
                                    <button
                                        key={n}
                                        onClick={() => setLayout(prev => ({ ...prev, nUp: n as any }))}
                                        className={`flex-1 py-2 rounded-md text-sm font-bold border ${layout.nUp === n ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800'}`}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Toggles */}
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Modes</label>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => updateGlobalFilter('invert', !firstPage.filters.invert)}
                                    className={`flex-1 py-2 rounded-md text-sm font-medium border flex items-center justify-center gap-2 ${firstPage.filters.invert ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-black' : 'border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-400'}`}
                                >
                                    {firstPage.filters.invert ? <Moon size={14} /> : <Sun size={14} />} Invert
                                </button>
                                <button 
                                    onClick={() => updateGlobalFilter('grayscale', !firstPage.filters.grayscale)}
                                    className={`flex-1 py-2 rounded-md text-sm font-medium border flex items-center justify-center gap-2 ${firstPage.filters.grayscale ? 'bg-gray-500 text-white border-gray-500' : 'border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-400'}`}
                                >
                                    B&W
                                </button>
                            </div>
                        </div>

                        {/* Sliders */}
                        <div className="space-y-3">
                             <div className="flex items-center gap-3">
                                 <Sun size={14} className="text-gray-400" />
                                 <input 
                                    type="range" min="0" max="100" 
                                    value={firstPage.filters.whiteness} 
                                    onChange={(e) => updateGlobalFilter('whiteness', Number(e.target.value))}
                                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    title="Brightness"
                                 />
                             </div>
                             <div className="flex items-center gap-3">
                                 <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-400" />
                                 <input 
                                    type="range" min="0" max="100" 
                                    value={firstPage.filters.blackness} 
                                    onChange={(e) => updateGlobalFilter('blackness', Number(e.target.value))}
                                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    title="Contrast"
                                 />
                             </div>
                        </div>
                    </div>
                </div>
            )}
         </div>
      </div>

      {/* 2. Main Grid View */}
      <div className="w-full max-w-7xl mx-auto px-4 py-8 flex flex-col items-center">
          
          <div className="flex flex-wrap justify-center gap-8 md:gap-12 w-full">
            {visibleChunks.map((chunk, sheetIndex) => (
                <div key={sheetIndex} className="relative group">
                     {/* Sheet Number */}
                     <div className="absolute -left-10 top-0 text-[10px] font-mono text-gray-300 font-bold hidden sm:block">#{sheetIndex + 1}</div>

                     {/* The Paper */}
                     <div className="w-[90vw] sm:w-[400px] aspect-[1/1.414] bg-white shadow-xl rounded-sm p-4 sm:p-6 flex flex-wrap content-start ring-1 ring-gray-200 dark:ring-zinc-800 transition-transform hover:scale-[1.01]">
                        {Array.from({ length: layout.nUp }).map((_, i) => {
                            // Grid Math
                            let widthClass = 'w-full';
                            let heightClass = 'h-full';
                            if (layout.nUp === 2) heightClass = 'h-1/2';
                            if (layout.nUp === 4) { widthClass = 'w-1/2'; heightClass = 'h-1/2'; }
                            if (layout.nUp === 6) { widthClass = 'w-1/2'; heightClass = 'h-1/3'; }
                            if (layout.nUp === 8) { widthClass = 'w-1/2'; heightClass = 'h-1/4'; }

                            const pageItem = chunk[i];

                            if (!pageItem) return <div key={i} className={`${widthClass} ${heightClass}`} />;

                            // CSS Filters for Preview
                            const brightnessVal = 1 + (pageItem.filters.whiteness / 100);
                            const contrastVal = 1 + (pageItem.filters.blackness / 100);
                            const filterString = `
                                grayscale(${pageItem.filters.grayscale ? 1 : 0}) 
                                invert(${pageItem.filters.invert ? 1 : 0}) 
                                brightness(${brightnessVal}) 
                                contrast(${contrastVal})
                            `;

                            return (
                                <div key={i} className={`${widthClass} ${heightClass} p-1`}>
                                    <div 
                                        className={`
                                            relative w-full h-full ${layout.showBorders ? 'border border-gray-900' : ''} 
                                            bg-gray-50 flex items-center justify-center overflow-hidden group/slide cursor-pointer
                                        `}
                                        onClick={() => setEditingPage(pageItem)}
                                    >
                                        {/* Image Container with Rotation */}
                                        <div 
                                            className="relative w-full h-full flex items-center justify-center transition-transform duration-300"
                                            style={{ transform: `rotate(${pageItem.rotation}deg)` }}
                                        >
                                            <img 
                                                src={pageItem.thumbnailDataUrl} 
                                                className="max-w-full max-h-full object-contain"
                                                style={{ filter: filterString }}
                                            />
                                            {/* Doodle Layer - Rotates with image */}
                                            {pageItem.drawingDataUrl && (
                                                <img 
                                                    src={pageItem.drawingDataUrl}
                                                    className="absolute inset-0 w-full h-full object-contain z-10"
                                                />
                                            )}
                                        </div>

                                        {/* Hover Overlays */}
                                        <div className="absolute inset-0 bg-black/0 group-hover/slide:bg-black/10 transition-colors z-20 flex items-center justify-center opacity-0 group-hover/slide:opacity-100">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); rotatePage(pageItem.id); }}
                                                className="bg-white/90 text-gray-800 p-2 rounded-full shadow-lg hover:bg-white hover:scale-110 transition-all"
                                                title="Rotate 90°"
                                            >
                                                <RotateCw size={16} />
                                            </button>
                                            <div className="absolute top-2 right-2 bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover/slide:opacity-100 transition-opacity">
                                                Edit
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                     </div>
                </div>
            ))}
          </div>

          {chunks.length > displayCount && (
              <button 
                onClick={() => setDisplayCount(prev => prev + 20)}
                className="mt-12 flex flex-col items-center gap-2 text-gray-400 hover:text-indigo-600 transition-colors"
              >
                  <span className="text-sm font-bold">Show More Pages</span>
                  <ChevronDown className="animate-bounce" />
              </button>
          )}

          <div className="mt-20 flex gap-4">
              <button onClick={onReset} className="text-gray-400 hover:text-red-500 text-sm flex items-center gap-2 px-4 py-2">
                  <RefreshCcw size={14} /> Reset Project
              </button>
          </div>
      </div>

      {/* Doodle Modal Overlay */}
      {editingPage && (
          <DoodleModal 
            page={editingPage} 
            onClose={() => setEditingPage(null)} 
            onSave={handleDoodleSave}
          />
      )}
    </div>
  );
};
