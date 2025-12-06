import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

export class LiveClient {
  private ai: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputNode: GainNode | null = null;
  private outputNode: GainNode | null = null;
  private sources: Set<AudioBufferSourceNode> = new Set();
  private nextStartTime: number = 0;
  private stream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  
  private onFrequencyData?: (data: Float32Array) => void;
  private onConnect?: () => void;
  private onDisconnect?: () => void;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  public setCallbacks(
    onConnect: () => void,
    onDisconnect: () => void,
    onFrequencyData: (data: Float32Array) => void
  ) {
    this.onConnect = onConnect;
    this.onDisconnect = onDisconnect;
    this.onFrequencyData = onFrequencyData;
  }

  public async connect() {
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    this.inputNode = this.inputAudioContext.createGain();
    this.outputNode = this.outputAudioContext.createGain();
    this.outputNode.connect(this.outputAudioContext.destination);

    // Get microphone access
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Connect to Gemini Live
    this.sessionPromise = this.ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: this.handleOpen.bind(this),
        onmessage: this.handleMessage.bind(this),
        onclose: this.handleClose.bind(this),
        onerror: (e) => console.error("Live API Error:", e),
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
        systemInstruction: "You are a helpful, concise, and futuristic AI assistant named Nexus.",
      },
    });
  }

  private handleOpen() {
    if (this.onConnect) this.onConnect();
    this.startAudioInput();
  }

  private startAudioInput() {
    if (!this.inputAudioContext || !this.stream || !this.sessionPromise) return;

    const source = this.inputAudioContext.createMediaStreamSource(this.stream);
    // Use ScriptProcessor for raw PCM access (standard for this API usage per docs)
    this.scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
    
    this.scriptProcessor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Emit frequency data for visualization
      if (this.onFrequencyData) {
        this.onFrequencyData(inputData);
      }

      const pcmBlob = this.createBlob(inputData);
      this.sessionPromise!.then((session) => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(message: LiveServerMessage) {
    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (base64Audio && this.outputAudioContext && this.outputNode) {
        this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
        
        const audioBuffer = await this.decodeAudioData(
            this.decode(base64Audio),
            this.outputAudioContext,
            24000,
            1
        );

        const source = this.outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.outputNode);
        source.addEventListener('ended', () => {
            this.sources.delete(source);
        });

        source.start(this.nextStartTime);
        this.nextStartTime += audioBuffer.duration;
        this.sources.add(source);
    }

    if (message.serverContent?.interrupted) {
        this.sources.forEach(source => source.stop());
        this.sources.clear();
        this.nextStartTime = 0;
    }
  }

  private handleClose() {
    if (this.onDisconnect) this.onDisconnect();
    this.stop();
  }

  public async stop() {
    if (this.scriptProcessor) this.scriptProcessor.disconnect();
    if (this.stream) this.stream.getTracks().forEach(track => track.stop());
    if (this.inputAudioContext) await this.inputAudioContext.close();
    if (this.outputAudioContext) await this.outputAudioContext.close();
    
    this.sources.forEach(source => source.stop());
    this.sources.clear();
    
    if (this.sessionPromise) {
      await this.sessionPromise.then(session => session.close());
    }
    this.sessionPromise = null;
  }

  // --- Helpers ---

  private createBlob(data: Float32Array) {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    const uint8 = new Uint8Array(int16.buffer);
    return {
      data: this.encode(uint8),
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  private encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private async decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }
}