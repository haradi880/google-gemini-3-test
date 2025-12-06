import React, { useState, useRef } from 'react';
import { generateVisionContent } from '../services/gemini';
import { Button } from './Button';

export const VisionMode: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setResult(''); // Clear previous result
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;

    setIsLoading(true);
    setResult('');
    
    try {
      // Extract base64 data (remove "data:image/jpeg;base64," prefix)
      const base64Data = selectedImage.split(',')[1];
      const mimeType = selectedImage.substring(selectedImage.indexOf(':') + 1, selectedImage.indexOf(';'));
      
      const text = await generateVisionContent(prompt, base64Data, mimeType);
      setResult(text);
    } catch (error) {
      console.error("Vision error", error);
      setResult("Error analyzing image. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 p-4">
      {/* Input Section */}
      <div className="flex-1 flex flex-col gap-6 bg-gray-900 p-6 rounded-2xl shadow-xl border border-gray-800 overflow-y-auto">
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Image Input</h2>
          <div 
            className={`border-2 border-dashed rounded-xl h-64 flex flex-col items-center justify-center cursor-pointer transition-colors ${
              selectedImage ? 'border-indigo-500 bg-gray-800' : 'border-gray-700 hover:border-gray-500 hover:bg-gray-800/50'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            {selectedImage ? (
              <img src={selectedImage} alt="Selected" className="h-full object-contain rounded-lg" />
            ) : (
              <div className="text-center text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p>Click to upload an image</p>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleImageUpload}
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-300 mb-2 text-sm font-medium">Prompt (Optional)</label>
          <textarea 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe this image, or ask a question about it..."
            className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none h-24 resize-none"
          />
        </div>

        <Button 
          onClick={handleAnalyze} 
          disabled={!selectedImage || isLoading}
          className="w-full"
        >
          {isLoading ? 'Analyzing...' : 'Analyze Image'}
        </Button>
      </div>

      {/* Result Section */}
      <div className="flex-1 bg-gray-900 p-6 rounded-2xl shadow-xl border border-gray-800 overflow-hidden flex flex-col">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span>Analysis Result</span>
          {result && <span className="text-xs px-2 py-1 bg-green-900 text-green-300 rounded-full">Completed</span>}
        </h2>
        <div className="flex-1 bg-gray-800 rounded-xl p-4 overflow-y-auto text-gray-200 whitespace-pre-wrap leading-relaxed border border-gray-700">
          {result ? result : (
            <div className="h-full flex items-center justify-center text-gray-500 italic">
              Results will appear here...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};