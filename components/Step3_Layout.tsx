
import React from 'react';
import { LayoutSettings, PageItem } from '../types';
import { ArrowRight, RotateCw } from 'lucide-react';

interface Step3Props {
  layout: LayoutSettings;
  setLayout: React.Dispatch<React.SetStateAction<LayoutSettings>>;
  onNext: () => void;
  pages: PageItem[];
  // We need to update pages state to handle rotation
  setPages: React.Dispatch<React.SetStateAction<PageItem[]>>;
}

export const Step3_Layout: React.FC<Step3Props> = ({ layout, setLayout, onNext, pages, setPages }) => {
  const selectedPages = pages.filter(p => p.isSelected);

  const rotatePage = (pageId: string) => {
    setPages(prev => prev.map(p => {
        if (p.id === pageId) {
            const nextRotation = (p.rotation + 90) % 360 as 0 | 90 | 180 | 270;
            return { ...p, rotation: nextRotation };
        }
        return p;
    }));
  };

  return (
    <div className="w-full max-w-6xl mx-auto animate-fade-in pb-20">
      <h2 className="text-3xl font-bold text-center mb-12 text-gray-800 dark:text-white">Blueprint Configuration</h2>

      <div className="flex flex-col md:flex-row gap-12 items-start justify-center">
        
        {/* Controls */}
        <div className="w-full md:w-80 space-y-8 bg-white dark:bg-[#1a1a1a] p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-zinc-800">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wider">
              Slides Per Page (N-Up)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <button
                  key={n}
                  onClick={() => setLayout({ ...layout, nUp: n as any })}
                  className={`
                    py-3 rounded-lg font-bold text-sm transition-all border-2
                    ${layout.nUp === n 
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' 
                      : 'border-gray-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-zinc-600'}
                  `}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-3 p-4 border rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors border-gray-200 dark:border-zinc-700">
              <input 
                type="checkbox" 
                checked={layout.showBorders}
                onChange={(e) => setLayout({ ...layout, showBorders: e.target.checked })}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <span className="font-medium text-gray-700 dark:text-gray-200">Draw Borders</span>
            </label>
          </div>

          <div className="pt-8 text-sm text-gray-500">
             <p>Total Output Pages: <span className="font-bold text-indigo-600">{Math.ceil(selectedPages.length / layout.nUp)}</span></p>
          </div>

          <button 
            onClick={onNext}
            className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
          >
            Start Production <ArrowRight size={20} />
          </button>
        </div>

        {/* Visual Preview */}
        <div className="flex-1 w-full flex flex-col items-center">
          <p className="mb-4 text-sm font-medium text-gray-400 uppercase tracking-widest">Live Preview (Hover to Rotate)</p>
          
          {/* A4 Paper Representation */}
          <div className="relative w-[400px] h-[565px] bg-white shadow-2xl rounded-sm p-8 transition-all duration-500 flex flex-wrap content-start">
            {/* Grid Logic */}
            {Array.from({ length: layout.nUp }).map((_, i) => {
              // Determine grid sizing based on N-up
              let widthClass = 'w-full';
              let heightClass = 'h-full';
              
              if (layout.nUp === 2) heightClass = 'h-1/2';
              if (layout.nUp === 3) heightClass = 'h-1/3';
              if (layout.nUp === 4) { widthClass = 'w-1/2'; heightClass = 'h-1/2'; }
              if (layout.nUp === 5 || layout.nUp === 6) { widthClass = 'w-1/2'; heightClass = 'h-1/3'; }
              if (layout.nUp === 7 || layout.nUp === 8) { widthClass = 'w-1/2'; heightClass = 'h-1/4'; }

              const mockPage = selectedPages[i % selectedPages.length]; 

              return (
                <div 
                  key={i} 
                  className={`${widthClass} ${heightClass} p-2 flex items-center justify-center transition-all duration-300`}
                >
                  <div className={`w-full h-full relative group/item ${layout.showBorders ? 'border border-gray-900' : ''} flex items-center justify-center overflow-hidden bg-gray-100`}>
                     {mockPage ? (
                        <>
                            <div 
                                className="relative w-full h-full flex items-center justify-center"
                                style={{ transform: `rotate(${mockPage.rotation}deg)`, transition: 'transform 0.3s' }}
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
                                {mockPage.drawingDataUrl && (
                                     <img 
                                        src={mockPage.drawingDataUrl} 
                                        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                                    />
                                )}
                            </div>
                            
                            {/* Rotate Overlay Button */}
                            <button 
                                onClick={() => rotatePage(mockPage.id)}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center text-white"
                                title="Rotate"
                            >
                                <RotateCw size={24} />
                            </button>
                        </>
                     ) : (
                         <span className="text-gray-300 text-xs">Empty</span>
                     )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
