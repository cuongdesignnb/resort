'use client';

import React, { useActionState } from 'react';
import { loginAction } from './actions';
import { Mail, Lock, AlertCircle, ArrowRight, LockKeyhole } from 'lucide-react';

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-slate-950 px-4 py-12 selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Dynamic decorative blurred glowing backdrops */}
      <div className="absolute top-1/10 left-1/10 w-[400px] h-[400px] rounded-full bg-emerald-500/10 blur-[130px] pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-1/10 right-1/10 w-[500px] h-[500px] rounded-full bg-teal-500/5 blur-[150px] pointer-events-none animate-pulse duration-[12000ms]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      
      {/* Background grids */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-slate-900/70 border border-slate-800/80 p-8 md:p-10 shadow-[0_0_50px_-12px_rgba(16,185,129,0.15)] backdrop-blur-2xl rounded-3xl space-y-8">
          
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-1 shadow-inner shadow-emerald-500/5">
              <LockKeyhole className="h-6 w-6 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h1 className="font-outfit font-extrabold text-3xl tracking-tight text-white">
                Cuong <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">Design</span>
              </h1>
              <p className="text-xs text-slate-400 max-w-[280px] mx-auto leading-relaxed">
                Hệ thống Phân tích Đặt phòng & Dự báo Room Grid Nội bộ
              </p>
            </div>
          </div>

          {/* Form */}
          <form action={formAction} className="space-y-6">
            {state?.error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-2.5 text-xs text-red-400 animate-shake">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{state.error}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Email Input */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                  Email Hệ Thống
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-emerald-500 transition-colors">
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
                    className="w-full pl-10 pr-4 py-3 bg-slate-950/40 border border-slate-800/80 rounded-2xl text-sm text-slate-100 placeholder-slate-600 focus:outline-hidden focus:border-emerald-500/80 focus:ring-4 focus:ring-emerald-500/10 transition-all duration-200 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                  Mật Khẩu
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-emerald-500 transition-colors">
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
                    className="w-full pl-10 pr-4 py-3 bg-slate-950/40 border border-slate-800/80 rounded-2xl text-sm text-slate-100 placeholder-slate-600 focus:outline-hidden focus:border-emerald-500/80 focus:ring-4 focus:ring-emerald-500/10 transition-all duration-200 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] text-white font-semibold text-sm rounded-2xl transition-all duration-200 shadow-lg shadow-emerald-950/20 active:shadow-none flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 group border border-emerald-500/20"
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
          <div className="text-center pt-2">
            <span className="text-[9px] text-slate-600 font-semibold tracking-wider uppercase">
              Hệ thống bảo mật • Quyền truy cập được giám sát
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
