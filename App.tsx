
import React, { useState } from 'react';
import { Stepper } from './components/Stepper';
import { Step1_Upload } from './components/Step1_Upload';
import { Step2_Workshop } from './components/Step2_Workshop';
import { Step3_Layout } from './components/Step3_Layout';
import { Step4_Download } from './components/Step4_Download';
import { AppStep, UploadedFile, PageItem, LayoutSettings } from './types';
import { loadPdfFile, renderPageToThumbnail } from './services/pdfService';

const App: React.FC = () => {
  // --- Global State ---
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.UPLOAD);
  const [files, setFiles] = useState<Record<string, UploadedFile>>({});
  const [pages, setPages] = useState<PageItem[]>([]);
  const [layout, setLayout] = useState<LayoutSettings>({ nUp: 1, showBorders: false });
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

  const generateThumbnailsAndTransition = async () => {
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
            filters: {
              invert: false,
              grayscale: false,
              whiteness: 0,
              blackness: 0
            },
            drawingDataUrl: null,
            rotation: 0
          });
        }
      }
      
      setPages(newPages);
      setCurrentStep(AppStep.WORKSHOP);
    } catch (e) {
      console.error(e);
      alert("Error preparing workshop");
    } finally {
      setIsProcessingUpload(false);
    }
  };

  const resetApp = () => {
    setFiles({});
    setPages([]);
    setLayout({ nUp: 1, showBorders: false });
    setCurrentStep(AppStep.UPLOAD);
  };

  // --- Render ---

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0f0f0f] text-gray-900 dark:text-gray-100 font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-[#fafafa]/80 dark:bg-[#0f0f0f]/80 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              P
            </div>
            <span className="font-bold text-xl tracking-tight">PDFbhai</span>
          </div>
          <div className="text-xs font-mono text-gray-400">Privacy-First. Local. Fast.</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-32 px-6 pb-20">
        <Stepper currentStep={currentStep} />
        
        <div className="min-h-[60vh]">
          {currentStep === AppStep.UPLOAD && (
            <Step1_Upload 
              files={Object.values(files)} 
              onFilesAdded={handleFilesAdded} 
              onFileRemoved={handleFileRemoved}
              onNext={generateThumbnailsAndTransition}
              isProcessing={isProcessingUpload}
            />
          )}

          {currentStep === AppStep.WORKSHOP && (
            <Step2_Workshop 
              pages={pages} 
              setPages={setPages} 
              onNext={() => setCurrentStep(AppStep.LAYOUT)} 
            />
          )}

          {currentStep === AppStep.LAYOUT && (
            <Step3_Layout 
              layout={layout} 
              setLayout={setLayout} 
              onNext={() => setCurrentStep(AppStep.DOWNLOAD)} 
              pages={pages}
              setPages={setPages}
            />
          )}

          {currentStep === AppStep.DOWNLOAD && (
            <Step4_Download 
              pages={pages} 
              files={files} 
              layout={layout} 
              onReset={resetApp} 
            />
          )}
        </div>
      </main>

    </div>
  );
};

export default App;
