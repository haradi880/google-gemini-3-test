import React, { useState, useEffect, useRef } from 'react';
import { generateProject, editProject } from '../services/gemini';
import { ProjectFile } from '../types';
import { Button } from './Button';
import JSZip from 'jszip';

export const BuilderMode: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Vision/Media state
  const [selectedMedia, setSelectedMedia] = useState<{ data: string; mimeType: string; preview: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Extract base64 and mime
        const base64Data = result.split(',')[1];
        const mimeType = result.substring(result.indexOf(':') + 1, result.indexOf(';'));
        
        setSelectedMedia({
          data: base64Data,
          mimeType: mimeType,
          preview: result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const clearMedia = () => {
    setSelectedMedia(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !selectedMedia) return;
    setIsLoading(true);
    try {
      const mediaPayload = selectedMedia ? { data: selectedMedia.data, mimeType: selectedMedia.mimeType } : undefined;
      const generatedFiles = await generateProject(prompt, mediaPayload);
      setFiles(generatedFiles);
      if (generatedFiles.length > 0) {
        setSelectedFileIndex(0);
        setViewMode('preview');
      }
      // Optional: Clear media after generation, or keep it for reference? Keeping for now.
    } catch (error) {
      console.error("Generation error:", error);
      alert("Failed to generate project. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!prompt.trim() || files.length === 0) return;
    setIsLoading(true);
    try {
      const updatedFiles = await editProject(files, prompt);
      setFiles(updatedFiles);
      setPrompt(''); // Clear prompt after edit
    } catch (error) {
      console.error("Edit error:", error);
      alert("Failed to update project.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    const zip = new JSZip();
    files.forEach(file => {
      zip.file(file.name, file.content);
    });
    
    try {
      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = "gemini-project.zip";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Zip error:", error);
      alert("Failed to create zip file.");
    }
  };

  // Construct preview HTML
  useEffect(() => {
    if (viewMode === 'preview' && files.length > 0 && iframeRef.current) {
      const indexHtml = files.find(f => f.name.endsWith('.html')) || files[0];
      const cssFile = files.find(f => f.name.endsWith('.css'));
      const jsFile = files.find(f => f.name.endsWith('.js'));
      
      let content = indexHtml.content;

      // Inlining CSS
      if (cssFile) {
        if (content.includes('</head>')) {
          content = content.replace('</head>', `<style>${cssFile.content}</style></head>`);
        } else {
          // Fallback if generated HTML is malformed or missing head
          content = `<style>${cssFile.content}</style>${content}`;
        }
      }
      
      // Inlining JS
      if (jsFile) {
        if (content.includes('</body>')) {
          content = content.replace('</body>', `<script>${jsFile.content}</script></body>`);
        } else {
          // Fallback if generated HTML is malformed or missing body
          content = `${content}<script>${jsFile.content}</script>`;
        }
      }

      // Basic protection against infinite loops in user code
      // We use srcdoc here. Combined with the sandbox attribute below (without allow-same-origin),
      // this creates a unique opaque origin, preventing access to the parent's DOM/storage.
      iframeRef.current.srcdoc = content;
    }
  }, [files, viewMode]);

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6 p-4">
      {/* Left Panel: Controls & File List */}
      <div className="w-full lg:w-1/3 flex flex-col gap-4 bg-gray-900 p-4 rounded-2xl border border-gray-800 shadow-xl overflow-hidden">
        <h2 className="text-xl font-bold text-white mb-2">Project Builder</h2>
        
        <div className="flex flex-col gap-2">
            <div className="relative">
                <textarea
                    className={`w-full ${selectedMedia ? 'h-24' : 'h-32'} bg-gray-800 text-white rounded-lg p-3 border border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none`}
                    placeholder="Describe your app or upload a mockup..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                />
                
                {/* Media Preview inside textarea container */}
                {selectedMedia && (
                    <div className="absolute bottom-3 left-3 flex items-center bg-gray-900 rounded-md p-1 border border-gray-700 shadow-sm">
                        {selectedMedia.mimeType.startsWith('video') ? (
                            <div className="w-10 h-10 flex items-center justify-center bg-gray-800 rounded">
                                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </div>
                        ) : (
                            <img src={selectedMedia.preview} alt="Reference" className="w-10 h-10 object-cover rounded" />
                        )}
                        <span className="text-xs text-gray-300 mx-2 max-w-[100px] truncate">Reference</span>
                        <button 
                            onClick={clearMedia}
                            className="text-gray-400 hover:text-red-400 p-1"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Attach Button */}
                <div className="absolute bottom-3 right-3">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-gray-400 hover:text-white bg-gray-700/50 hover:bg-gray-700 rounded-full transition-colors"
                        title="Attach image or video reference"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*,video/*"
                        onChange={handleMediaUpload}
                    />
                </div>
            </div>

          <div className="flex gap-2">
            <Button onClick={files.length > 0 ? handleEdit : handleGenerate} isLoading={isLoading} className="flex-1">
              {files.length > 0 ? 'Update with AI' : 'Generate Project'}
            </Button>
            {files.length > 0 && (
              <Button variant="secondary" onClick={handleDownload} title="Download ZIP">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </Button>
            )}
          </div>
        </div>

        {/* File Explorer */}
        {files.length > 0 && (
          <div className="flex-1 overflow-hidden flex flex-col mt-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Project Files</h3>
            <div className="flex-1 overflow-y-auto bg-gray-800 rounded-xl border border-gray-700">
              {files.map((file, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedFileIndex(idx);
                    setViewMode('code');
                  }}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-700 transition-colors ${
                    selectedFileIndex === idx && viewMode === 'code' ? 'bg-gray-700 border-l-4 border-indigo-500' : ''
                  }`}
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="truncate text-sm font-medium text-gray-200">{file.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Panel: Preview & Editor */}
      <div className="flex-1 bg-gray-900 rounded-2xl border border-gray-800 shadow-xl overflow-hidden flex flex-col">
        {files.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 text-center">
            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-4">
               <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
               </svg>
            </div>
            <p className="text-lg font-medium">Ready to Build</p>
            <p className="max-w-md mt-2">Enter a prompt or upload a design screenshot/wireframe to generate a complete web application powered by Gemini 3.</p>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="h-12 border-b border-gray-800 bg-gray-900 flex items-center px-4 gap-4">
              <button
                onClick={() => setViewMode('preview')}
                className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                  viewMode === 'preview' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setViewMode('code')}
                className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                  viewMode === 'code' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                Code
              </button>
              {viewMode === 'code' && (
                <span className="ml-auto text-xs text-gray-500 font-mono">
                  {files[selectedFileIndex]?.name}
                </span>
              )}
            </div>

            {/* Content Area */}
            <div className="flex-1 relative bg-white">
              {viewMode === 'preview' ? (
                <iframe
                  ref={iframeRef}
                  title="Preview"
                  className="w-full h-full border-none bg-white"
                  sandbox="allow-scripts allow-forms allow-modals allow-popups"
                />
              ) : (
                <textarea
                  className="w-full h-full p-4 font-mono text-sm bg-[#1e1e1e] text-[#d4d4d4] resize-none focus:outline-none"
                  value={files[selectedFileIndex]?.content || ''}
                  readOnly
                  spellCheck={false}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};