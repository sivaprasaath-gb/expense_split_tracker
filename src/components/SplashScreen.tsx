import React, { useEffect, useState } from 'react';
import { Wallet, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  appName?: string;
  onFinish?: () => void;
  duration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  appName = 'VARAVU&SELAVU',
  onFinish,
  duration = 1400,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Start fade out slightly before completion
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, Math.max(800, duration - 400));

    // Complete splash
    const finishTimer = setTimeout(() => {
      setIsVisible(false);
      onFinish?.();
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [duration, onFinish]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950 text-white transition-opacity duration-400 ease-out select-none ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      onClick={() => {
        setIsFadingOut(true);
        setTimeout(() => {
          setIsVisible(false);
          onFinish?.();
        }, 200);
      }}
    >
      <div className="flex flex-col items-center text-center px-6 max-w-xs animate-in zoom-in-90 duration-500 ease-out">
        {/* Animated Brand Logo */}
        <div className="relative mb-6">
          {/* Subtle Ambient Glow */}
          <div className="absolute -inset-4 bg-indigo-500/20 rounded-full blur-xl animate-pulse" />
          
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 p-0.5 shadow-2xl shadow-indigo-500/30 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950/90 rounded-[22px] flex items-center justify-center backdrop-blur-sm">
              <Wallet className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-400" />
            </div>
          </div>

          <div className="absolute -bottom-1 -right-1 p-1.5 bg-emerald-500 rounded-full text-slate-950 shadow-md">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1.5 font-sans">
          {appName}
        </h1>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm text-slate-400 font-medium tracking-wide">
          Smart Expense & Split Tracker
        </p>

        {/* Minimalist Loading Bar */}
        <div className="w-32 h-1 bg-slate-800 rounded-full mt-8 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full animate-[shimmer_1.2s_infinite_linear] w-full" />
        </div>

        <span className="text-[10px] text-slate-500 mt-4 tracking-wider uppercase font-semibold">
          Loading your ledger...
        </span>
      </div>
    </div>
  );
};
