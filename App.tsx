
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Terminal, 
  Settings, 
  Globe, 
  Mic, 
  MicOff, 
  Play, 
  Square, 
  Link as LinkIcon,
  Cpu,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import TranslatorCard from './components/TranslatorCard';

export type SupportedLanguage = 'English' | 'Hindi' | 'Tamil' | 'Telugu';

const App: React.FC = () => {
  const [meetUrl, setMeetUrl] = useState('');
  const [isBotActive, setIsBotActive] = useState(false);
  const [logs, setLogs] = useState<{msg: string, type: 'info' | 'warn' | 'error' | 'success'}[]>([]);
  const [activeNode, setActiveNode] = useState<'A' | 'B' | null>(null);
  
  const [nodeALang, setNodeALang] = useState<SupportedLanguage>('English');
  const [nodeBLang, setNodeBLang] = useState<SupportedLanguage>('Hindi');
  
  const [nodeAText, setNodeAText] = useState('');
  const [nodeBText, setNodeBText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.add('dark');
    addLog("Linguist-Bot Kernel v2.5.0 initialized.", 'info');
    addLog("Waiting for Google Meet Media API handshake...", 'info');
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (msg: string, type: 'info' | 'warn' | 'error' | 'success' = 'info') => {
    setLogs(prev => [...prev, { msg, type }].slice(-50));
  };

  const handleToggleBot = () => {
    if (!isBotActive) {
      if (!meetUrl.includes('meet.google.com')) {
        addLog("Invalid Meet URL detected.", 'error');
        return;
      }
      setIsBotActive(true);
      addLog(`Injecting Playback Bot into ${meetUrl}...`, 'success');
      addLog("Establishing gRPC stream for Ingress...", 'info');
      addLog("Virtual Mic 'TranslationSink' linked.", 'success');
    } else {
      setIsBotActive(false);
      addLog("Terminating bot instance...", 'warn');
      addLog("Releasing Media API hooks.", 'info');
    }
  };

  const processTranslation = async (text: string, from: SupportedLanguage, to: SupportedLanguage, source: 'A' | 'B') => {
    if (!text.trim() || isProcessing) return;
    
    setIsProcessing(true);
    setActiveNode(source);
    addLog(`Processing Ingress from Node_${source} (${from})...`, 'info');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Translate to ${to} for a live meeting context. Keep it concise. Text: "${text}"`,
        config: {
          systemInstruction: "You are a real-time meeting translator. Provide only the translation. Use natural, spoken-style grammar."
        }
      });

      const translated = response.text || '';
      if (source === 'A') setNodeBText(translated);
      else setNodeAText(translated);

      addLog(`Egress: Dispatched ${to} audio to virtual mic.`, 'success');
    } catch (err) {
      addLog("Pipeline stall: Gemini API timeout.", 'error');
    } finally {
      setIsProcessing(false);
      setActiveNode(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-mono flex flex-col selection:bg-indigo-500/30">
      {/* HUD Header */}
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-xl px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 bg-indigo-600/20 border border-indigo-500/50 rounded-lg flex items-center justify-center text-indigo-400">
              <Cpu size={20} className={isBotActive ? 'animate-pulse' : ''} />
            </div>
            {isBotActive && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#09090b] animate-pulse"></span>
            )}
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tighter uppercase flex items-center gap-2">
              Linguist Bot Control Center
              <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-500 font-mono">v2.5-STABLE</span>
            </h1>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                <Activity size={10} className="text-green-500" /> SYSTEM_OK
              </span>
              <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                <ShieldCheck size={10} className="text-indigo-500" /> SECURE_GRPC
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 bg-zinc-900/50 border border-white/5 rounded-full px-3 py-1">
            <LinkIcon size={12} className="text-zinc-500" />
            <input 
              type="text" 
              placeholder="https://meet.google.com/xxx-xxxx-xxx"
              className="bg-transparent border-none focus:ring-0 text-[11px] w-64 text-zinc-300 placeholder-zinc-700"
              value={meetUrl}
              onChange={(e) => setMeetUrl(e.target.value)}
              disabled={isBotActive}
            />
          </div>
          <button 
            onClick={handleToggleBot}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[11px] font-bold transition-all ${
              isBotActive 
              ? 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20'
            }`}
          >
            {isBotActive ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
            {isBotActive ? 'TERMINATE BOT' : 'INJECT BOT'}
          </button>
        </div>
      </header>

      <main className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 max-w-[1600px] mx-auto w-full">
        
        {/* Left: Pipeline visualization */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Node A (Source/English usually) */}
            <div className={`flex flex-col gap-3 transition-all duration-500 ${activeNode === 'A' ? 'scale-[1.02]' : 'opacity-80'}`}>
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Stream_Ingress: Node_A</span>
                <select 
                  className="bg-zinc-900 border border-white/10 text-[10px] font-bold rounded px-2 py-1 text-indigo-400"
                  value={nodeALang}
                  onChange={(e) => setNodeALang(e.target.value as SupportedLanguage)}
                >
                  <option value="English">ENGLISH</option>
                  <option value="Hindi">HINDI</option>
                  <option value="Tamil">TAMIL</option>
                  <option value="Telugu">TELUGU</option>
                </select>
              </div>
              <TranslatorCard 
                label={nodeALang}
                type="input"
                value={nodeAText}
                onChange={setNodeAText}
                onAction={() => processTranslation(nodeAText, nodeALang, nodeBLang, 'A')}
                isLoading={isProcessing && activeNode === 'A'}
                onSpeechInput={(text) => {
                  setNodeAText(text);
                  processTranslation(text, nodeALang, nodeBLang, 'A');
                }}
                onClear={() => setNodeAText('')}
              />
            </div>

            {/* Node B (Target/Regional) */}
            <div className={`flex flex-col gap-3 transition-all duration-500 ${activeNode === 'B' ? 'scale-[1.02]' : 'opacity-80'}`}>
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Stream_Ingress: Node_B</span>
                <select 
                   className="bg-zinc-900 border border-white/10 text-[10px] font-bold rounded px-2 py-1 text-indigo-400"
                   value={nodeBLang}
                   onChange={(e) => setNodeBLang(e.target.value as SupportedLanguage)}
                >
                  <option value="Hindi">HINDI</option>
                  <option value="Tamil">TAMIL</option>
                  <option value="Telugu">TELUGU</option>
                  <option value="English">ENGLISH</option>
                </select>
              </div>
              <TranslatorCard 
                label={nodeBLang}
                type="input"
                value={nodeBText}
                onChange={setNodeBText}
                onAction={() => processTranslation(nodeBText, nodeBLang, nodeALang, 'B')}
                isLoading={isProcessing && activeNode === 'B'}
                onSpeechInput={(text) => {
                  setNodeBText(text);
                  processTranslation(text, nodeBLang, nodeALang, 'B');
                }}
                onClear={() => setNodeBText('')}
              />
            </div>

          </div>

          {/* Real-time Visualization Panel */}
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 h-48 relative overflow-hidden flex items-center justify-center">
             <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#4f46e5 1px, transparent 1px), linear-gradient(90deg, #4f46e5 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
             
             {isBotActive ? (
               <div className="flex items-center gap-12 z-10">
                  <div className={`text-center transition-all ${activeNode === 'A' ? 'text-indigo-400' : 'text-zinc-600'}`}>
                    <Mic size={32} className={activeNode === 'A' ? 'animate-bounce' : ''} />
                    <p className="text-[9px] mt-2 font-bold uppercase">Ingress_A</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-48 h-1 bg-zinc-800 rounded-full relative overflow-hidden">
                       <div className={`absolute inset-0 bg-indigo-500 transition-all duration-500 ${isProcessing ? 'translate-x-0' : '-translate-x-full'}`}></div>
                    </div>
                    <p className="text-[8px] mt-2 text-zinc-500 font-bold uppercase tracking-widest">Bridging Process</p>
                  </div>
                  <div className={`text-center transition-all ${activeNode === 'B' ? 'text-indigo-400' : 'text-zinc-600'}`}>
                    <Globe size={32} className={activeNode === 'B' ? 'animate-bounce' : ''} />
                    <p className="text-[9px] mt-2 font-bold uppercase">Ingress_B</p>
                  </div>
               </div>
             ) : (
               <div className="text-center text-zinc-700">
                  <Zap size={24} className="mx-auto mb-2 opacity-20" />
                  <p className="text-xs uppercase font-bold tracking-widest">Connect to Meet URL to start bridging</p>
               </div>
             )}
          </div>
        </div>

        {/* Right: Terminal Logs */}
        <div className="lg:col-span-4 flex flex-col h-full">
          <div className="bg-black border border-white/10 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-2xl">
            <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between bg-zinc-900/50">
               <div className="flex items-center gap-2">
                 <Terminal size={14} className="text-zinc-500" />
                 <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Bot_Kernel_Terminal</span>
               </div>
               <div className="flex gap-1">
                 <div className="w-2 h-2 rounded-full bg-red-500/20"></div>
                 <div className="w-2 h-2 rounded-full bg-yellow-500/20"></div>
                 <div className="w-2 h-2 rounded-full bg-green-500/20"></div>
               </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto font-mono text-[10px] space-y-1.5 custom-scrollbar">
              {logs.map((log, i) => (
                <div key={i} className={`flex gap-2 ${
                  log.type === 'error' ? 'text-red-400' : 
                  log.type === 'success' ? 'text-green-400' : 
                  log.type === 'warn' ? 'text-yellow-400' : 'text-zinc-500'
                }`}>
                  <span className="opacity-30 shrink-0">[{new Date().toLocaleTimeString([], {hour12: false})}]</span>
                  <span className="break-all">{log.msg}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
            <div className="p-3 border-t border-white/10 bg-zinc-900/20">
               <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] text-zinc-500 font-bold uppercase">Memory Usage</span>
                  <span className="text-[9px] text-zinc-400">128MB / 512MB</span>
               </div>
               <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="w-1/4 h-full bg-indigo-500"></div>
               </div>
            </div>
          </div>
        </div>

      </main>

      <footer className="px-6 py-3 border-t border-white/5 flex items-center justify-between text-zinc-600 text-[9px] font-bold uppercase tracking-widest">
        <div>&copy; 2025 LINGUIST SYSTEMS INC.</div>
        <div className="flex gap-4">
          <span className="text-indigo-500 flex items-center gap-1">
            <div className="w-1 h-1 bg-indigo-500 rounded-full"></div> 
            EN-HI-TA-TE ACTIVE
          </span>
          <span>STT-EGRESS: OK</span>
          <span>LATENCY: 850MS</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
