import React, { useEffect, useRef, useState } from 'react';
import { LiveClient } from '../services/liveClient';
import { Button } from './Button';

export const LiveMode: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [client, setClient] = useState<LiveClient | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // Initialize client
  useEffect(() => {
    const newClient = new LiveClient();
    setClient(newClient);
    return () => {
      newClient.stop();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const drawVisualizer = (data: Float32Array) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = 'rgb(17, 24, 39)'; // Matches gray-900
    ctx.fillRect(0, 0, width, height);

    const barWidth = (width / data.length) * 2.5;
    let x = 0;

    for (let i = 0; i < data.length; i++) {
      const v = Math.abs(data[i]); 
      const barHeight = v * height * 5; // Scale up

      // Gradient color based on height/amplitude
      const hue = 240 - (v * 1000); // Blue to purple
      ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;

      ctx.fillRect(x, height / 2 - barHeight / 2, barWidth, barHeight);
      x += barWidth + 1;
    }
  };

  const handleToggleConnection = async () => {
    if (!client) return;

    if (isConnected) {
      await client.stop();
      setIsConnected(false);
      setStatus('disconnected');
      // Clear canvas
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else {
      setStatus('connecting');
      try {
        client.setCallbacks(
          () => {
            setIsConnected(true);
            setStatus('connected');
          },
          () => {
            setIsConnected(false);
            setStatus('disconnected');
          },
          (data) => {
            // Decimate data for visualization performance
            const decimated = new Float32Array(64);
            const step = Math.floor(data.length / 64);
            for(let i=0; i<64; i++) {
                decimated[i] = data[i * step];
            }
            // Use requestAnimationFrame for smoother updates implicitly, 
            // though here we call directly on data arrival. 
            // For a production app, buffer and sync with RAF loop.
            requestAnimationFrame(() => drawVisualizer(decimated));
          }
        );
        await client.connect();
      } catch (error) {
        console.error("Connection failed", error);
        setStatus('disconnected');
        alert("Failed to connect to Live API. Check console and API Key.");
      }
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl relative overflow-hidden">
      {/* Background decoration */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl transition-opacity duration-1000 ${isConnected ? 'opacity-100 animate-pulse' : 'opacity-0'}`}></div>

      <div className="z-10 text-center space-y-8 max-w-lg w-full">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-white">Gemini Live</h2>
          <p className="text-gray-400">Real-time multimodal conversation</p>
        </div>

        {/* Visualizer Container */}
        <div className="h-48 w-full bg-gray-950/50 rounded-2xl border border-gray-800 flex items-center justify-center overflow-hidden relative backdrop-blur-sm">
           <canvas 
             ref={canvasRef} 
             width={500} 
             height={200} 
             className="w-full h-full"
           />
           {!isConnected && status !== 'connecting' && (
             <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
               Visualizer Ready
             </div>
           )}
        </div>

        <div className="flex flex-col items-center gap-4">
          <Button 
            onClick={handleToggleConnection}
            variant={isConnected ? 'danger' : 'primary'}
            className="w-48 h-12 text-lg rounded-full"
            isLoading={status === 'connecting'}
          >
            {isConnected ? 'Disconnect' : 'Start Conversation'}
          </Button>
          
          <div className="flex items-center gap-2 text-sm">
            <span className={`w-2 h-2 rounded-full ${
              status === 'connected' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 
              status === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
            }`}></span>
            <span className="text-gray-400 uppercase tracking-wider text-xs font-semibold">
              {status}
            </span>
          </div>
        </div>

        <div className="text-xs text-gray-500 border-t border-gray-800 pt-6">
          <p>Requires microphone access.</p>
          <p>Model: <code className="text-indigo-400">gemini-2.5-flash-native-audio-preview</code></p>
        </div>
      </div>
    </div>
  );
};