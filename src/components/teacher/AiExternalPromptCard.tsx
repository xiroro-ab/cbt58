'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  FileText,
  Send,
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface AiExternalPromptCardProps {
  promptText: string;
  subjectTitle?: string;
  mode?: 'extract' | 'generate';
  title?: string;
  className?: string;
}

export const AiExternalPromptCard: React.FC<AiExternalPromptCardProps> = ({
  promptText,
  subjectTitle,
  mode = 'extract',
  title,
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
      name: 'Google Gemini',
      shortName: 'Gemini Web',
      company: 'Google',
      url: 'https://gemini.google.com',
      badge: 'Rekomendasi Utama',
      badgeClass: 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      tagline: 'Sangat cepat menganalisis naskah PDF & foto soal',
      gradient: 'from-blue-600 via-indigo-600 to-pink-500',
      borderClass: 'hover:border-blue-400 dark:hover:border-blue-600',
      icon: (
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4771 12 22C12 16.4771 16.4771 12 22 12C16.4771 12 12 7.52285 12 2Z"
            fill="url(#gemini-grad)"
          />
          <defs>
            <linearGradient id="gemini-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
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
      shortName: 'ChatGPT (OpenAI)',
      company: 'OpenAI',
      url: 'https://chatgpt.com',
      badge: 'Paling Populer',
      badgeClass: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      tagline: 'Sangat rapi menyusun struktur & kunci jawaban',
      gradient: 'from-emerald-600 to-teal-700',
      borderClass: 'hover:border-emerald-400 dark:hover:border-emerald-600',
      icon: (
        <svg className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.5 9.5a5.5 5.5 0 0 0-4.8-5.46A5.5 5.5 0 0 0 7.8 2.2a5.5 5.5 0 0 0-5.1 4.54A5.5 5.5 0 0 0 3.5 14.5a5.5 5.5 0 0 0 4.8 5.46 5.5 5.5 0 0 0 7.9 1.84 5.5 5.5 0 0 0 5.1-4.54A5.5 5.5 0 0 0 20.5 9.5zm-8.5 9.5a4 4 0 0 1-2.6-1l3.1-1.8a1 1 0 0 0 .5-.86v-3.5l2.6 1.5v3.66a4 4 0 0 1-3.6 2zm-6.6-4.2a4 4 0 0 1-.4-2.8l3.1 1.8a1 1 0 0 0 1 0l3-1.74v3l-3.1 1.8a4 4 0 0 1-3.6-2.06zm-1-6.8a4 4 0 0 1 2.2-1.8v3.6a1 1 0 0 0 .5.87l3 1.74-2.6 1.5-3.1-1.8a4 4 0 0 1 0-4.11zm11.2-1.8a4 4 0 0 1 2.2 1.8 4 4 0 0 1 0 4.11l-3.1 1.8-2.6-1.5 3-1.74a1 1 0 0 0 .5-.87zm3 6a4 4 0 0 1-.4 2.8 4 4 0 0 1-3.6 2.06l-3.1-1.8v-3l3 1.74a1 1 0 0 0 1 0l3.1-1.8zm-8.1-1.2l-2.6-1.5 2.6-1.5 2.6 1.5-2.6 1.5z" />
        </svg>
      )
    },
    {
      id: 'deepseek',
      name: 'DeepSeek',
      shortName: 'DeepSeek Chat',
      company: 'DeepSeek AI',
      badge: 'Super Cerdas & Gratis',
      badgeClass: 'bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
      tagline: 'Logika tajam, matematika presisi & tanpa limit',
      gradient: 'from-sky-600 to-blue-700',
      borderClass: 'hover:border-sky-400 dark:hover:border-sky-600',
      icon: (
        <svg className="w-5 h-5 shrink-0 text-sky-600 dark:text-sky-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12c0 3.66 1.98 6.87 4.93 8.61.16-.9.4-1.87.77-2.86A7.95 7.95 0 0 1 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8c0 2.26-.94 4.3-2.46 5.77.34.88.58 1.76.73 2.62C20.14 18.66 22 15.54 22 12c0-5.52-4.48-10-10-10zm-1 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm5 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm-5.5 5c-1.8 0-3.3 1.1-3.9 2.7.9.6 1.9.9 3 .9 1.4 0 2.6-.5 3.6-1.3-.6-1.3-1.6-2.3-2.7-2.3z" />
        </svg>
      )
    },
    {
      id: 'claude',
      name: 'Claude AI',
      shortName: 'Claude (Anthropic)',
      company: 'Anthropic',
      url: 'https://claude.ai',
      badge: 'Sangat Teliti',
      badgeClass: 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      tagline: 'Ahli memahami teks panjang, sastra & tajwid/Arab',
      gradient: 'from-amber-600 to-orange-700',
      borderClass: 'hover:border-amber-400 dark:hover:border-amber-600',
      icon: (
        <svg className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l2.4 6.8H21l-5.6 4.2 2.1 6.8L12 15.6l-5.5 4.2 2.1-6.8L3 8.8h6.6L12 2z" />
        </svg>
      )
    },
    {
      id: 'qwen',
      name: 'Qwen Chat',
      shortName: 'Qwen (Alibaba)',
      company: 'Alibaba Cloud',
      url: 'https://chat.qwen.ai',
      badge: 'Unggul Sains & Bahasa',
      badgeClass: 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      tagline: 'Daya nalar kuat untuk sains, TKA, dan literasi',
      gradient: 'from-purple-600 to-violet-700',
      borderClass: 'hover:border-purple-400 dark:hover:border-purple-600',
      icon: (
        <svg className="w-5 h-5 shrink-0 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.2L19 8.6v6.8L12 19.8 5 15.4V8.6L12 4.2zM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z" />
        </svg>
      )
    }
  ];

  return (
    <div
      className={`p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-violet-50/90 via-indigo-50/40 to-sky-50/50 dark:from-violet-950/40 dark:via-slate-900/90 dark:to-indigo-950/30 border border-violet-200/90 dark:border-violet-800/60 shadow-xs space-y-4 ${className}`}
    >
      {/* 1. HEADER & PENJELASAN RAMAH GURU */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-violet-100 dark:border-violet-900/40 pb-3.5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-violet-600/20 mt-0.5">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                100% Bebas Server Sibuk (High Demand)
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                Tanpa Kuota API
              </span>
            </div>
            <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight">
              {title || (mode === 'extract'
                ? 'Salin Prompt Ekstraksi Naskah ke AI (Gemini, ChatGPT, DeepSeek, Claude, Qwen)'
                : 'Salin Prompt Generator Soal untuk AI Favorit Anda')}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <strong>Maksud Fitur Ini:</strong> Jika server otomatis sedang antre (muncul pesan <em>High Demand</em> / kuota habis), Bapak/Ibu Guru <strong>tidak perlu menunggu</strong>. Anda bisa menggunakan situs AI gratis mana pun di web. Kami sudah siapkan <em>instruksi pintar (prompt)</em> berformat resmi agar AI langsung merapikan seluruh butir soal (Pilihan Ganda, Benar/Salah, Kompleks, Esai) beserta kunci jawabannya secara instan!
            </p>
          </div>
        </div>

        {/* Tombol Salin Prompt Utama di Pojok Header */}
        <button
          type="button"
          onClick={handleCopy}
          className={`shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition shadow-md cursor-pointer w-full sm:w-auto ${
            isCopied
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 ring-2 ring-emerald-400'
              : 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-600/30'
          }`}
          title="Salin instruksi prompt untuk ditempel ke web AI"
        >
          {isCopied ? (
            <>
              <Check className="w-4 h-4 shrink-0" />
              <span>Prompt Berhasil Disalin!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 shrink-0" />
              <span>Salin Prompt AI Siap Pakai</span>
            </>
          )}
        </button>
      </div>

      {/* 2. PANDUAN 4 LANGKAH PRAKTIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">
              1
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Salin Prompt</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Klik tombol ungu <strong>&quot;Salin Prompt AI&quot;</strong> di atas untuk menyalin instruksi format CBT.
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">
              2
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Pilih Situs AI</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Pilih salah satu tombol AI di bawah (Gemini, ChatGPT, DeepSeek, Claude, atau Qwen).
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">
              3
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Upload &amp; Kirim</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            {mode === 'extract'
              ? 'Lampirkan file PDF / Word naskah ujian Anda di web AI tersebut, lalu Tempel (Paste) prompt tadi.'
              : 'Tempel (Paste) prompt tadi di chat web AI tersebut, lalu tekan kirim.'}
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">
              4
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Tempel di CBT</span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-400 leading-relaxed">
            Salin balasan JSON dari AI, kembali ke CBT ini dan tempel di tab <em>Tempel Teks Naskah</em>. Selesai!
          </p>
        </div>
      </div>

      {/* 3. TOMBOL OPSI PINTASAN KE 5 SITUS AI */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Pilih Situs AI Gratis untuk Membuka di Tab Baru:</span>
          </p>

          <button
            type="button"
            onClick={() => setShowPromptPreview(!showPromptPreview)}
            className="text-[11px] font-bold text-violet-700 dark:text-violet-300 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            {showPromptPreview ? (
              <>
                <span>Sembunyikan Isi Prompt</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Lihat Pratinjau Teks Prompt</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

        {/* GRID 5 TOMBOL AI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {aiServices.map(ai => (
            <a
              key={ai.id}
              href={ai.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                if (!isCopied) {
                  handleCopy();
                }
              }}
              className={`p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition shadow-2xs hover:shadow-md flex flex-col justify-between gap-2.5 group cursor-pointer ${ai.borderClass}`}
              title={`Buka ${ai.name} (${ai.company}) di tab baru`}
            >
              <div className="flex items-start justify-between gap-1.5">
                <div className="flex items-center gap-2">
                  {ai.icon}
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition leading-tight">
                      {ai.shortName}
                    </h5>
                    <span className="text-[10px] text-slate-400 font-medium">{ai.company}</span>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition shrink-0 mt-0.5" />
              </div>

              <div className="space-y-1">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {ai.tagline}
                </p>
                <div className="pt-0.5">
                  <span
                    className={`inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border ${ai.badgeClass}`}
                  >
                    {ai.badge}
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* 4. PRATINJAU TEKS PROMPT (COLLAPSIBLE) */}
      {showPromptPreview && (
        <div className="p-3.5 rounded-2xl bg-slate-900 dark:bg-slate-950 border border-slate-800 text-slate-200 space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-violet-400" />
              Isi Teks Prompt Siap Pakai ({promptText.length} karakter)
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-[10px] transition cursor-pointer flex items-center gap-1"
            >
              {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{isCopied ? 'Tersalin!' : 'Salin Semua'}</span>
            </button>
          </div>
          <pre className="text-[11px] font-mono leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap text-slate-300 p-1">
            {promptText}
          </pre>
        </div>
      )}
    </div>
  );
};
