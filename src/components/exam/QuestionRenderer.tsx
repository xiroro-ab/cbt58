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
                  ? 'bg-violet-50 dark:bg-violet-950/30 border-violet-500 text-violet-900 dark:text-violet-200 ring-1 ring-violet-500'
                  : 'bg-slate-50/70 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200'
              }`}
            >
              <input
                type="radio"
                name={`pg-${question.id}`}
                value={letter}
                checked={isSelected}
                onChange={() => onAnswerChange(letter)}
                className="mt-1 mr-3 h-4 w-4 accent-violet-600"
              />
              <div className="text-sm sm:text-base leading-relaxed">
                <span className="font-bold text-violet-600 dark:text-violet-400 mr-2">{letter}.</span>
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
        <p className="text-xs text-slate-500 dark:text-slate-400 italic mb-2">
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
                  ? 'bg-violet-50 dark:bg-violet-950/30 border-violet-500 text-violet-900 dark:text-violet-200 ring-1 ring-violet-500'
                  : 'bg-slate-50/70 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200'
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleToggle(letter)}
                className="mt-1 mr-3 h-4 w-4 accent-violet-600 rounded"
              />
              <div className="text-sm sm:text-base leading-relaxed">
                <span className="font-bold text-violet-600 dark:text-violet-400 mr-2">{letter}.</span>
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
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xs">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 uppercase text-xs">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Pernyataan</th>
                <th className="py-3 px-4 w-48 text-center">Pilihan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {rawOptions.map((opt, idx) => {
                const choice = answersArr[idx];
                return (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4 text-center font-bold text-violet-600 dark:text-violet-400 align-top">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4 leading-relaxed text-slate-800 dark:text-slate-200 align-top">
                      {opt.text}
                    </td>
                    <td className="py-3.5 px-4 text-center align-middle">
                      <div className="flex items-center justify-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleSelectStatement(idx, 'Benar')}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            choice === 'Benar'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500 shadow-xs font-bold'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Benar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectStatement(idx, 'Salah')}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            choice === 'Salah'
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500 shadow-xs font-bold'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
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
              ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
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
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <span>Benar</span>
        </label>
        <label
          className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
            currentAnswer === 'Salah'
              ? 'bg-rose-500/15 border-rose-500 text-rose-600 dark:text-rose-400 font-bold'
              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
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
          <XCircle className="w-5 h-5 text-rose-500" />
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
        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
          *Pilih salah satu item di sisi kiri, kemudian klik pasangannya di sisi kanan.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Kolom Kiri */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-2">Pernyataan</h4>
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
                      ? 'bg-violet-100/60 dark:bg-violet-950/40 border-violet-500 ring-2 ring-violet-500/20'
                      : paired
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700/50'
                      : 'bg-slate-50/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-violet-600 dark:text-violet-400">{letter}.</span>
                    <span className="text-slate-800 dark:text-slate-200">{text}</span>
                  </div>
                  {paired && (
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-medium truncate max-w-[120px]">
                      ➔ {paired.answerItem}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Kolom Kanan */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-2">Pasangan Jawaban</h4>
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
                      ? 'cursor-pointer hover:border-violet-500 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700'
                      : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800/80 opacity-80'
                  }`}
                >
                  <span className="text-slate-800 dark:text-slate-200">{text}</span>
                  {selectedLeft !== null && (
                    <ArrowRightLeft className="w-4 h-4 text-violet-600 dark:text-violet-400 animate-pulse" />
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
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Jawaban Singkat Anda:</label>
        <input
          type="text"
          value={val}
          onChange={e => onAnswerChange(e.target.value.trim() ? e.target.value : null)}
          placeholder="Ketik jawaban singkat di sini..."
          className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-violet-500 text-sm"
        />
      </div>
    );
  }

  // 6. ESAI
  if (type === 'Esai') {
    const val = typeof currentAnswer === 'string' ? currentAnswer : '';
    return (
      <div className="mt-4">
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Uraian Jawaban Anda:</label>
        <textarea
          rows={5}
          value={val}
          onChange={e => onAnswerChange(e.target.value.trim() ? e.target.value : null)}
          placeholder="Tuliskan uraian atau penjelasan Anda..."
          className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-violet-500 text-sm leading-relaxed"
        />
      </div>
    );
  }

  return null;
};
