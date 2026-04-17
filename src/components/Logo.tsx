import * as React from 'react';
import { Wallet, Sparkles } from 'lucide-react';

export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  // Extract h- and w- from className if provided, otherwise default to h-10 w-10 for the container
  const containerClasses = className.includes('h-') ? className : `h-10 w-10 ${className}`;
  
  return (
    <div className={`shrink-0 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center shadow-lg shadow-indigo-500/20 relative group ${containerClasses}`}>
      <Wallet className="h-[55%] w-[55%] text-indigo-100/80 group-hover:scale-110 transition-transform" />
      <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/3 h-[45%] w-[45%] rounded-lg bg-white flex items-center justify-center shadow-md animate-pulse z-10">
        <Sparkles className="h-[70%] w-[70%] text-indigo-600 font-bold" />
      </div>
    </div>
  );
}
