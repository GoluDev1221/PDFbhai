import React, { useCallback } from 'react';
import { UploadCloud, FileText, X } from 'lucide-react';
import { UploadedFile } from '../types';

interface Step1Props {
  files: UploadedFile[];
  onFilesAdded: (files: File[]) => void;
  onFileRemoved: (id: string) => void;
  onNext: () => void;
  isProcessing: boolean;
}

export const Step1_Upload: React.FC<Step1Props> = ({ files, onFilesAdded, onFileRemoved, onNext, isProcessing }) => {
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFiles = (Array.from(e.dataTransfer.files) as File[]).filter(f => f.type === 'application/pdf');
    if (droppedFiles.length > 0) {
      onFilesAdded(droppedFiles);
    }
  }, [onFilesAdded]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = (Array.from(e.target.files) as File[]).filter(f => f.type === 'application/pdf');
      onFilesAdded(selectedFiles);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in">
      <div 
        className="
          group relative w-full h-80 border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-3xl 
          bg-gray-50/50 dark:bg-zinc-900/50 flex flex-col items-center justify-center 
          transition-all duration-300 hover:border-indigo-500 hover:bg-indigo-50/10 dark:hover:bg-indigo-900/10
          cursor-pointer
        "
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => document.getElementById('fileInput')?.click()}
      >
        <input 
          id="fileInput" 
          type="file" 
          multiple 
          accept=".pdf" 
          className="hidden" 
          onChange={handleInputChange}
        />
        
        <div className="p-6 rounded-full bg-white dark:bg-zinc-800 shadow-xl mb-6 group-hover:scale-110 transition-transform duration-300">
          <UploadCloud className="w-10 h-10 text-indigo-600" />
        </div>
        <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-2">Drop your PDFs here</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">or click to browse from your device</p>
      </div>

      {files.length > 0 && (
        <div className="mt-12 animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-medium text-gray-700 dark:text-gray-200">Collected Files ({files.length})</h4>
            <button 
              onClick={onNext}
              disabled={isProcessing}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-medium shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              {isProcessing ? 'Reading Files...' : 'Enter Workshop ->'}
            </button>
          </div>
          
          <div className="grid gap-4">
            {files.map(file => (
              <div key={file.id} className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500">
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white truncate max-w-md">{file.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB • {file.pageCount} pages</p>
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); onFileRemoved(file.id); }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
