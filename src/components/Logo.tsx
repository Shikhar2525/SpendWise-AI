import * as React from 'react';
import { Bot } from 'lucide-react';

export function Logo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <div className={`shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 ${className.includes('h-') ? '' : 'h-10 w-10'} ${className}`}>
      <Bot className={`${className.includes('h-') ? 'h-[60%] w-[60%]' : 'h-6 w-6'} text-white`} />
    </div>
  );
}
