'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { SchoolSettings } from '@/types/cbt';

interface TTESignatureSealProps {
  settings?: SchoolSettings;
  documentId?: string;
  signerName: string;
  signerTitle: string;
  signerNip?: string;
  signDate?: string;
  className?: string;
}

export const TTESignatureSeal: React.FC<TTESignatureSealProps> = ({
  settings,
  documentId = 'CBT58-DOC',
  signerName,
  signerTitle,
  signerNip,
  signDate,
  className = ''
}) => {
  const enableTTE = settings?.enableTTE !== false;
  const tteType = settings?.tteType || 'qrcode';
  const displayCity = settings?.city || 'Palembang';
  const todayStr = signDate || new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const docHash = (documentId || 'VALID').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();

  return (
    <div className={`text-center space-y-1.5 font-sans ${className}`}>
      <p className="text-xs text-slate-600 dark:text-slate-400 print:text-black">
        {displayCity}, {todayStr}
      </p>
      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 print:text-black">
        {signerTitle},
      </p>

      {enableTTE ? (
        <div className="py-1 flex flex-col items-center justify-center">
          {tteType === 'barcode' ? (
            /* BARCODE TTE DIGITAL */
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 print:bg-white border border-slate-300 dark:border-slate-700 print:border-slate-400 shadow-xs max-w-[200px] mx-auto">
              <svg className="w-36 h-9" viewBox="0 0 140 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="0" width="140" height="36" fill="white"/>
                <rect x="8" y="4" width="2" height="28" fill="black"/>
                <rect x="12" y="4" width="4" height="28" fill="black"/>
                <rect x="18" y="4" width="1" height="28" fill="black"/>
                <rect x="21" y="4" width="3" height="28" fill="black"/>
                <rect x="26" y="4" width="2" height="28" fill="black"/>
                <rect x="30" y="4" width="5" height="28" fill="black"/>
                <rect x="37" y="4" width="2" height="28" fill="black"/>
                <rect x="41" y="4" width="3" height="28" fill="black"/>
                <rect x="46" y="4" width="1" height="28" fill="black"/>
                <rect x="49" y="4" width="4" height="28" fill="black"/>
                <rect x="55" y="4" width="2" height="28" fill="black"/>
                <rect x="59" y="4" width="3" height="28" fill="black"/>
                <rect x="64" y="4" width="1" height="28" fill="black"/>
                <rect x="67" y="4" width="5" height="28" fill="black"/>
                <rect x="74" y="4" width="2" height="28" fill="black"/>
                <rect x="78" y="4" width="4" height="28" fill="black"/>
                <rect x="84" y="4" width="1" height="28" fill="black"/>
                <rect x="87" y="4" width="3" height="28" fill="black"/>
                <rect x="92" y="4" width="2" height="28" fill="black"/>
                <rect x="96" y="4" width="4" height="28" fill="black"/>
                <rect x="102" y="4" width="1" height="28" fill="black"/>
                <rect x="105" y="4" width="3" height="28" fill="black"/>
                <rect x="110" y="4" width="4" height="28" fill="black"/>
                <rect x="116" y="4" width="2" height="28" fill="black"/>
                <rect x="120" y="4" width="3" height="28" fill="black"/>
                <rect x="125" y="4" width="2" height="28" fill="black"/>
                <rect x="129" y="4" width="3" height="28" fill="black"/>
              </svg>
              <span className="text-[9px] font-mono tracking-widest text-slate-800 font-bold mt-0.5">
                *TTE-{docHash}*
              </span>
              <span className="text-[7.5px] font-sans font-bold text-emerald-700 uppercase tracking-wider">
                TTE Barcode Sah • SMPN 58
              </span>
            </div>
          ) : (
            /* QR CODE TTE DIGITAL */
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 print:bg-white border border-slate-300 dark:border-slate-700 print:border-slate-400 shadow-xs max-w-[170px] mx-auto">
              <div className="w-14 h-14 bg-white border border-slate-300 rounded-lg p-1.5 flex items-center justify-center relative">
                <svg className="w-full h-full text-slate-900" viewBox="0 0 48 48" fill="currentColor">
                  <rect x="4" y="4" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"/>
                  <rect x="7" y="7" width="6" height="6" fill="currentColor"/>
                  <rect x="32" y="4" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"/>
                  <rect x="35" y="7" width="6" height="6" fill="currentColor"/>
                  <rect x="4" y="32" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"/>
                  <rect x="7" y="35" width="6" height="6" fill="currentColor"/>
                  <rect x="20" y="4" width="4" height="4" fill="currentColor"/>
                  <rect x="26" y="8" width="4" height="4" fill="currentColor"/>
                  <rect x="20" y="14" width="4" height="4" fill="currentColor"/>
                  <rect x="8" y="20" width="4" height="4" fill="currentColor"/>
                  <rect x="14" y="24" width="4" height="4" fill="currentColor"/>
                  <rect x="20" y="20" width="8" height="8" fill="currentColor"/>
                  <rect x="32" y="20" width="4" height="4" fill="currentColor"/>
                  <rect x="40" y="24" width="4" height="4" fill="currentColor"/>
                  <rect x="20" y="32" width="4" height="4" fill="currentColor"/>
                  <rect x="28" y="36" width="4" height="4" fill="currentColor"/>
                  <rect x="36" y="32" width="8" height="4" fill="currentColor"/>
                  <rect x="36" y="40" width="4" height="4" fill="currentColor"/>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white p-0.5 rounded-full shadow-xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                </div>
              </div>
              <span className="text-[8.5px] font-mono tracking-wider text-slate-800 font-bold mt-1">
                TTE-{docHash}
              </span>
              <span className="text-[7.5px] font-sans font-bold text-emerald-700 uppercase tracking-wider">
                Tersertifikasi Digital
              </span>
            </div>
          )}
        </div>
      ) : (
        /* Manual Signature Space */
        <div className="h-16 flex items-center justify-center">
          <span className="font-serif italic text-slate-400 text-sm">(Tanda Tangan Manual)</span>
        </div>
      )}

      <div>
        <strong className="underline block font-bold text-slate-900 dark:text-white print:text-black text-xs sm:text-sm">
          {signerName}
        </strong>
        {signerNip && (
          <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 print:text-slate-700 block font-mono">
            NIP: {signerNip}
          </span>
        )}
      </div>
    </div>
  );
};
