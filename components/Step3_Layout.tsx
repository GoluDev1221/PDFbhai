
import React, { useState } from 'react';
import { LayoutSettings, PageItem } from '../types';
import { ArrowRight, RotateCw, GripVertical, Settings, List, Grid } from 'lucide-react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Step3Props {
  layout: LayoutSettings;
  setLayout: React.Dispatch<React.SetStateAction<LayoutSettings>>;
  onNext: () => void;
  pages: PageItem[];
  setPages: React.Dispatch<React.SetStateAction<PageItem[]>>;
}

// Sidebar Sortable Item for "Sequence" tab
const SidebarSortableItem: React.FC<{ id: string, page: PageItem }> = ({ id, page }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`
        flex items-center gap-3 p-2 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-700 
        ${isDragging ? 'opacity-50 shadow-lg' : 'hover:bg-gray-100 dark:hover:bg-zinc-800'}
      `}
    >
      <div 
        {...listeners} 
        {...attributes} 
        className="p-4 -m-2 cursor-grab active:cursor-grabbing text-gray-400 touch-none hover:text-indigo-600 transition-colors"
      >
        <GripVertical size={20} />
      </div>
      <img src={page.thumbnailDataUrl} className="w-8 h-10 object-cover rounded bg-white border border-gray-200" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">Pg {page.originalPageIndex + 1}</p>
      </div>
    </div>
  );
};


export const Step3_Layout: React.FC<Step3Props> = ({ layout, setLayout, onNext, pages, setPages }) => {
  const [sidebarTab, setSidebarTab] = useState<'config' | 'sequence'>('config');
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setPages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Chunk pages for display
  const totalPages = Math.ceil(selectedPages.length / layout.nUp);
  const pageChunks = [];
  for (let i = 0; i < totalPages; i++) {
    pageChunks.push(selectedPages.slice(i * layout.nUp, (i + 1) * layout.nUp));
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto animate-fade-in pb-20 px-2 sm:px-4">
      <h2 className="text-3xl font-bold text-center mb-12 text-gray-800 dark:text-white">Blueprint Configuration</h2>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start justify-center">
        
        {/* Sidebar Controls */}
        <div className="w-full lg:w-80 flex-shrink-0 bg-white dark:bg-[#1a1a1a] rounded-3xl shadow-xl border border-gray-100 dark:border-zinc-800 overflow-hidden flex flex-col h-[65vh] lg:h-[650px] lg:sticky lg:top-24">
            
            {/* Sidebar Tabs */}
            <div className="flex border-b border-gray-200 dark:border-zinc-800 flex-shrink-0">
                <button 
                    onClick={() => setSidebarTab('config')}
                    className={`flex-1 py-4 flex items-center justify-center gap-2 font-medium text-sm transition-colors ${sidebarTab === 'config' ? 'bg-indigo-50 dark:bg-zinc-800 text-indigo-600' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-900'}`}
                >
                    <Settings size={16} /> Config
                </button>
                <button 
                    onClick={() => setSidebarTab('sequence')}
                    className={`flex-1 py-4 flex items-center justify-center gap-2 font-medium text-sm transition-colors ${sidebarTab === 'sequence' ? 'bg-indigo-50 dark:bg-zinc-800 text-indigo-600' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-900'}`}
                >
                    <List size={16} /> Sequence
                </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                {sidebarTab === 'config' ? (
                    <div className="space-y-8">
                        
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Grid size={14} className="text-gray-500" />
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Grid Size (N-Up)
                                </label>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                                <button
                                key={n}
                                onClick={() => setLayout({ ...layout, nUp: n as any })}
                                className={`
                                    py-2 rounded-lg font-bold text-sm transition-all border-2
                                    ${layout.nUp === n 
                                    ? 'border-indigo-600 bg-indigo-600 text-white' 
                                    : 'border-gray-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-zinc-600 text-gray-600 dark:text-gray-400'}
                                `}
                                >
                                {n}
                                </button>
                            ))}
                            </div>
                            <p className="mt-2 text-[10px] text-gray-400">Default is 4 for economy.</p>
                        </div>

                        <div>
                            <label className="flex items-center gap-3 p-4 border rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors border-gray-200 dark:border-zinc-700">
                            <input 
                                type="checkbox" 
                                checked={layout.showBorders}
                                onChange={(e) => setLayout({ ...layout, showBorders: e.target.checked })}
                                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                            />
                            <span className="font-medium text-gray-700 dark:text-gray-200">Draw Cut Borders</span>
                            </label>
                        </div>
                        
                        <div className="text-sm text-gray-500 bg-gray-50 dark:bg-zinc-900 p-4 rounded-xl">
                            <p>Output Pages: <span className="font-bold text-indigo-600">{totalPages}</span></p>
                            <p className="mt-1">Slides: <span className="font-bold">{selectedPages.length}</span></p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2 pb-4">
                        <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-4">Drag to Reorder</p>
                        <DndContext 
                            sensors={sensors} 
                            collisionDetection={closestCenter} 
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext items={selectedPages.map(p => p.id)} strategy={verticalListSortingStrategy}>
                                {selectedPages.map(page => (
                                    <SidebarSortableItem key={page.id} id={page.id} page={page} />
                                ))}
                            </SortableContext>
                        </DndContext>
                    </div>
                )}
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-[#1a1a1a] z-10 flex-shrink-0">
                <button 
                    onClick={onNext}
                    className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                >
                    Start Production <ArrowRight size={20} />
                </button>
            </div>
        </div>

        {/* Visual Preview Area */}
        <div className="flex-1 w-full flex flex-col items-center min-w-0">
          <p className="mb-4 text-sm font-medium text-gray-400 uppercase tracking-widest text-center">Live Preview (Scrollable)</p>
          
          <div className="space-y-8 w-full max-h-[800px] overflow-y-auto pr-2 sm:pr-4 pb-20 custom-scrollbar flex flex-col items-center">
            {pageChunks.map((chunk, pageIndex) => (
                <div key={pageIndex} className="relative w-full max-w-[500px]">
                    {/* Page Number Label */}
                    <div className="absolute -left-0 -top-6 sm:-left-10 sm:top-0 text-xs font-mono text-gray-400">
                        #{pageIndex + 1}
                    </div>

                    {/* A4 Paper Representation - Responsive Width */}
                    <div className="relative w-full aspect-[1/1.414] bg-white shadow-2xl rounded-sm p-4 sm:p-8 flex flex-wrap content-start ring-1 ring-gray-200 dark:ring-zinc-800">
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

                            const mockPage = chunk[i]; 

                            return (
                                <div 
                                    key={i} 
                                    className={`${widthClass} ${heightClass} p-1 sm:p-2 flex items-center justify-center transition-all duration-300`}
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
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
