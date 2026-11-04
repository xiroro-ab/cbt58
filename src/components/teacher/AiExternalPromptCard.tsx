'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';

interface AiExternalPromptCardProps {
  promptText: string;
  subjectTitle?: string;
  className?: string;
}

export const AiExternalPromptCard: React.FC<AiExternalPromptCardProps> = ({
  promptText,
  className = ''
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(promptText).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 3000);
      });
    }
  };

  const aiServices = [
    {
      id: 'gemini',
      name: 'Gemini Web',
      company: 'Google',
      url: 'https://gemini.google.com',
      badge: 'Rekomendasi',
      icon: (
        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4771 12 22C12 16.4771 16.4771 12 22 12C16.4771 12 12 7.52285 12 2Z"
            fill="url(#gemini-grad-card)"
          />
          <defs>
            <linearGradient id="gemini-grad-card" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3B82F6" />
              <stop offset="0.5" stopColor="#8B5CF6" />
              <stop offset="1" stopColor="#EC4899" />
            </linearGradient>
          </defs>
        </svg>
      )
    },
    {
      id: 'chatgpt',
      name: 'ChatGPT',
      company: 'OpenAI',
      url: 'https://chatgpt.com',
      badge: 'Populer',
      icon: (
        <svg className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.5 9.5a5.5 5.5 0 0 0-4.8-5.46A5.5 5.5 0 0 0 7.8 2.2a5.5 5.5 0 0 0-5.1 4.54A5.5 5.5 0 0 0 3.5 14.5a5.5 5.5 0 0 0 4.8 5.46 5.5 5.5 0 0 0 7.9 1.84 5.5 5.5 0 0 0 5.1-4.54A5.5 5.5 0 0 0 20.5 9.5zm-8.5 9.5a4 4 0 0 1-2.6-1l3.1-1.8a1 1 0 0 0 .5-.86v-3.5l2.6 1.5v3.66a4 4 0 0 1-3.6 2zm-6.6-4.2a4 4 0 0 1-.4-2.8l3.1 1.8a1 1 0 0 0 1 0l3-1.74v3l-3.1 1.8a4 4 0 0 1-3.6-2.06zm-1-6.8a4 4 0 0 1 2.2-1.8v3.6a1 1 0 0 0 .5.87l3 1.74-2.6 1.5-3.1-1.8a4 4 0 0 1 0-4.11zm11.2-1.8a4 4 0 0 1 2.2 1.8 4 4 0 0 1 0 4.11l-3.1 1.8-2.6-1.5 3-1.74a1 1 0 0 0 .5-.87zm3 6a4 4 0 0 1-.4 2.8 4 4 0 0 1-3.6 2.06l-3.1-1.8v-3l3 1.74a1 1 0 0 0 1 0l3.1-1.8zm-8.1-1.2l-2.6-1.5 2.6-1.5 2.6 1.5-2.6 1.5z" />
        </svg>
      )
    },
    {
      id: 'deepseek',
      name: 'DeepSeek',
      company: 'DeepSeek AI',
      badge: 'Gratis',
      icon: (
        <svg className="w-3.5 h-3.5 shrink-0 text-sky-600 dark:text-sky-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12c0 3.66 1.98 6.87 4.93 8.61.16-.9.4-1.87.77-2.86A7.95 7.95 0 0 1 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8c0 2.26-.94 4.3-2.46 5.77.34.88.58 1.76.73 2.62C20.14 18.66 22 15.54 22 12c0-5.52-4.48-10-10-10zm-1 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm5 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm-5.5 5c-1.8 0-3.3 1.1-3.9 2.7.9.6 1.9.9 3 .9 1.4 0 2.6-.5 3.6-1.3-.6-1.3-1.6-2.3-2.7-2.3z" />
        </svg>
      )
    },
    {
      id: 'claude',
      name: 'Claude',
      company: 'Anthropic',
      badge: 'Teliti',
      icon: (
        <svg className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l2.4 6.8H21l-5.6 4.2 2.1 6.8L12 15.6l-5.5 4.2 2.1-6.8L3 8.8h6.6L12 2z" />
        </svg>
      )
    },
    {
      id: 'qwen',
      name: 'Qwen',
      company: 'Alibaba',
      badge: 'Sains',
      icon: (
        <svg className="w-3.5 h-3.5 shrink-0 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.2L19 8.6v6.8L12 19.8 5 15.4V8.6L12 4.2zM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z" />
        </svg>
      )
    }
  ];

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-violet-50/80 via-indigo-50/50 to-teal-50/40 dark:from-violet-950/30 dark:via-slate-900 dark:to-teal-950/20 border border-violet-200/80 dark:border-violet-800/50 space-y-3 ${className}`}
    >
      {/* BARIS ATAS: KETERANGAN SIMPEL & TOMBOL SALIN PROMPT */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
              <span>Gunakan AI Eksternal (Bebas Antrean)</span>
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              100% Gratis
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Salin prompt di samping, buka salah satu web AI di bawah &amp; upload file soal Anda, lalu tempel hasilnya ke kotak di bawah.
          </p>
        </div>

        {/* TOMBOL SALIN PROMPT (LEBAR PENUH DI HP, RAMPING DI DESKTOP) */}
        <button
          type="button"
          onClick={handleCopy}
          className={`w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
            isCopied
              ? 'bg-emerald-600 text-white'
              : 'bg-violet-600 hover:bg-violet-500 active:scale-[0.98] text-white shadow-violet-600/20'
          }`}
          title="Salin instruksi prompt untuk ditempel ke web AI"
        >
          {isCopied ? <Check className="w-4 h-4 shrink-0" /> : <Copy className="w-4 h-4 shrink-0" />}
          <span>{isCopied ? 'Prompt Berhasil Disalin!' : 'Salin Prompt AI'}</span>
        </button>
      </div>

      {/* BARIS BAWAH: GRID TOMBOL AI RAPI DI MODE HP DAN DESKTOP */}
      <div className="pt-2.5 border-t border-violet-100 dark:border-violet-900/30 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
            Buka Web AI Pilihan Anda:
          </span>

          {/* TOGGLE LIHAT TEKS PROMPT */}
          <button
            type="button"
            onClick={() => setShowPromptPreview(!showPromptPreview)}
            className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline inline-flex items-center gap-1 cursor-pointer py-0.5"
          >
            <span>{showPromptPreview ? 'Tutup Teks Prompt' : 'Lihat Isi Prompt'}</span>
            {showPromptPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* GRID 5 TOMBOL AI: 2 KOLOM DI HP (TOMBOL KE-5 FULL WIDTH), 5 KOLOM DI DESKTOP */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {aiServices.map((ai, index) => (
            <a
              key={ai.id}
              href={ai.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-violet-400 dark:hover:border-violet-600 active:bg-violet-50 dark:active:bg-violet-950/30 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 transition shadow-2xs hover:shadow-xs cursor-pointer ${
                index === 4 ? 'col-span-2 sm:col-span-1' : ''
              }`}
              title={`Buka ${ai.name} (${ai.company}) di tab baru`}
            >
              {ai.icon}
              <span>{ai.name}</span>
              <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
            </a>
          ))}
        </div>
      </div>

      {/* PREVIEW PROMPT SEDERHANA */}
      {showPromptPreview && (
        <div className="p-3 rounded-xl bg-slate-900 dark:bg-slate-950 border border-slate-800 text-slate-300 space-y-1.5 animate-in fade-in">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3 text-violet-400" />
              Teks Prompt Siap Pakai:
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-violet-400 hover:underline font-bold"
            >
              {isCopied ? 'Tersalin' : 'Salin'}
            </button>
          </div>
          <pre className="text-[10px] font-mono leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap text-slate-300">
            {promptText}
          </pre>
        </div>
      )}
    </div>
  );
};
