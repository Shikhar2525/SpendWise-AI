import { motion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';
import { 
  ArrowRight, 
  Sparkles, 
  PieChart, 
  CalendarClock, 
  BrainCircuit, 
  ShieldCheck, 
  Globe, 
  BarChart3,
  ChevronRight,
  Plus,
  LayoutDashboard,
  Wallet,
  Receipt,
  TrendingDown,
  Target,
  Zap,
  Check,
  Copy
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from './Logo';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeToggle } from './ThemeToggle';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export default function LandingPage() {
  const { signIn } = useAuth();
  const { resolvedTheme } = useTheme();
  const targetRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  const copyCode = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText('SPENDWISENEW100');
    toast.success('Promo code copied!', {
      description: 'Use it at checkout to unlock Intelligent for free.',
      duration: 3000,
    });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white selection:bg-indigo-500/30 font-sans transition-colors duration-500 overflow-x-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/5 dark:bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/5 dark:bg-emerald-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Fixed Sticky Header (Nav + Promo Stripe) */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md transition-colors">
        {/* Nav */}
        <nav className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo className="h-9 w-9" />
            <span className="text-xl font-black tracking-tighter uppercase italic">
              SpendWise <span className="text-indigo-600 dark:text-indigo-400">AI</span>
            </span>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-8">
            <div className="hidden md:flex items-center gap-8 mr-4">
              <a href="#features" className="text-sm font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Features</a>
              <a href="#preview" className="text-sm font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Preview</a>
              <a href="#pricing" className="text-sm font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Pricing</a>
            </div>
            <ThemeToggle />
            <Button 
              onClick={signIn}
              className="bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-full px-6 h-11 text-xs font-bold tracking-widest uppercase transition-all shadow-lg shadow-zinc-200 dark:shadow-none"
            >
              Sign In
            </Button>
          </div>
        </nav>

        {/* Indigo Announcement Stripe - Attached to Nav */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-indigo-600 dark:bg-indigo-500 py-1.5 px-6 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-8 border-t border-white/10"
        >
          <div className="flex items-center gap-2">
             <div className="h-1 w-1 rounded-full bg-white animate-pulse" />
             <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white whitespace-nowrap">
               Launch Deal: Intelligent is <span className="underline decoration-white/50 underline-offset-4 decoration-2">FREE</span> for first 100
             </p>
          </div>
          
          <button 
            onClick={() => copyCode()}
            className="flex items-center gap-2 bg-black/20 hover:bg-black/30 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-1 transition-all active:scale-95 group"
          >
             <span className="text-[10px] font-mono font-black text-white tracking-widest">SPENDWISENEW100</span>
             <div className="h-3 w-[1px] bg-white/20 mx-0.5" />
             <div className="flex items-center gap-1.5">
                <span className="text-[7px] font-black uppercase tracking-[0.2em] text-white/70 group-hover:text-white transition-colors">Copy</span>
                <Copy className="h-2.5 w-2.5 text-white/50 group-hover:text-white" />
             </div>
          </button>
        </motion.div>
      </header>

      {/* Hero Section */}
      <section ref={targetRef} className="relative pt-56 pb-24 px-6 overflow-hidden">
        <motion.div 
          style={{ opacity, scale }}
          className="max-w-7xl mx-auto text-center space-y-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 mb-4">
            <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-indigo-600 dark:text-indigo-400">Smart money management</span>
          </div>
          
          <h1 className="text-6xl sm:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.82] italic uppercase">
            Your Wealth <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 via-indigo-600 to-emerald-600 dark:from-white dark:via-indigo-400 dark:to-emerald-400 px-4 inline-block">Simplified</span> <br />
            Built for you.
          </h1>

          <p className="text-xl sm:text-2xl text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto leading-tight font-medium">
            SpendWise AI isn't a spreadsheet. It's your financial foresight. <br className="hidden sm:block" />
            Zero manual entry. Infinite growth.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button 
              onClick={signIn}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-full px-12 h-16 text-[14px] font-bold tracking-widest uppercase group shadow-2xl shadow-indigo-200 dark:shadow-indigo-500/20"
            >
              Launch Dashboard <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <a href="#pricing" className="flex items-center gap-4 px-8 h-16 border border-zinc-200 dark:border-zinc-800 rounded-full bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm hover:border-indigo-400 transition-colors">
              <div className="flex -space-x-3">
                {[1,2,3].map(i => (
                  <img 
                    key={i}
                    src={`https://picsum.photos/seed/${i + 50}/100/100`} 
                    alt="User" 
                    referrerPolicy="no-referrer"
                    className="h-9 w-9 rounded-full border-2 border-white dark:border-zinc-900 object-cover"
                  />
                ))}
              </div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-400">Trusted by <span className="text-zinc-900 dark:text-white">5,000+</span> creators</span>
            </a>
          </div>
        </motion.div>

        {/* Visual Mockup / Live Preview */}
        <div id="preview" className="mt-24 max-w-6xl mx-auto px-6 relative">
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true }}
            className="relative rounded-[40px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2 shadow-2xl overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-white/20 dark:from-zinc-950/20 to-transparent pointer-events-none z-10" />
            
            {/* Real Dashboard Preview */}
            <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-[34px] overflow-hidden border border-zinc-100 dark:border-zinc-800 flex h-[700px]">
              {/* Mini Sidebar */}
              <div className="w-16 sm:w-20 border-r border-zinc-100 dark:border-zinc-800 flex flex-col items-center py-8 gap-6 shrink-0 bg-white dark:bg-zinc-950">
                <Logo className="h-6 w-6 mb-4" />
                {[LayoutDashboard, Wallet, Receipt, PieChart, Sparkles].map((Icon, i) => (
                  <div key={i} className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${i === 0 ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow-lg' : 'text-zinc-400'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                ))}
              </div>
              
              {/* Main Content Preview */}
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                {/* Real-style Banner */}
                <div className="p-8 pb-0">
                  <div className="relative overflow-hidden rounded-[32px] bg-zinc-900 p-10 text-white">
                    <div className="absolute inset-0 opacity-20">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(79,70,229,1),transparent)]" />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                      <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10">
                          <Sparkles className="h-3 w-3 text-indigo-400" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Smart Analysis</span>
                        </div>
                        <h3 className="text-4xl font-black italic uppercase tracking-tighter leading-none">
                          Your Money is <br />
                          <span className="text-indigo-400">Set to Grow</span> 15%
                        </h3>
                        <p className="text-sm font-medium text-zinc-400 max-w-md">
                          "I found $450 in extra subscriptions. Saving this could reach your house goal 3 months faster."
                        </p>
                      </div>
                      <div className="flex gap-4">
                        <div className="p-6 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm text-center">
                          <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-1">Savings Goal</p>
                          <p className="text-2xl font-black italic tracking-tighter leading-none">$850k</p>
                        </div>
                        <div className="p-6 bg-emerald-500 rounded-2xl text-center text-zinc-950">
                          <p className="text-[9px] font-black uppercase tracking-widest mb-1">Active Liquidity</p>
                          <p className="text-2xl font-black italic tracking-tighter leading-none">$24,850</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8 space-y-8">
                  <div className="grid grid-cols-3 gap-6">
                    {[
                      { label: 'Monthly Income', val: '$12,400', color: 'text-emerald-500' },
                      { label: 'Burn Rate', val: '$4,200', color: 'text-rose-500' },
                      { label: 'Active Budget', val: '$3,800', color: 'text-indigo-500' }
                    ].map((card, i) => (
                      <div key={i} className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{card.label}</p>
                        <p className={`text-3xl font-black italic tracking-tighter ${card.color}`}>{card.val}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-8 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-8 shadow-sm">
                      <div className="flex justify-between items-center mb-10">
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-zinc-900 dark:text-white italic">Money Overview</h4>
                        <div className="flex gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                          <span className="text-indigo-500">Income</span>
                          <span>Expenses</span>
                        </div>
                      </div>
                      <div className="h-64 flex items-end gap-1.5">
                        {[40, 65, 35, 85, 45, 95, 25, 65, 75, 55, 85, 45].map((h, i) => (
                          <div key={i} className="flex-1 bg-indigo-500/10 rounded-t-xl group/bar relative">
                            <motion.div 
                              initial={{ height: 0 }}
                              whileInView={{ height: `${h}%` }}
                              className="w-full bg-indigo-500 rounded-t-xl transition-all duration-1000"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-8 shadow-sm space-y-8">
                       <div>
                         <h4 className="text-[11px] font-black uppercase tracking-widest text-zinc-400 mb-6">Smart Tips</h4>
                         <div className="space-y-4">
                           <div className="p-4 bg-rose-50 dark:bg-rose-500/5 rounded-2xl border border-rose-100 dark:border-rose-500/10 flex items-center gap-3">
                              <Zap className="h-4 w-4 text-rose-500" />
                              <span className="text-xs font-bold tracking-tight text-rose-600">Rent Due in 2 Days</span>
                           </div>
                           <div className="p-4 bg-emerald-50 dark:bg-emerald-500/5 rounded-2xl border border-emerald-100 dark:border-emerald-500/10 flex items-center gap-3">
                              <Check className="h-4 w-4 text-emerald-500" />
                              <span className="text-xs font-bold tracking-tight text-emerald-600">Savings Target Met</span>
                           </div>
                         </div>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Interaction UI */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
               <div className="bg-indigo-600 text-white rounded-full px-12 py-5 font-black uppercase tracking-widest shadow-2xl scale-110 border-4 border-white dark:border-zinc-950">
                  Interactive Preview
               </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature Grids */}
      <section id="features" className="py-32 px-6 bg-zinc-50/50 dark:bg-zinc-900/30 border-y border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-20">
            <Badge className="bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-none px-4 py-1">CORE ECOSYSTEM</Badge>
            <h2 className="text-5xl sm:text-7xl font-black tracking-tighter uppercase italic leading-tight">Every Feature. <br /> One Interface.</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <BrainCircuit className="h-5 w-5" />, title: "Smart Tracking", desc: "Auto-sorts your spending with 99.9% accuracy using smart AI.", accent: "rose" as const },
              { icon: <Wallet className="h-5 w-5" />, title: "Income Flow", desc: "See your salaries, dividends, and bonuses in one clear view.", accent: "emerald" as const },
              { icon: <Receipt className="h-5 w-5" />, title: "Easy Expenses", desc: "Track every penny with simple search and visual categories.", accent: "amber" as const },
              { icon: <PieChart className="h-5 w-5" />, title: "Dynamic Budgets", desc: "Set limits that change as your life and spending habits do.", accent: "emerald" as const },
              { icon: <CalendarClock className="h-5 w-5" />, title: "Bill Planning", desc: "Automatic reminders and tracking for all your monthly bills.", accent: "rose" as const },
              { icon: <Target className="h-5 w-5" />, title: "Savings Goals", desc: "Set money goals and see exactly when you will reach them.", accent: "amber" as const },
              { icon: <Sparkles className="h-5 w-5" />, title: "Money Assistant", desc: "Talk to your financial assistant for smart tips and insights.", accent: "emerald" as const },
              { icon: <Globe className="h-5 w-5" />, title: "Currency Converter", desc: "Manage money in any currency with live exchange rates.", accent: "rose" as const },
              { icon: <ShieldCheck className="h-5 w-5" />, title: "Safe & Secure", desc: "Bank-level security ensuring your data stays private and safe.", accent: "amber" as const }
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <FeatureCard 
                  icon={f.icon}
                  title={f.title}
                  description={f.desc}
                  accent={f.accent}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-20">
            <Badge className="bg-emerald-500/10 text-emerald-500 border-none px-4 py-1">TRANSPARENT PRICING</Badge>
            <h2 className="text-5xl sm:text-7xl font-black tracking-tighter uppercase italic leading-tight">Investment Plans.</h2>
            <p className="text-xl text-zinc-500 dark:text-zinc-400 font-medium max-w-2xl mx-auto">
              Choose the level of intelligence your wealth deserves. 
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              { 
                name: 'Essential', 
                price: '$0', 
                desc: 'Standard tools for everyone', 
                features: ['Complete Tracking', 'Financial Period Filters', 'Multi-Device Sync', 'Savings & Goals Toolkit'],
                cta: 'Start Forever Free',
                active: false
              },
              { 
                name: 'Intelligent', 
                price: '$5', 
                desc: 'Includes everything in Essential', 
                features: ['AI Intelligence Hub', 'Real-time Forecasts', 'Infinite AI Chat Counsel', 'Auto-Category Analysis', 'Global Support'],
                cta: 'Get Intelligent',
                active: true,
                badge: 'Most Popular'
              }
            ].map((plan, i) => (
              <div 
                key={i} 
                className={`relative p-10 rounded-[40px] border transition-all duration-500 flex flex-col ${plan.active ? 'bg-zinc-900 border-zinc-800 text-white scale-105 shadow-2xl z-10' : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-900 dark:text-white hover:border-indigo-400 opacity-90'}`}
              >
                {plan.badge && (
                  <div className="absolute top-0 right-10 -translate-y-1/2 bg-indigo-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">
                    {plan.badge}
                  </div>
                )}
                <div className="mb-8">
                  <h3 className="text-sm font-black uppercase tracking-widest opacity-60 mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black italic tracking-tighter">{plan.price}</span>
                    <span className="text-xs font-bold opacity-40 uppercase tracking-widest">/ Month</span>
                  </div>
                  {plan.name === 'Intelligent' && (
                    <div className="mt-2 flex flex-col gap-2">
                      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none">Or $49 / Year (Save 20%)</p>
                      
                      {/* Promotional Callout Card */}
                      <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-3 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-2 opacity-20">
                          <Zap className="h-12 w-12 text-indigo-500 -mr-4 -mt-4 rotate-12" />
                        </div>
                        <div className="relative z-10">
                          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1">Launch Privilege</p>
                          <p className="text-[10px] font-bold text-indigo-100 leading-tight">
                            Access all features for free. Limited to first 100 creators.
                          </p>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); copyCode(e); }}
                          className="w-full h-9 flex items-center justify-between px-3 bg-zinc-900 border border-white/10 rounded-xl transition-all hover:bg-black active:scale-[0.98] group/btn"
                        >
                          <span className="text-[9px] font-mono font-black text-indigo-400">SPENDWISENEW100</span>
                          <div className="flex items-center gap-2">
                             <span className="text-[7px] font-black uppercase tracking-widest text-zinc-500 group-hover/btn:text-white transition-colors">Apply</span>
                             <Copy className="h-3 w-3 text-zinc-600 group-hover/btn:text-indigo-400" />
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                  <p className="mt-4 text-xs font-bold opacity-60 uppercase tracking-tight italic leading-relaxed">{plan.desc}</p>
                </div>
                
                <ul className="space-y-4 mb-10 flex-1">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-3 text-xs font-bold tracking-tight">
                      <div className={`p-1 rounded-full ${plan.active ? 'bg-indigo-500' : 'bg-indigo-50 dark:bg-indigo-500/10'} text-white`}>
                        <Check className="h-3 w-3" />
                      </div>
                      <span className={plan.active ? 'text-zinc-300' : 'text-zinc-500'}>{f}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  onClick={signIn}
                  className={`w-full rounded-2xl h-14 text-xs font-black uppercase tracking-widest transition-all ${plan.active ? 'bg-white text-black hover:bg-zinc-100 shadow-xl' : 'bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-100'}`}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-20 p-8 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl text-center">
             <p className="text-sm font-bold text-zinc-400 tracking-tight uppercase italic">
               Note: The <span className="text-indigo-600 dark:text-indigo-400">Intelligent</span> plan is currently available for free to our first 100 users. Use code <span className="text-zinc-900 dark:text-white underline decoration-2 underline-offset-4">SPENDWISENEW100</span> at checkout.
             </p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-44 px-6 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-[200px] rounded-full" />
        </div>
        
        <div className="max-w-4xl mx-auto text-center space-y-12 relative z-10">
          <h2 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter uppercase italic leading-[0.85]">
            Stop Guessing. <br />
            <span className="text-indigo-600 dark:text-indigo-400">Start Growing.</span>
          </h2>
          <p className="text-xl text-zinc-500 dark:text-zinc-400 font-medium max-w-xl mx-auto">
            Join thousands of smart spenders who have gained full control over their financial destiny.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Button 
              onClick={signIn}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-full h-20 px-16 text-lg font-bold tracking-widest uppercase shadow-2xl shadow-indigo-500/20"
            >
              Start Free Trial
            </Button>
            <a href="#pricing" className="flex items-center gap-2 group cursor-pointer">
              <span className="text-sm font-bold tracking-[0.2em] uppercase">See Pricing</span>
              <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
          <div className="pt-10 flex items-center justify-center gap-8 text-[10px] font-bold tracking-widest uppercase text-zinc-400">
             <span>No credit card needed</span>
             <div className="h-1 w-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
             <span>GDPR Compliant</span>
             <div className="h-1 w-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
             <span>ISO 27001</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-16">
          <div className="space-y-6">
            <div className="flex items-center gap-2.5">
              <Logo className="h-8 w-8" />
              <span className="text-lg font-black tracking-tighter uppercase italic">SpendWise <span className="text-indigo-600 dark:text-indigo-400">AI</span></span>
            </div>
            <p className="max-w-xs text-sm font-medium text-zinc-500 leading-relaxed">
              Redefining financial management with design-driven AI solutions.
            </p>
            <div className="flex gap-4">
               {['X', 'INSTA', 'GH'].map(s => (
                 <a key={s} href="#" className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">{s}</a>
               ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-20">
             <div className="space-y-4">
               <h4 className="text-[10px] font-bold tracking-widest uppercase text-zinc-900 dark:text-white">Product</h4>
              <ul className="space-y-3 text-xs font-semibold text-zinc-500">
                <li><a href="#preview" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Live Preview</a></li>
                <li><a href="#pricing" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#features" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Intelligence</a></li>
              </ul>
             </div>
             <div className="space-y-4">
               <h4 className="text-[10px] font-bold tracking-widest uppercase text-zinc-900 dark:text-white">Company</h4>
               <ul className="space-y-3 text-xs font-semibold text-zinc-500">
                 <li><a href="#" className="hover:text-zinc-900 dark:hover:text-white">About</a></li>
                 <li><a href="#" className="hover:text-zinc-900 dark:hover:text-white">Manifesto</a></li>
                 <li><a href="#" className="hover:text-zinc-900 dark:hover:text-white">Privacy</a></li>
               </ul>
             </div>
             <div className="hidden sm:block space-y-4">
               <h4 className="text-[10px] font-bold tracking-widest uppercase text-zinc-900 dark:text-white">Newsletter</h4>
               <div className="flex gap-2">
                  <div className="h-10 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 flex-1" />
                  <div className="h-10 w-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white"><ArrowRight className="h-4 w-4" /></div>
               </div>
             </div>
          </div>
        </div>
        <div className="mt-20 max-w-7xl mx-auto pt-10 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-400">
           <span>© 2026 SPENDWISE AI INC.</span>
           <span>EST 2026 — SEOUL / LONDON / NY</span>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, accent }: { icon: React.ReactNode, title: string, description: string, accent: 'rose' | 'emerald' | 'amber' }) {
  const accentClasses = {
    rose: "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400",
    emerald: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };

  return (
    <Card className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-10 rounded-[40px] hover:border-indigo-400/50 dark:hover:border-indigo-500/50 transition-all group">
      <div className={`p-4 rounded-3xl w-fit mb-8 group-hover:scale-110 transition-transform duration-500 ${accentClasses[accent]}`}>
        {icon}
      </div>
      <h3 className="text-2xl font-bold mb-4 tracking-tight uppercase italic">{title}</h3>
      <p className="text-zinc-500 font-medium leading-relaxed">{description}</p>
    </Card>
  );
}
