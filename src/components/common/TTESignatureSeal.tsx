'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { ShieldCheck, ExternalLink, QrCode as QrIcon } from 'lucide-react';
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
  const schoolName = settings?.schoolName || 'SMP Negeri 58 Palembang';
  
  const todayStr = signDate || new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const docHash = (documentId || 'VALID').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
  const fullDocId = `CBT58-${docHash}`;

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const barcodeSvgRef = useRef<SVGSVGElement | null>(null);

  // Construct official verification URL
  const [verifyUrl, setVerifyUrl] = useState<string>('');

  useEffect(() => {
    const origin = typeof window !== 'undefined' && window.location.origin 
      ? window.location.origin 
      : 'https://cbt58-smpn58palembang.sch.id';

    const url = `${origin}/verify?doc=${encodeURIComponent(fullDocId)}&signer=${encodeURIComponent(signerName)}&nip=${encodeURIComponent(signerNip || '-')}&title=${encodeURIComponent(signerTitle)}&school=${encodeURIComponent(schoolName)}&date=${encodeURIComponent(todayStr)}`;
    setVerifyUrl(url);

    // Generate real, 100% scannable QR Code
    if (enableTTE && tteType === 'qrcode') {
      QRCode.toDataURL(url, {
        width: 180,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      })
        .then((dataUri) => {
          setQrDataUrl(dataUri);
        })
        .catch((err) => {
          console.error('Error generating QR Code:', err);
        });
    }
  }, [fullDocId, signerName, signerNip, signerTitle, schoolName, todayStr, enableTTE, tteType]);

  // Generate real, 100% scannable Code-128 Barcode
  useEffect(() => {
    if (enableTTE && tteType === 'barcode' && barcodeSvgRef.current) {
      try {
        JsBarcode(barcodeSvgRef.current, fullDocId, {
          format: 'CODE128',
          width: 1.5,
          height: 38,
          displayValue: false,
          lineColor: '#0f172a',
          margin: 0,
          background: '#ffffff'
        });
      } catch (err) {
        console.error('Error generating Code128 barcode:', err);
      }
    }
  }, [enableTTE, tteType, fullDocId]);

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
            /* REAL 100% SCANNABLE CODE-128 BARCODE */
            <div 
              title="Barcode Sah CBT SMPN 58 (Bisa discan dengan scanner optik/HP)"
              className="group relative flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-slate-300 dark:border-slate-700 print:border-slate-400 shadow-xs max-w-[210px] mx-auto transition-transform hover:scale-105"
            >
              <div className="bg-white p-1 rounded">
                <svg ref={barcodeSvgRef} className="max-w-[170px] h-9 mx-auto block"></svg>
              </div>
              <span className="text-[9px] font-mono tracking-widest text-slate-800 font-bold mt-0.5">
                *{fullDocId}*
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                {settings?.logoRight ? (
                  <img
                    src={settings.logoRight}
                    alt="Logo"
                    className="w-3 h-3 object-contain shrink-0"
                  />
                ) : (
                  <ShieldCheck className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                )}
                <span className="text-[7.5px] font-sans font-bold text-emerald-700 uppercase tracking-wider truncate max-w-[140px]">
                  TTE Barcode Sah • {settings?.schoolName ? settings.schoolName.replace('SMP NEGERI ', 'SMPN ') : 'SMPN 58'}
                </span>
              </div>
              <span className="text-[7px] text-slate-400 font-sans print:hidden">
                Scan dengan Barcode Scanner
              </span>
            </div>
          ) : (
            /* REAL 100% SCANNABLE QR CODE */
            <a
              href={verifyUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              title="Klik atau Scan dengan Kamera HP untuk Membuka Verifikasi Dokumen"
              className="group relative flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-slate-300 dark:border-slate-700 print:border-slate-400 shadow-xs max-w-[160px] mx-auto transition-all hover:scale-105 hover:border-emerald-500 cursor-pointer"
            >
              <div className="w-16 h-16 sm:w-18 sm:h-18 bg-white border border-slate-200 rounded-lg p-1 flex items-center justify-center relative overflow-hidden">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR Code Verifikasi TTE ${fullDocId}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                    <QrIcon className="w-6 h-6 text-slate-400 animate-pulse" />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 mt-1 text-slate-800">
                <span className="text-[8.5px] font-mono tracking-wider font-bold">
                  {fullDocId}
                </span>
                <ExternalLink className="w-2.5 h-2.5 text-slate-400 group-hover:text-emerald-600 transition-colors print:hidden" />
              </div>

              <div className="flex items-center gap-1">
                {settings?.logoRight ? (
                  <img
                    src={settings.logoRight}
                    alt="Logo"
                    className="w-3 h-3 object-contain shrink-0"
                  />
                ) : (
                  <ShieldCheck className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                )}
                <span className="text-[7.5px] font-sans font-bold text-emerald-700 uppercase tracking-wider truncate max-w-[120px]">
                  TTE Sah • {settings?.schoolName ? settings.schoolName.replace('SMP NEGERI ', 'SMPN ') : 'SMPN 58'}
                </span>
              </div>
              
              <span className="text-[7px] text-slate-400 font-sans mt-0.5 print:hidden">
                Scan via Kamera HP
              </span>
            </a>
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
        {signerNip && signerNip !== '-' && (
          <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 print:text-slate-700 block font-mono">
            NIP: {signerNip}
          </span>
        )}
      </div>
    </div>
  );
};
