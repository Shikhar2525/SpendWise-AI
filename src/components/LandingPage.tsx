import { motion } from 'motion/react';
import { ArrowRight, Wallet, Target, Sparkles, PieChart, Calendar, LayoutDashboard, BrainCircuit, Zap, Bot } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from './Logo';

export default function LandingPage() {
  const { signIn } = useAuth();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-indigo-500 selection:text-white font-sans overflow-x-hidden">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
      </div>

      {/* Nav */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Logo className="h-10 w-10" />
          <span className="text-xl font-black tracking-tighter italic">SpendWise <span className="text-indigo-400">AI</span></span>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={signIn} className="text-sm font-bold tracking-widest uppercase hover:text-indigo-400 transition-colors hidden sm:block">
            Dashboard
          </button>
          <Button 
            onClick={signIn}
            className="bg-white text-black hover:bg-zinc-200 rounded-full px-8 h-12 text-[11px] font-bold tracking-widest uppercase shadow-xl"
          >
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32 overflow-hidden">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-8"
          >
            <motion.div variants={item} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-400">AI-Powered Financial Freedom</span>
            </motion.div>
            
            <motion.h1 variants={item} className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-[0.9] italic">
              SMARTER <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-white to-emerald-400">SAVINGS</span> <br />
              FOR EVERYONE.
            </motion.h1>

            <motion.p variants={item} className="text-lg text-zinc-500 max-w-lg leading-relaxed font-medium">
              Take control of your money with AI that works for you. 
              Automatically track bills, set clear savings goals, and 
              get simple advice to grow your wealth.
            </motion.p>

            <motion.div variants={item} className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button 
                onClick={signIn}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-full px-10 h-14 text-[12px] font-bold tracking-widest uppercase group"
              >
                Join Now <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <div className="flex items-center gap-4 px-6 border-l border-white/10 ml-0 sm:ml-4">
                <div className="flex -space-x-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-10 w-10 rounded-full border-2 border-black bg-zinc-800 flex items-center justify-center overflow-hidden">
                      <img 
                        src={`https://picsum.photos/seed/${i + 10}/100/100`} 
                        alt="User" 
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover grayscale opacity-50"
                      />
                    </div>
                  ))}
                </div>
                <div className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 leading-tight">
                  Join <span className="text-white">100+ users</span> <br />
                  building wealth
                </div>
              </div>
            </motion.div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            {/* Bento Grid Mockup */}
            <div className="grid grid-cols-2 gap-4 relative z-10">
              <Card className="bg-zinc-900/50 border-white/5 backdrop-blur-3xl p-6 rounded-[32px] transform -rotate-3 hover:rotate-0 transition-transform duration-500 group">
                <div className="p-3 bg-indigo-500/10 rounded-2xl w-fit mb-4 group-hover:bg-indigo-500/20 transition-colors">
                  <PieChart className="h-6 w-6 text-indigo-400" />
                </div>
                <h3 className="font-bold text-sm mb-2">Smart Insights</h3>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full w-[70%] bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                </div>
              </Card>

              <Card className="bg-zinc-900/50 border-white/5 backdrop-blur-3xl p-6 rounded-[32px] transform translate-y-8 group">
                <div className="p-3 bg-emerald-500/10 rounded-2xl w-fit mb-4 group-hover:bg-emerald-500/20 transition-colors">
                  <Target className="h-6 w-6 text-emerald-400" />
                </div>
                <h3 className="font-bold text-sm mb-2">Goal Tracking</h3>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full w-[45%] bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                </div>
              </Card>

              <Card className="col-span-2 bg-[#0a0a0a] border-white/5 backdrop-blur-3xl p-8 rounded-[40px] shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-indigo-400" />
                    </div>
                    <span className="text-xs font-bold tracking-widest text-zinc-400 uppercase">Visionary Forecast</span>
                  </div>
                  <Badge className="bg-white/5 border-white/10 text-zinc-500 text-[8px] tracking-widest uppercase">Live</Badge>
                </div>
                <p className="text-base font-bold italic leading-relaxed text-zinc-200">
                  "Based on your current habits, your savings will grow by 42% by 2027. You're on track to become a millionaire by 2032!"
                </p>
              </Card>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Features Rail */}
      <section className="border-y border-white/5 bg-zinc-950/50 py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-6 overflow-hidden">
          <motion.div 
            animate={{ x: [0, -100, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="flex items-center gap-20 whitespace-nowrap opacity-20 grayscale brightness-200"
          >
            {['SMART TRACKING', 'EASY INSIGHTS', 'RECURRING BILLS', 'GOAL SETTING', 'ANY CURRENCY', 'FUTURE FORECAST'].map(f => (
              <span key={f} className="text-2xl font-black italic tracking-widest">{f}</span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Bento Section */}
      <section className="max-w-7xl mx-auto px-6 py-32 relative z-10">
        <div className="text-center mb-20 space-y-4">
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight italic">HOW IT WORKS.</h2>
          <p className="text-zinc-500 font-medium text-lg max-w-2xl mx-auto">Stop worrying about numbers. Let SpendWise AI handle the math while you focus on living.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <BentoCard 
            icon={<Calendar className="h-5 w-5 text-indigo-400" />}
            title="Auto-Pilot Bills"
            description="We track your recurring rent or subscriptions so you never miss a payment. Future months are automatically planned."
            className="md:col-span-2"
          />
          <BentoCard 
            icon={<Wallet className="h-5 w-5 text-emerald-400" />}
            title="Global Currency"
            description="Work anywhere, save anywhere. We convert all your expenses automatically to your local currency."
          />
          <BentoCard 
            icon={<BrainCircuit className="h-5 w-5 text-purple-400" />}
            title="AI Finance Assistant"
            description="Just chat with your assistant to add an expense or ask: 'Can I afford a new phone this month?'."
          />
          <BentoCard 
            icon={<LayoutDashboard className="h-5 w-5 text-rose-400" />}
            title="Future Forecast"
            description="See your net worth grow. Our AI predicts your future wealth based on how you save and spend today."
            className="md:col-span-2"
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-5xl mx-auto px-6 py-32 relative z-10">
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[48px] p-12 sm:p-20 text-center space-y-10 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-20 opacity-10">
            <Bot className="h-64 w-64" />
          </div>
          <h2 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight italic leading-none">
            READY TO SCALE <br />
            YOUR WEALTH?
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Button 
              onClick={signIn}
              className="bg-white text-black hover:bg-zinc-200 rounded-full h-16 px-12 text-[14px] font-bold tracking-widest uppercase shadow-2xl w-full sm:w-auto"
            >
              Get Started for Free
            </Button>
          </div>
          <p className="text-indigo-200/60 text-[10px] font-bold tracking-widest uppercase">No credit card required • Secure Google Login</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-10">
          <div className="flex items-center gap-2 grayscale group hover:grayscale-0 transition-all cursor-pointer">
            <Logo className="h-8 w-8 !bg-zinc-800 group-hover:!bg-indigo-600" />
            <span className="text-lg font-black tracking-tighter italic">SpendWise <span className="text-indigo-400">AI</span></span>
          </div>
          <p className="text-zinc-600 text-[10px] font-bold tracking-[0.2em] uppercase">© 2026 SpendWise AI. Made for your future.</p>
        </div>
      </footer>
    </div>
  );
}

function BentoCard({ icon, title, description, className = "" }: { icon: React.ReactNode, title: string, description: string, className?: string }) {
  return (
    <Card className={`bg-white/[0.02] border-white/5 backdrop-blur-xl p-8 rounded-[32px] hover:bg-white/[0.05] transition-all hover:border-white/10 group ${className}`}>
      <div className="p-3 bg-white/5 rounded-2xl w-fit mb-6 group-hover:scale-110 transition-transform duration-500">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 italic tracking-tight">{title}</h3>
      <p className="text-zinc-500 text-sm leading-relaxed font-medium">{description}</p>
    </Card>
  );
}
