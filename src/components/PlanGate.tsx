import * as React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert, Sparkles, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface PlanGateProps {
  children: React.ReactNode;
  featureName: string;
  requiredPlan?: 'Intelligent';
}

export function PlanGate({ children, featureName, requiredPlan = 'Intelligent' }: PlanGateProps) {
  const { userProfile } = useAuth();
  
  const currentPlan = userProfile?.plan || 'Essential';
  
  const hasAccess = currentPlan !== 'Essential';

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div 
      className={cn(
        "relative group",
        // Only apply w-full if we are in a context that expects it (like a card grid member)
        // or let the parent decide. Removing forced w-full/rounded to avoid global glitches.
      )}
    >
      {!hasAccess && (
        <div className="absolute inset-0 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-[6px] z-10 flex flex-col items-center justify-center p-8 text-center rounded-[inherit]">
          <div className="h-16 w-16 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-6 border-2 border-indigo-100 dark:border-indigo-500/20 shadow-inner">
            <ShieldAlert className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-xl font-black tracking-tighter uppercase italic text-zinc-900 dark:text-white mb-3 leading-none">
            {featureName} Locked
          </h3>
          <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] max-w-[200px] mb-8 leading-relaxed">
            Upgrade to {requiredPlan} to unlock AI capabilities.
          </p>
          <div 
            className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-black text-[9px] font-black uppercase tracking-[0.2em] cursor-pointer shadow-2xl hover:scale-105 active:scale-95 transition-all shadow-indigo-500/20"
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'plans' }));
            }}
          >
            <Sparkles className="h-3 w-3" />
            <span>View Plans</span>
          </div>
        </div>
      )}
      <div className={cn(!hasAccess && "opacity-40 grayscale pointer-events-none")}>
        {children}
      </div>
    </div>
  );
}
