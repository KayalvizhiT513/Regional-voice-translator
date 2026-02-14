
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Volume2, Copy, Trash2, Loader2, StopCircle } from 'lucide-react';
import { GoogleGenAI, Modality, LiveServerMessage, Blob } from "@google/genai";
import AudioVisualizer from './AudioVisualizer';

interface TranslatorCardProps {
  label: string;
  value: string;
  placeholder?: string;
  onChange?: (val: string) => void;
  onAction?: () => void;
  isLoading?: boolean;
  type: 'input' | 'output';
  autoPlay?: boolean;
  onSpeechInput?: (text: string) => void;
  onCopy?: () => void;
  onClear?: () => void;
}

// Audio utility functions
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

const TranslatorCard: React.FC<TranslatorCardProps> = ({
  label,
  value,
  placeholder,
  onChange,
  onAction,
  isLoading,
  type,
  autoPlay,
  onSpeechInput,
  onCopy,
  onClear
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const liveSessionRef = useRef<any>(null);
  const recordingContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  
  // Ref to track the last played value to avoid re-playing same value on render
  const lastPlayedValueRef = useRef<string>('');

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  // Auto-play logic for output cards
  useEffect(() => {
    if (type === 'output' && autoPlay && value && value !== lastPlayedValueRef.current && !isLoading) {
      handleSpeak();
      lastPlayedValueRef.current = value;
    }
  }, [value, isLoading, autoPlay, type]);

  const stopRecording = () => {
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (recordingContextRef.current) {
      recordingContextRef.current.close();
      recordingContextRef.current = null;
    }
    if (liveSessionRef.current) {
      try { liveSessionRef.current.close(); } catch(e) {}
      liveSessionRef.current = null;
    }
    setIsRecording(false);
  };

  const handleMicClick = async () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    try {
      setIsRecording(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      recordingContextRef.current = inputCtx;
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = inputCtx.createMediaStreamSource(stream);
      const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = scriptProcessor;

      let transcriptionBuffer = "";

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              transcriptionBuffer += text;
              if (onSpeechInput) {
                onSpeechInput(transcriptionBuffer);
              }
            }
          },
          onerror: (e) => {
            console.error('Live API Error:', e);
            stopRecording();
          },
          onclose: () => {
            stopRecording();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          systemInstruction: "Transcribe the user's speech exactly as spoken. Do not translate."
        }
      });

      liveSessionRef.current = await sessionPromise;

    } catch (err) {
      console.error("Microphone access error:", err);
      setIsRecording(false);
    }
  };

  const handleSpeak = async () => {
    if (!value || isPlaying) return;
    setIsPlaying(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: { parts: [{ text: value }] },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { 
              prebuiltVoiceConfig: { 
                voiceName: label === 'Hindi' ? 'Puck' : 'Kore' 
              } 
            },
          },
        },
      });

      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!audioData) throw new Error("No audio data");

      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      } else if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      const binaryString = atob(audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      
      const dataInt16 = new Int16Array(bytes.buffer);
      const buffer = audioContextRef.current.createBuffer(1, dataInt16.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;

      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => setIsPlaying(false);
      source.start();
    } catch (error) {
      console.error("TTS Error:", error);
      setIsPlaying(false);
    }
  };

  return (
    <div className="group relative bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden transition-all hover:shadow-md h-[300px] flex flex-col">
      <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/20">
        <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{label}</span>
        {isLoading && type === 'output' && <Loader2 size={14} className="animate-spin text-indigo-500" />}
      </div>

      <div className="flex-1 relative p-6">
        {type === 'input' ? (
          <textarea
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            className="w-full h-full bg-transparent border-none focus:ring-0 text-xl md:text-2xl text-zinc-900 dark:text-white placeholder-zinc-300 dark:placeholder-zinc-700 resize-none font-medium leading-relaxed"
          />
        ) : (
          <div className={`w-full h-full overflow-y-auto text-xl md:text-2xl font-medium leading-relaxed ${value ? 'text-zinc-900 dark:text-white' : 'text-zinc-300 dark:text-zinc-700'}`}>
            {value || placeholder}
          </div>
        )}

        {/* Dynamic Wave Overlay */}
        {(isRecording || isPlaying) && (
          <div className="absolute inset-x-0 bottom-0 h-16 pointer-events-none opacity-40">
            <AudioVisualizer isPlaying={true} color={isRecording ? "#ef4444" : "#4f46e5"} />
          </div>
        )}
      </div>

      <div className="p-4 bg-zinc-50/50 dark:bg-zinc-800/20 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex gap-2">
          {type === 'input' ? (
            <button
              onClick={handleMicClick}
              className={`p-3 rounded-full transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/20' : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
              title={isRecording ? "Stop Listening" : "Start Voice Input"}
            >
              {isRecording ? <StopCircle size={18} /> : <Mic size={18} />}
            </button>
          ) : (
            <button
              onClick={handleSpeak}
              disabled={!value || isPlaying}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                isPlaying 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30'
              }`}
              title={label === 'Hindi' ? "Speak Hindi" : "Listen to translation"}
            >
              <Volume2 size={18} className={isPlaying ? 'animate-pulse' : ''} />
              {label === 'Hindi' && <span className="text-xs font-bold uppercase tracking-wider">Speak Hindi</span>}
            </button>
          )}

          {type === 'output' && value && (
            <button
              onClick={onCopy}
              className="p-3 rounded-full bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
              title="Copy translation"
            >
              <Copy size={18} />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          {type === 'input' && value && !isRecording && (
            <button
              onClick={onAction}
              disabled={isLoading}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full text-xs uppercase tracking-widest transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {isLoading ? '...' : 'Translate'}
            </button>
          )}
          
          {value && !isRecording && (
            <button
              onClick={onClear}
              className="p-3 text-zinc-400 hover:text-red-500 transition-colors"
              title="Clear text"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TranslatorCard;
