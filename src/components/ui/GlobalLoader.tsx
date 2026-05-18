import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const loadingPhrases = [
  "Securing your ledger...",
  "Fetching party details...",
  "Calculating balances...",
  "Preparing dashboard...",
  "Syncing latest entries..."
];

export const GlobalLoader = ({ fullScreen = true }: { fullScreen?: boolean }) => {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % loadingPhrases.length);
    }, 1500); // Change text every 1.5 seconds

    return () => clearInterval(interval);
  }, []);

  const content = (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        {/* Outer glowing ring */}
        <div className="absolute inset-0 rounded-full blur-xl bg-blue-500/20 dark:bg-blue-400/15 animate-pulse"></div>
        {/* Inner spinner */}
        <div className="relative bg-white dark:bg-slate-900 p-4 rounded-full shadow-xl shadow-blue-500/10 border border-slate-100 dark:border-slate-800 transition-colors duration-200">
          <Loader2 className="w-10 h-10 text-blue-600 dark:text-blue-450 animate-spin" />
        </div>
      </div>
      
      <div className="h-6 flex items-center justify-center overflow-hidden">
        <p 
          key={phraseIndex} 
          className="text-slate-600 dark:text-slate-300 font-bold tracking-wide animate-in slide-in-from-bottom-2 fade-in duration-300"
        >
          {loadingPhrases[phraseIndex]}
        </p>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-sm fixed inset-0 z-[100] transition-colors duration-200">
        {content}
      </div>
    );
  }

  return (
    <div className="flex-grow flex items-center justify-center min-h-[60vh] w-full">
      {content}
    </div>
  );
};
