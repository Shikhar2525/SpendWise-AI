import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  TrendingUp, 
  Wallet, 
  Target, 
  Calendar,
  CheckCircle2,
  ArrowRight,
  Receipt,
  PieChart
} from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '../contexts/AuthContext';
import { createPortal } from 'react-dom';

interface Step {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  targetId?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const steps: Step[] = [
  {
    title: "Welcome to SpendWise AI",
    description: "Your intelligent companion for mastering your personal finances. Let's take a quick tour.",
    icon: Sparkles,
    color: "bg-indigo-600",
    placement: 'center'
  },
  {
    title: "Dashboard Intelligence",
    description: "Your financial control center. See your net worth, monthly flow, and real-time usage at a glance.",
    icon: TrendingUp,
    color: "bg-emerald-600",
    targetId: "nav-dashboard",
    placement: 'right'
  },
  {
    title: "Period Filtering",
    description: "Analyze your wealth across time. Use the smart filter to switch between months and see historical trends.",
    icon: Calendar,
    color: "bg-zinc-600",
    targetId: "filter-container",
    placement: 'bottom'
  },
  {
    title: "Income Tracking",
    description: "Log your salaries and passive income. Build a healthy cash flow and watch your wealth grow.",
    icon: Wallet,
    color: "bg-blue-600",
    targetId: "nav-salaries",
    placement: 'right'
  },
  {
    title: "Expense Management",
    description: "Track every penny. Categorize your spending to find hidden savings and eliminate leaks.",
    icon: Receipt,
    color: "bg-amber-600",
    targetId: "nav-expenses",
    placement: 'right'
  },
  {
    title: "Smart Budgets",
    description: "Set boundaries for your spending. We'll alert you when you're nearing your category limits.",
    icon: PieChart,
    color: "bg-orange-600",
    targetId: "nav-budgets",
    placement: 'right'
  },
  {
    title: "Bill Reminders",
    description: "Never pay a late fee again. We track your cycles and notify you before payments are due.",
    icon: Calendar,
    color: "bg-rose-600",
    targetId: "nav-dues",
    placement: 'right'
  },
  {
    title: "AI Visionary Intelligence",
    description: "The brain of the operation. Our AI models predict your future wealth and offer high-level strategic advice.",
    icon: Sparkles,
    color: "bg-purple-600",
    targetId: "nav-insights",
    placement: 'right'
  }
];

interface TutorialProps {
  onClose?: () => void;
  onStepChange?: (index: number) => void;
  isReplay?: boolean;
}

export function Tutorial({ onClose, onStepChange, isReplay = false }: TutorialProps) {
  const [currentStep, setCurrentStep] = React.useState(0);
  const { markTutorialSeen } = useAuth();
  const [targetRect, setTargetRect] = React.useState<DOMRect | null>(null);

  React.useEffect(() => {
    onStepChange?.(currentStep);
    
    const step = steps[currentStep];
    if (step.targetId) {
      const updateRect = () => {
        const element = document.getElementById(step.targetId!);
        if (element) {
          setTargetRect(element.getBoundingClientRect());
        }
      };
      
      // Wait a bit for tabs to switch and layout to settle
      const timeoutId = setTimeout(updateRect, 300);
      window.addEventListener('resize', updateRect);
      
      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('resize', updateRect);
      };
    } else {
      setTargetRect(null);
    }
  }, [currentStep, onStepChange]);
  
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    if (!isReplay) {
      await markTutorialSeen();
    }
    onClose?.();
  };

  const step = steps[currentStep];

  const getPopoverStyle = (): React.CSSProperties => {
    if (!targetRect || step.placement === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const gap = 16;
    switch (step.placement) {
      case 'right':
        return {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.right + gap,
          transform: 'translateY(-50%)',
        };
      case 'bottom':
        return {
          top: targetRect.bottom + gap,
          left: targetRect.left + targetRect.width / 2,
          transform: 'translateX(-50%)',
        };
      case 'left':
        return {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.left - gap,
          transform: 'translate(-100%, -50%)',
        };
      case 'top':
        return {
          top: targetRect.top - gap,
          left: targetRect.left + targetRect.width / 2,
          transform: 'translate(-50%, -100%)',
        };
      default:
        return {};
    }
  };

  const popover = (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Background Dim - only for center or whole page focus */}
      {(!targetRect || step.placement === 'center') && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" onClick={handleComplete} />
      )}
      
      {/* Highlight Backdrop for target */}
      <AnimatePresence>
        {targetRect && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/20 pointer-events-auto"
            style={{
              clipPath: `polygon(
                0% 0%, 0% 100%, 
                ${targetRect.left}px 100%, 
                ${targetRect.left}px ${targetRect.top}px, 
                ${targetRect.right}px ${targetRect.top}px, 
                ${targetRect.right}px ${targetRect.bottom}px, 
                ${targetRect.left}px ${targetRect.bottom}px, 
                ${targetRect.left}px 100%, 100% 100%, 100% 0%
              )`
            }}
            onClick={handleComplete}
          />
        )}
      </AnimatePresence>

      <motion.div 
        key={currentStep}
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        style={getPopoverStyle()}
        className="absolute pointer-events-auto w-[320px] bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] overflow-hidden"
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className={`h-10 w-10 rounded-xl ${step.color} flex items-center justify-center shadow-lg shadow-black/10`}>
              <step.icon className="h-5 w-5 text-white" />
            </div>
            <button 
              onClick={handleComplete}
              className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-black italic tracking-tighter text-zinc-900 dark:text-white uppercase">
              {step.title}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-bold uppercase leading-relaxed tracking-tight">
              {step.description}
            </p>
          </div>
        </div>

        <div className="px-6 pb-6 flex items-center justify-between gap-4">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === currentStep ? 'w-4 bg-zinc-900 dark:bg-white' : 'w-1 bg-zinc-200 dark:bg-zinc-800'
                }`} 
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handlePrev}
                className="h-8 w-8 rounded-full border border-zinc-200 dark:border-zinc-800 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            
            <Button 
              size="sm"
              onClick={handleNext}
              className={`h-8 px-4 rounded-full font-black uppercase tracking-widest italic transition-all shadow-sm text-[9px] ${
                currentStep === steps.length - 1 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                  : 'bg-zinc-900 dark:bg-white text-white dark:text-black'
              }`}
            >
              {currentStep === steps.length - 1 ? "Start" : "Next"}
            </Button>
          </div>
        </div>

        <div className={`h-1 w-full ${step.color} opacity-40`} />
      </motion.div>
    </div>
  );

  return createPortal(popover, document.body);
}
