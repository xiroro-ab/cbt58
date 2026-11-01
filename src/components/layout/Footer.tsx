'use client';

import React from 'react';

interface FooterProps {
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  const [currentYear, setCurrentYear] = React.useState(2026);

  React.useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className={`py-3 sm:py-4 px-4 sm:px-6 lg:px-8 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md print:hidden transition-colors w-full ${className}`}>
      <div className="w-full max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 text-center sm:text-left text-xs sm:text-sm">
        {/* Hak Cipta Sekolah Resmi */}
        <div className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
          <span>
            © {currentYear} <strong>SMP Negeri 58 Palembang</strong>. Seluruh Hak Cipta Dilindungi.
          </span>
        </div>

        {/* Identitas Pengembang Aplikasi */}
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <span>Dikembangkan oleh:</span>
          <span className="font-bold text-violet-600 dark:text-violet-400">
            Aris Bermansyah, S.Kom
          </span>
        </div>
      </div>
    </footer>
  );
};
