'use client';

import React, { useState } from 'react';
import { Question, QuestionAnswer, OptionItem, MatchingPair } from '@/types/cbt';
import { CheckCircle2, XCircle, ArrowRightLeft } from 'lucide-react';

interface QuestionRendererProps {
  question: Question;
  currentAnswer: QuestionAnswer;
  onAnswerChange: (newAnswer: QuestionAnswer) => void;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  currentAnswer,
  onAnswerChange
}) => {
  const { type, options } = question;

  // 1. PILIHAN GANDA (Single Choice)
  if (type === 'Pilihan Ganda') {
    const safeOptions = (options as OptionItem[]) || [];
    return (
      <div className="space-y-3 mt-4">
        {safeOptions.map((opt, idx) => {
          const letter = String.fromCharCode(65 + idx);
          const isSelected = currentAnswer === letter;
          return (
            <label
              key={idx}
              className={`flex items-start p-3.5 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-fuchsia-500/15 border-fuchsia-400 ring-1 ring-fuchsia-400'
                  : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <input
                type="radio"
                name={`pg-${question.id}`}
                value={letter}
                checked={isSelected}
                onChange={() => onAnswerChange(letter)}
                className="mt-1 mr-3 h-4 w-4 accent-fuchsia-500"
              />
              <div className="text-sm sm:text-base leading-relaxed">
                <span className="font-bold text-fuchsia-400 mr-2">{letter}.</span>
                <span>{opt.text}</span>
              </div>
            </label>
          );
        })}
      </div>
    );
  }

  // 2. PILIHAN GANDA KOMPLEKS (Multiple Selection)
  if (type === 'Pilihan Ganda Kompleks') {
    const safeOptions = (options as OptionItem[]) || [];
    const selectedArr = Array.isArray(currentAnswer) ? (currentAnswer as string[]) : [];

    const handleToggle = (letter: string) => {
      const exists = selectedArr.includes(letter);
      const updated = exists
        ? selectedArr.filter(item => item !== letter)
        : [...selectedArr, letter];
      onAnswerChange(updated.length > 0 ? updated : null);
    };

    return (
      <div className="space-y-3 mt-4">
        <p className="text-xs text-fuchsia-300/80 italic mb-2">
          *Pilihlah satu atau lebih pilihan jawaban yang benar.
        </p>
        {safeOptions.map((opt, idx) => {
          const letter = String.fromCharCode(65 + idx);
          const isSelected = selectedArr.includes(letter);
          return (
            <label
              key={idx}
              className={`flex items-start p-3.5 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-fuchsia-500/15 border-fuchsia-400 ring-1 ring-fuchsia-400'
                  : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleToggle(letter)}
                className="mt-1 mr-3 h-4 w-4 accent-fuchsia-500 rounded"
              />
              <div className="text-sm sm:text-base leading-relaxed">
                <span className="font-bold text-fuchsia-400 mr-2">{letter}.</span>
                <span>{opt.text}</span>
              </div>
            </label>
          );
        })}
      </div>
    );
  }

  // 3. BENAR / SALAH (Multi-Pernyataan atau 1 Pernyataan)
  if (type === 'Benar/Salah') {
    const rawOptions = (options as OptionItem[]) || [];
    const isMultiStatement = rawOptions.length > 0;

    // A. Multi Pernyataan (Tabel Interaktif)
    if (isMultiStatement) {
      const answersArr = Array.isArray(currentAnswer)
        ? (currentAnswer as string[])
        : typeof currentAnswer === 'object' && currentAnswer !== null
        ? Object.values(currentAnswer as Record<string, string>)
        : [];

      const handleSelectStatement = (idx: number, val: 'Benar' | 'Salah') => {
        const next = [...answersArr];
        next[idx] = val;
        onAnswerChange(next);
      };

      return (
        <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900 text-zinc-400 uppercase text-xs">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Pernyataan</th>
                <th className="py-3 px-4 w-48 text-center">Pilihan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {rawOptions.map((opt, idx) => {
                const choice = answersArr[idx];
                return (
                  <tr key={idx} className="hover:bg-zinc-900/30 transition-colors">
                    <td className="py-3 px-4 text-center font-bold text-fuchsia-400 align-top">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 leading-relaxed text-zinc-200 align-top">
                      {opt.text}
                    </td>
                    <td className="py-3 px-4 text-center align-middle">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleSelectStatement(idx, 'Benar')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            choice === 'Benar'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500 shadow-sm shadow-emerald-500/20'
                              : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Benar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectStatement(idx, 'Salah')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            choice === 'Salah'
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500 shadow-sm shadow-rose-500/20'
                              : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Salah
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    // B. Pernyataan Tunggal (Klasik)
    return (
      <div className="flex flex-col sm:flex-row gap-4 mt-4">
        <label
          className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
            currentAnswer === 'Benar'
              ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold'
              : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
          }`}
        >
          <input
            type="radio"
            name={`bs-single-${question.id}`}
            value="Benar"
            checked={currentAnswer === 'Benar'}
            onChange={() => onAnswerChange('Benar')}
            className="hidden"
          />
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>Benar</span>
        </label>
        <label
          className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
            currentAnswer === 'Salah'
              ? 'bg-rose-500/15 border-rose-500 text-rose-400 font-bold'
              : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
          }`}
        >
          <input
            type="radio"
            name={`bs-single-${question.id}`}
            value="Salah"
            checked={currentAnswer === 'Salah'}
            onChange={() => onAnswerChange('Salah')}
            className="hidden"
          />
          <XCircle className="w-5 h-5 text-rose-400" />
          <span>Salah</span>
        </label>
      </div>
    );
  }

  // 4. MENJODOHKAN (Interactive Matching)
  if (type === 'Menjodohkan') {
    const pairs = (options as MatchingPair[]) || [];
    const userPairs: Array<{ questionItem: string; answerItem: string }> = Array.isArray(
      currentAnswer
    )
      ? (currentAnswer as any)
      : [];

    const [selectedLeft, setSelectedLeft] = useState<number | null>(null);

    const leftItems = pairs.map(p => p.q?.text || '');
    const rightItems = pairs.map(p => p.a?.text || '');

    const handlePairClick = (leftIdx: number, rightText: string) => {
      const letter = String.fromCharCode(65 + leftIdx);
      // Hapus jika sudah dipasangkan dengan item ini
      const exists = userPairs.find(p => p.questionItem === letter);
      let updated: Array<{ questionItem: string; answerItem: string }>;
      if (exists && exists.answerItem === rightText) {
        updated = userPairs.filter(p => p.questionItem !== letter);
      } else {
        updated = [...userPairs.filter(p => p.questionItem !== letter), { questionItem: letter, answerItem: rightText }];
      }
      onAnswerChange(updated.length > 0 ? (updated as any) : null);
      setSelectedLeft(null);
    };

    return (
      <div className="mt-4 space-y-4">
        <p className="text-xs text-zinc-400 italic">
          *Pilih salah satu item di sisi kiri, kemudian klik pasangannya di sisi kanan.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Kolom Kiri */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-fuchsia-400 uppercase tracking-wider mb-2">Pernyataan</h4>
            {leftItems.map((text, idx) => {
              const letter = String.fromCharCode(65 + idx);
              const isSelected = selectedLeft === idx;
              const paired = userPairs.find(p => p.questionItem === letter);
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedLeft(isSelected ? null : idx)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-sm ${
                    isSelected
                      ? 'bg-fuchsia-500/20 border-fuchsia-400 ring-2 ring-fuchsia-400/40'
                      : paired
                      ? 'bg-zinc-900/90 border-emerald-500/50'
                      : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-fuchsia-400">{letter}.</span>
                    <span>{text}</span>
                  </div>
                  {paired && (
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium truncate max-w-[120px]">
                      ➔ {paired.answerItem}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Kolom Kanan */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-fuchsia-400 uppercase tracking-wider mb-2">Pasangan Jawaban</h4>
            {rightItems.map((text, idx) => {
              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (selectedLeft !== null) {
                      handlePairClick(selectedLeft, text);
                    }
                  }}
                  className={`p-3 rounded-xl border text-sm transition-all flex items-center justify-between ${
                    selectedLeft !== null
                      ? 'cursor-pointer hover:border-fuchsia-400 bg-zinc-900 border-zinc-700'
                      : 'bg-zinc-900/30 border-zinc-800/80 opacity-80'
                  }`}
                >
                  <span>{text}</span>
                  {selectedLeft !== null && (
                    <ArrowRightLeft className="w-4 h-4 text-fuchsia-400 animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // 5. ISIAN SINGKAT
  if (type === 'Isian Singkat') {
    const val = typeof currentAnswer === 'string' ? currentAnswer : '';
    return (
      <div className="mt-4">
        <label className="block text-xs font-medium text-zinc-400 mb-2">Jawaban Singkat Anda:</label>
        <input
          type="text"
          value={val}
          onChange={e => onAnswerChange(e.target.value.trim() ? e.target.value : null)}
          placeholder="Ketik jawaban singkat di sini..."
          className="w-full p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 text-sm"
        />
      </div>
    );
  }

  // 6. ESAI
  if (type === 'Esai') {
    const val = typeof currentAnswer === 'string' ? currentAnswer : '';
    return (
      <div className="mt-4">
        <label className="block text-xs font-medium text-zinc-400 mb-2">Uraian Jawaban Anda:</label>
        <textarea
          rows={5}
          value={val}
          onChange={e => onAnswerChange(e.target.value.trim() ? e.target.value : null)}
          placeholder="Tuliskan penjelasan atau uraian Anda secara lengkap..."
          className="w-full p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 text-sm leading-relaxed"
        />
      </div>
    );
  }

  return null;
};
