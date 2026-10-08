import React, { useState } from 'react';
import { AuraLogo } from '../components/common/AuraLogo';
import { Button } from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Lock, ArrowLeft } from 'lucide-react';

interface AdminLoginProps {
  onSuccess: () => void;
  onGoBack: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess, onGoBack }) => {
  const { loginWithGoogle, authError, clearAuthError } = useAuth();
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [appleNotice, setAppleNotice] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoadingGoogle(true);
    setAppleNotice(null);
    clearAuthError();
    const success = await loginWithGoogle();
    setIsLoadingGoogle(false);
    if (success) {
      onSuccess();
    }
  };

  const handleAppleLogin = () => {
    setAppleNotice('Apple Sign-In requires an active Apple Developer Team ID in production. Please use authorized Google Sign-In.');
  };

  return (
    <div className="min-h-screen bg-[#F8F6F0] flex flex-col justify-between items-center px-4 py-8">
      {/* Top back link */}
      <div className="w-full max-w-md flex justify-start">
        <button
          onClick={onGoBack}
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-[#77736B] hover:text-[#171717] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Public Experience</span>
        </button>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-[#FCFBF8] border border-[#E8E0D0] p-8 sm:p-10 rounded-xs shadow-xl flex flex-col items-center text-center my-auto">
        <AuraLogo size="md" stacked={true} showWordmark={true} className="mb-6" />

        <div className="flex items-center gap-2 mb-2 text-[#C8A96B]">
          <Lock className="w-3.5 h-3.5" />
          <span className="text-xs uppercase tracking-[0.3em] font-semibold">
            Studio Access
          </span>
        </div>

        <h2
          className="font-serif text-2xl sm:text-3xl text-[#171717] font-normal tracking-wide mb-2"
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
        >
          Authorized Access Only
        </h2>

        <p className="text-xs sm:text-sm text-[#77736B] font-light max-w-xs mb-8 leading-relaxed">
          Sign in with your verified administrative account to manage albums, media, and client deliveries for Beki's Studio.
        </p>

        {/* Error Notification */}
        {authError && (
          <div className="w-full mb-6 p-3.5 bg-red-50/80 border border-red-200 text-red-800 text-xs rounded-xs flex items-start gap-2.5 text-left leading-relaxed">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{authError}</p>
              <p className="text-[11px] text-red-600 mt-0.5">
                Ensure you are logging in with an authorized Beki's Studio administrator email.
              </p>
            </div>
          </div>
        )}

        {/* Apple notice */}
        {appleNotice && (
          <div className="w-full mb-6 p-3.5 bg-amber-50/80 border border-amber-200 text-amber-900 text-xs rounded-xs text-left leading-relaxed">
            {appleNotice}
          </div>
        )}

        {/* Auth Buttons */}
        <div className="w-full space-y-3">
          <Button
            variant="primary"
            size="md"
            onClick={handleGoogleLogin}
            isLoading={isLoadingGoogle}
            className="w-full py-3 text-xs tracking-[0.2em] uppercase font-semibold"
            leftIcon={
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            }
          >
            Continue with Google
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={handleAppleLogin}
            className="w-full py-3 text-xs tracking-[0.2em] uppercase"
            leftIcon={
              <svg className="w-4 h-4 fill-current" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-6.42-9.79-11.51-20.89-15.27-33.32-3.76-12.43-5.64-24.19-5.64-35.29 0-14.79 3.65-27.02 10.96-36.68 7.3-9.66 16.48-14.6 27.53-14.81 4.7 0 9.87 1.25 15.52 3.76 5.64 2.5 9.4 3.76 11.28 3.76 1.48 0 5.43-1.32 11.85-3.96 6.42-2.65 11.81-3.83 16.18-3.56 12.08.64 21.73 5.3 28.96 13.98-10.6 6.42-15.77 15.48-15.52 27.17.25 9.17 3.75 16.92 10.5 23.25 6.75 6.33 14.81 9.94 24.19 10.84-2.22 6.78-4.94 13.52-8.16 20.23zM119.22 31.85c0-7.39 2.65-14.34 7.95-20.86 5.3-6.52 11.96-10.59 19.98-12.21.37 1.35.56 2.7.56 4.05 0 7.39-2.77 14.47-8.31 21.23-5.54 6.77-12.26 10.85-20.18 12.25-.25-1.48-.37-2.97-.37-4.46z" />
              </svg>
            }
          >
            Continue with Apple
          </Button>
        </div>

        {/* Fine divider */}
        <div className="w-16 h-px bg-[#E8E0D0] my-8" />

        <p className="text-[11px] text-[#A8A49C] tracking-wider uppercase">
          Beki's Studio &bull; Security Infrastructure
        </p>
      </div>

      <div className="text-center pt-4">
        <p className="text-[10px] text-[#77736B] tracking-widest uppercase">
          Confidential Platform Access
        </p>
      </div>
    </div>
  );
};
