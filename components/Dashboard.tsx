
import React, { useState, useEffect } from 'react';
import { PageItem, LayoutSettings, UploadedFile } from '../types';
import { generateFinalPdf } from '../services/pdfService';
import { Download, Settings, Sliders, Grid, Loader2, CheckCircle, RefreshCcw, Moon, Sun, ArrowLeft } from 'lucide-react';

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
  
  // Calculate savings
  const totalOriginalPages = pages.length;
  const pagesToPrint = Math.ceil(pages.filter(p => p.isSelected).length / layout.nUp);
  const savingsPercent = Math.round(((totalOriginalPages - pagesToPrint) / totalOriginalPages) * 100);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
        const pdfBytes = await generateFinalPdf(pages, files, layout);
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        // Create temp link and trigger click
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

  // --- Handlers for Customization ---

  const toggleInkSaver = () => {
     // Check if currently ink saved (heuristic: check first page)
     const first = pages[0];
     const isCurrentlySaved = first.filters.invert === true;

     setPages(prev => prev.map(p => ({
         ...p,
         filters: {
             invert: !isCurrentlySaved,
             grayscale: !isCurrentlySaved,
             whiteness: !isCurrentlySaved ? 12 : 0,
             blackness: !isCurrentlySaved ? 50 : 0
         },
         // Toggle rotation if needed, but usually we keep rotation for grid
         rotation: p.rotation
     })));
  };

  const updateGrid = (n: number) => {
      setLayout(prev => ({ ...prev, nUp: n as any }));
  };

  // --- Preview Renderer logic ---
  // Chunk pages for display
  const selectedPages = pages.filter(p => p.isSelected);
  const chunks = [];
  for (let i = 0; i < selectedPages.length; i += layout.nUp) {
    chunks.push(selectedPages.slice(i, i + layout.nUp));
  }
  // Limit preview to first 20 sheets to prevent DOM lag on massive files
  const previewChunks = chunks.slice(0, 20);


  return (
    <div className="w-full flex flex-col items-center animate-fade-in">
      
      {/* 1. Hero Action Area */}
      <div className="w-full max-w-3xl text-center mb-8 space-y-6">
        
        {!isCustomizing && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-2xl p-4 inline-flex items-center gap-3 animate-slide-up">
                <span className="flex items-center justify-center w-8 h-8 bg-green-500 text-white rounded-full">
                    <CheckCircle size={16} strokeWidth={3} />
                </span>
                <div className="text-left">
                    <p className="text-sm font-bold text-green-800 dark:text-green-300">
                        Ink Saver Mode Active
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                        {totalOriginalPages} slides condensed to <span className="font-bold">{pagesToPrint} pages</span>. (Saved {savingsPercent}%)
                    </p>
                </div>
            </div>
        )}

        {!isCustomizing ? (
            <div className="flex flex-col items-center gap-4">
                 <button 
                    onClick={handleDownload}
                    disabled={isGenerating}
                    className="group relative overflow-hidden bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-5 rounded-2xl font-bold text-xl shadow-xl shadow-indigo-200 dark:shadow-none hover:-translate-y-1 transition-all w-full sm:w-auto min-w-[300px]"
                >
                    <div className="relative z-10 flex items-center justify-center gap-3">
                        {isGenerating ? <Loader2 className="animate-spin" /> : <Download />}
                        {isGenerating ? "Processing..." : "Download Optimized PDF"}
                    </div>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </button>

                <button 
                    onClick={() => setIsCustomizing(true)}
                    className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white text-sm font-medium flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                >
                    <Settings size={14} /> Make Adjustments
                </button>
            </div>
        ) : (
            <div className="w-full bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-xl border border-gray-200 dark:border-zinc-800 p-6 animate-slide-up text-left">
                <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-zinc-800 pb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2"><Sliders size={18}/> Customization</h3>
                    <button onClick={() => setIsCustomizing(false)} className="text-xs font-bold bg-black text-white dark:bg-white dark:text-black px-3 py-1.5 rounded-lg hover:opacity-80">
                        Done
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Ink Saver Toggle */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Color Mode</label>
                        <button 
                            onClick={toggleInkSaver}
                            className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${pages[0].filters.invert ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-zinc-700'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${pages[0].filters.invert ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500'}`}>
                                    {pages[0].filters.invert ? <Moon size={20} /> : <Sun size={20} />}
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-sm text-gray-900 dark:text-white">Ink Saver</p>
                                    <p className="text-xs text-gray-500">{pages[0].filters.invert ? 'Active (Inverted Colors)' : 'Inactive (Original Colors)'}</p>
                                </div>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${pages[0].filters.invert ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'}`}>
                                {pages[0].filters.invert && <CheckCircle size={14} className="text-white" />}
                            </div>
                        </button>
                    </div>

                    {/* Grid Selection */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Slides per Page</label>
                        <div className="grid grid-cols-4 gap-2">
                            {[1, 2, 4, 6].map((n) => (
                                <button
                                    key={n}
                                    onClick={() => updateGrid(n)}
                                    className={`py-3 rounded-lg font-bold text-sm border-2 transition-all ${layout.nUp === n ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300'}`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* 2. Live Preview Section */}
      <div className="w-full max-w-[1200px] border-t border-gray-200 dark:border-zinc-800 pt-8">
          <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">
              Live Preview ({pagesToPrint} Pages)
          </p>
          
          <div className="flex flex-wrap justify-center gap-8 pb-20">
            {previewChunks.map((chunk, pageIndex) => (
                <div key={pageIndex} className="relative group">
                     {/* Page Number */}
                     <div className="absolute -left-8 top-0 text-xs font-mono text-gray-300 font-bold">#{pageIndex + 1}</div>

                     {/* A4 Page Container */}
                     <div className="w-[300px] aspect-[1/1.414] bg-white shadow-xl rounded-sm p-4 flex flex-wrap content-start ring-1 ring-gray-200 dark:ring-zinc-800 transition-transform group-hover:scale-[1.02]">
                        {/* Grid Logic */}
                        {Array.from({ length: layout.nUp }).map((_, i) => {
                            let widthClass = 'w-full';
                            let heightClass = 'h-full';
                            
                            if (layout.nUp === 2) heightClass = 'h-1/2';
                            if (layout.nUp === 4) { widthClass = 'w-1/2'; heightClass = 'h-1/2'; }
                            if (layout.nUp === 6) { widthClass = 'w-1/2'; heightClass = 'h-1/3'; }

                            const mockPage = chunk[i];

                            return (
                                <div key={i} className={`${widthClass} ${heightClass} p-1`}>
                                    <div className={`w-full h-full ${layout.showBorders ? 'border border-gray-900' : ''} bg-gray-50 flex items-center justify-center overflow-hidden relative`}>
                                        {mockPage && (
                                            <div 
                                                className="relative w-full h-full flex items-center justify-center"
                                                style={{ transform: `rotate(${mockPage.rotation}deg)` }}
                                            >
                                                <img 
                                                    src={mockPage.thumbnailDataUrl} 
                                                    className="max-w-full max-h-full object-contain"
                                                    style={{ 
                                                        filter: `
                                                            grayscale(${mockPage.filters.grayscale ? 1 : 0}) 
                                                            invert(${mockPage.filters.invert ? 1 : 0})
                                                            brightness(${1 + mockPage.filters.whiteness/100})
                                                            contrast(${1 + mockPage.filters.blackness/100})
                                                        `
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                     </div>
                </div>
            ))}
            
            {chunks.length > 20 && (
                <div className="w-full text-center text-gray-400 italic text-sm mt-4">
                    ... and {chunks.length - 20} more pages
                </div>
            )}
          </div>
      </div>

    </div>
  );
};
