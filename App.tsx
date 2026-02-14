
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { Languages, Mic, Volume2, Copy, Trash2, ArrowRightLeft, Loader2, Sparkles } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import TranslatorCard from './components/TranslatorCard';
import { AnimatePresence, motion } from 'framer-motion';

const App: React.FC = () => {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [direction, setDirection] = useState<'en-hi' | 'hi-en'>('en-hi');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Theme Management
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDirection = () => {
    setDirection(prev => prev === 'en-hi' ? 'hi-en' : 'hi-en');
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  const handleTranslate = async (text: string) => {
    if (!text.trim()) {
      setTranslatedText('');
      return;
    }

    setIsTranslating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const from = direction === 'en-hi' ? 'English' : 'Hindi';
      const to = direction === 'en-hi' ? 'Hindi' : 'English';
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Translate the following text from ${from} to ${to}. Provide only the translated text without any explanations or extra characters.\n\nText: "${text}"`,
        config: {
          temperature: 0.1,
          systemInstruction: "You are a professional, natural-sounding translator specializing in English and Hindi. Use colloquial, modern phrasing where appropriate rather than overly formal dictionary translations."
        }
      });

      setTranslatedText(response.text || '');
    } catch (error) {
      console.error("Translation error:", error);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-300">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-50 dark:bg-indigo-900/10 blur-3xl opacity-50"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-50 dark:bg-blue-900/10 blur-3xl opacity-50"></div>
      </div>

      <header className="relative z-10 w-full px-6 py-8 flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
            <Languages size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Linguist</h1>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest">Real-time Translator</p>
          </div>
        </div>

        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2.5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          {isDarkMode ? <span className="text-yellow-400">☀️</span> : <span className="text-zinc-600">🌙</span>}
        </button>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 pb-20">
        <div className="flex flex-col gap-6">
          
          {/* Language Switcher */}
          <div className="flex items-center justify-center gap-4 py-4">
            <span className={`text-sm font-bold tracking-wide transition-colors ${direction === 'en-hi' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'}`}>
              ENGLISH
            </span>
            <button 
              onClick={toggleDirection}
              className="p-3 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md hover:shadow-lg hover:scale-110 active:scale-95 transition-all text-indigo-600 dark:text-indigo-400"
            >
              <ArrowRightLeft size={20} />
            </button>
            <span className={`text-sm font-bold tracking-wide transition-colors ${direction === 'hi-en' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'}`}>
              HINDI
            </span>
          </div>

          {/* Cards Container */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <TranslatorCard
              label={direction === 'en-hi' ? "English" : "Hindi"}
              placeholder="Enter text here..."
              value={sourceText}
              onChange={(val) => {
                setSourceText(val);
                // Debounced effect usually better, but for simplicity:
                if (val.length === 0) setTranslatedText('');
              }}
              onAction={() => handleTranslate(sourceText)}
              isLoading={isTranslating}
              type="input"
              onSpeechInput={(text) => {
                setSourceText(text);
                handleTranslate(text);
              }}
            />

            <TranslatorCard
              label={direction === 'en-hi' ? "Hindi" : "English"}
              placeholder="Translation will appear here..."
              value={translatedText}
              isLoading={isTranslating}
              type="output"
              onCopy={() => handleCopy(translatedText)}
              onClear={() => {
                setSourceText('');
                setTranslatedText('');
              }}
            />
          </div>

          {/* Bottom Prompt */}
          {!sourceText && (
            <div className="text-center mt-12 animate-fade-in">
              <Sparkles className="mx-auto text-indigo-200 dark:text-indigo-900 mb-4" size={48} />
              <p className="text-zinc-500 dark:text-zinc-400 font-medium">Type or speak to start your translation.</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">Nuanced English-Hindi translations powered by Gemini</p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default App;
