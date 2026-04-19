import * as React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Check, Sparkles, CreditCard, Ticket, Timer, ShieldCheck, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';

export default function PlansView() {
  const { userProfile, redeemCoupon, updatePlan } = useAuth();
  const [couponCode, setCouponCode] = React.useState('');
  const [isRedeeming, setIsRedeeming] = React.useState(false);

  const daysLeft = userProfile?.planExpiresAt 
    ? Math.ceil((new Date(userProfile.planExpiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const handleRedeem = async () => {
    if (!couponCode) return;
    setIsRedeeming(true);
    const result = await redeemCoupon(couponCode);
    if (result.success) {
      toast.success(result.message);
      setCouponCode('');
    } else {
      toast.error(result.message);
    }
    setIsRedeeming(false);
  };

  const plans = [
    {
      id: 'Essential',
      name: 'Essential',
      price: '$0',
      period: 'Forever',
      description: 'The standard toolkit for personal finance mastery.',
      features: [
        'Complete Expense Tracking',
        'Income & Salary Management',
        'Basic Bill Reminders',
        'Sync Across Devices',
        'Savings Goal Basics'
      ],
      aiFeatures: false,
      color: 'bg-zinc-100 dark:bg-zinc-800'
    },
    {
      id: 'Intelligent',
      name: 'Intelligent',
      price: '$5',
      period: '/ Month',
      yearlyPrice: '$49',
      description: 'AI-powered foresight to double your savings speed.',
      features: [
        'Everything in Essential',
        'Visionary AI Forecasting',
        'Smart Budget Alerts',
        'Infinite ChatBot Counsel',
        'Investment Growth Math'
      ],
      aiFeatures: true,
      popular: true,
      color: 'bg-indigo-600'
    }
  ];

  return (
    <div className="space-y-10 pb-20">
      {/* Current Plan Overview */}
      <div className="relative overflow-hidden rounded-[32px] bg-zinc-900 dark:bg-black p-8 text-white shadow-2xl border border-white/5">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(79,70,229,1),transparent)]" />
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10">
              <ShieldCheck className="h-3 w-3 text-indigo-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100 italic">Membership Status</span>
            </div>
            <h3 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter leading-none">
              Current Plan: <span className="text-indigo-400">{userProfile?.plan}</span>
            </h3>
            {userProfile?.plan !== 'Essential' && daysLeft !== null && (
              <div className="flex items-center gap-2 text-zinc-400">
                <Timer className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-widest">
                  {daysLeft} days remaining in your subscription
                </span>
              </div>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="flex-1 min-w-[280px] sm:min-w-[340px] relative transition-transform hover:scale-[1.01]">
              <input 
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="ENTER COUPON CODE"
                className="w-full h-14 rounded-2xl bg-black/40 dark:bg-zinc-900/40 border border-white/10 pl-6 pr-36 text-sm font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-zinc-600 focus:bg-black/60"
              />
              <button 
                onClick={handleRedeem}
                disabled={isRedeeming || !couponCode}
                className="absolute right-2 top-2 h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/5 disabled:text-zinc-600 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg z-20 active:scale-95"
              >
                {isRedeeming ? '...' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Plans Comparison */}
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="relative"
          >
            {plan.popular && (
              <div className="absolute top-0 right-10 -translate-y-1/2 bg-indigo-600 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl z-20 border-4 border-white dark:border-black">
                Most Intelligent
              </div>
            )}
            
            <Card className={`relative h-full flex flex-col rounded-[32px] border transition-all duration-500 overflow-hidden bg-white dark:bg-black ${
              userProfile?.plan === plan.id 
                ? 'ring-4 ring-indigo-500/30 ring-offset-4 dark:ring-offset-black border-indigo-500 shadow-2xl scale-[1.02]' 
                : 'border-zinc-200 dark:border-white/10 hover:border-indigo-400'
            }`}>
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center justify-between mb-2">
                   <h3 className="text-xs font-black uppercase tracking-widest opacity-60 italic text-zinc-900 dark:text-white">{plan.name}</h3>
                   {userProfile?.plan === plan.id && (
                     <Badge className="bg-emerald-500 text-white border-none text-[8px] font-black px-2 uppercase shadow-lg shadow-emerald-500/20">Active</Badge>
                   )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black italic tracking-tighter text-zinc-900 dark:text-white">{plan.price}</span>
                  <span className="text-xs font-bold opacity-40 uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{plan.period}</span>
                </div>
                {plan.id !== 'Essential' && (
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">Or {plan.yearlyPrice} / Year</p>
                )}
                <p className="mt-4 text-xs font-bold text-zinc-500 uppercase tracking-tight italic leading-relaxed">
                  {plan.description}
                </p>
              </CardHeader>

              <CardContent className="p-8 flex-1 flex flex-col">
                <div className="space-y-4 flex-1 mb-8">
                  {plan.features.map((f, j) => (
                    <div key={j} className="flex items-start gap-3">
                      <div className={`mt-0.5 p-0.5 rounded-full bg-emerald-500 text-white`}>
                        <Check className="h-2.5 w-2.5" />
                      </div>
                      <span className="text-[11px] font-bold tracking-tight text-zinc-600 dark:text-zinc-400 uppercase">{f}</span>
                    </div>
                  ))}
                  {plan.aiFeatures ? (
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="h-3 w-3 text-indigo-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500">AI Capabilities Unlocked</span>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-4 grayscale opacity-40">
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="h-3 w-3 text-zinc-400" />
                        <span className="text-[9px] font-black uppercase tracking-widest">AI & Prediction Gated</span>
                      </div>
                    </div>
                  )}
                </div>

                <Button 
                  disabled={true}
                  className={`w-full h-14 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl transition-all ${
                    userProfile?.plan === plan.id
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-default'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed grayscale'
                  }`}
                >
                  {userProfile?.plan === plan.id 
                    ? 'Selected' 
                    : plan.id === 'Intelligent' 
                      ? 'Unlock via Coupon' 
                      : 'Locked'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Trust & Features Section */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: ShieldCheck, title: "Vault Security", desc: "Bank-level encryption for your financial data." },
          { icon: Zap, title: "Real-time Sync", desc: "Access your dashboard from any device instantly." },
          { icon: Sparkles, title: "AI Foresight", desc: "Predict future wealth based on spending trends." },
          { icon: CreditCard, title: "Cancel Anytime", desc: "No lock-in contracts. Upgrade or downgrade daily." }
        ].map((item, i) => (
          <div key={i} className="bg-zinc-50 dark:bg-zinc-900/40 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 text-center space-y-3">
            <div className="h-10 w-10 rounded-xl bg-white dark:bg-zinc-950 flex items-center justify-center mx-auto shadow-sm border border-zinc-100 dark:border-zinc-800">
              <item.icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h4 className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white">{item.title}</h4>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
