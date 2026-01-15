
import React, { useState } from 'react';
import { Step1_Upload } from './components/Step1_Upload';
import { Dashboard } from './components/Dashboard';
import { LegalFooter } from './components/LegalFooter';
import { AppStep, UploadedFile, PageItem, LayoutSettings } from './types';
import { loadPdfFile, renderPageToThumbnail } from './services/pdfService';

const App: React.FC = () => {
  // --- Global State ---
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.UPLOAD);
  const [files, setFiles] = useState<Record<string, UploadedFile>>({});
  const [pages, setPages] = useState<PageItem[]>([]);
  // DEFAULT: 4-Up Grid + Borders enabled
  const [layout, setLayout] = useState<LayoutSettings>({ nUp: 4, showBorders: true, showPageNumbers: false });
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);

  // --- Handlers ---

  const handleFilesAdded = async (newFiles: File[]) => {
    setIsProcessingUpload(true);
    try {
      const processedFiles: Record<string, UploadedFile> = {};
      
      // 1. Process Files
      for (const f of newFiles) {
        const fileData = await loadPdfFile(f);
        processedFiles[fileData.id] = fileData;
      }

      setFiles(prev => ({ ...prev, ...processedFiles }));

    } catch (error) {
      console.error("Error loading files:", error);
      alert("Failed to load PDF file.");
    } finally {
      setIsProcessingUpload(false);
    }
  };

  const handleFileRemoved = (id: string) => {
    const newFiles = { ...files };
    delete newFiles[id];
    setFiles(newFiles);
  };

  const generateThumbnailsAndGo = async () => {
    if (Object.keys(files).length === 0) return;
    setIsProcessingUpload(true);
    
    try {
      const newPages: PageItem[] = [];
      
      // Iterate all files and render every page
      for (const fileId in files) {
        const file = files[fileId];
        for (let i = 0; i < file.pageCount; i++) {
          const { dataUrl, width, height } = await renderPageToThumbnail(file.data, i);
          
          newPages.push({
            id: crypto.randomUUID(),
            fileId: file.id,
            originalPageIndex: i,
            thumbnailDataUrl: dataUrl,
            width,
            height,
            isSelected: true, // Select all by default
            
            // --- AUTOMATION MAGIC HAPPENS HERE ---
            // We assume the user wants Ink Saver Mode by default.
            filters: {
              invert: true,
              grayscale: true,
              whiteness: 12,  // Slight brightness boost
              blackness: 50   // High contrast
            },
            drawingDataUrl: null,
            // We assume landscape slides need 90deg rotation to fit on A4 portrait grid
            rotation: 90 
          });
        }
      }
      
      setPages(newPages);
      // Move directly to Dashboard
      setCurrentStep(AppStep.DASHBOARD);
      
    } catch (e) {
      console.error(e);
      alert("Error preparing files");
    } finally {
      setIsProcessingUpload(false);
    }
  };

  const resetApp = () => {
    setFiles({});
    setPages([]);
    setLayout({ nUp: 4, showBorders: true, showPageNumbers: false });
    setCurrentStep(AppStep.UPLOAD);
  };

  // --- Render ---

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0f0f0f] text-gray-900 dark:text-gray-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col">
      
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-[#fafafa]/80 dark:bg-[#0f0f0f]/80 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
                src="/logo.png" 
                alt="PDFbhai Logo" 
                className="w-8 h-8 rounded-lg object-contain bg-indigo-600"
                onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
            />
            <div className="hidden w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">P</div>
            <span className="font-bold text-xl tracking-tight">PDFbhai</span>
          </div>
          <div className="flex items-center gap-4">
             {currentStep === AppStep.DASHBOARD && (
                 <button onClick={resetApp} className="text-sm font-medium text-gray-500 hover:text-red-500 transition-colors">
                     Start Over
                 </button>
             )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 px-4 sm:px-6 pb-20 flex-1 w-full max-w-[1920px] mx-auto flex flex-col items-center">
        
        {currentStep === AppStep.UPLOAD && (
          <div className="w-full max-w-4xl mt-10">
              <Step1_Upload 
                files={Object.values(files)} 
                onFilesAdded={handleFilesAdded} 
                onFileRemoved={handleFileRemoved}
                onNext={generateThumbnailsAndGo}
                isProcessing={isProcessingUpload}
              />
          </div>
        )}

        {currentStep === AppStep.DASHBOARD && (
          <Dashboard 
            pages={pages}
            setPages={setPages}
            files={files} 
            layout={layout}
            setLayout={setLayout}
            onReset={resetApp}
          />
        )}
      </main>

      <LegalFooter />
    </div>
  );
};

export default App;
