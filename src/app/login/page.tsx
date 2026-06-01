'use client';

import React, { useActionState } from 'react';
import { loginAction } from './actions';
import { Mail, Lock, AlertCircle, ArrowRight, LockKeyhole } from 'lucide-react';

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-radial from-slate-900 via-slate-950 to-black px-4 py-12">
      {/* Decorative blurred glowing backdrops */}
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" />
      
      {/* Login Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="glass-card bg-slate-950/40 border border-slate-800/60 p-8 md:p-10 shadow-2xl backdrop-blur-md rounded-2xl space-y-8">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-2">
              <LockKeyhole className="h-6 w-6" />
            </div>
            <h1 className="font-outfit font-extrabold text-2xl md:text-3xl tracking-tight text-white">
              Cuong Design
            </h1>
            <p className="text-xs text-slate-400 max-w-[280px] mx-auto leading-relaxed">
              Hệ thống Phân tích Đặt phòng & Dự báo Room Grid Nội bộ
            </p>
          </div>

          {/* Form */}
          <form action={formAction} className="space-y-6">
            {state?.error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-xs text-red-400 animate-shake">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{state.error}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Email Input */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Email Hệ Thống
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="admin@resort.com"
                    autoComplete="email"
                    disabled={isPending}
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="password" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Mật Khẩu
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={isPending}
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition-all duration-200 shadow-md hover:shadow-emerald-900/20 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 group"
            >
              {isPending ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <>
                  <span>Đăng Nhập</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {/* Footer Notice */}
          <div className="text-center">
            <span className="text-[9px] text-slate-600 font-medium tracking-wide uppercase">
              Hệ thống bảo mật • Quyền truy cập được giám sát
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
