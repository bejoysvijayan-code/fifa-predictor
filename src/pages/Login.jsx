import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export default function Login() {
  const { user, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'var(--c-page)', transition: 'background 0.2s ease' }}
    >
      {/* Decorative orbs — subtle in both themes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full"
          style={{ top: '15%', left: '20%', width: 320, height: 320,
            background: 'var(--c-primary)', filter: 'blur(100px)', opacity: 0.12 }}
        />
        <div
          className="absolute rounded-full"
          style={{ bottom: '20%', right: '15%', width: 400, height: 400,
            background: '#8B5CF6', filter: 'blur(120px)', opacity: 0.08 }}
        />
        <div
          className="absolute rounded-full"
          style={{ top: '60%', left: '55%', width: 200, height: 200,
            background: 'var(--c-gold)', filter: 'blur(80px)', opacity: 0.08 }}
        />
      </div>

      <div className="w-full max-w-sm relative animate-slide-up">
        {/* Brand */}
        <div className="text-center mb-10">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5"
            style={{
              background: 'linear-gradient(135deg, #5B6CF8, #8B5CF6)',
              boxShadow: '0 8px 32px rgba(91,108,248,0.35)',
            }}
          >
            ⚽
          </div>
          <h1 className="text-[28px] font-bold tracking-tight" style={{ color: 'var(--c-t1)' }}>
            FIFA Predictor
          </h1>
          <p className="mt-2 text-[14px]" style={{ color: 'var(--c-t3)' }}>
            World Cup 2026 · Predict. Compete. Win.
          </p>
        </div>

        {/* Auth card */}
        <div
          className="rounded-2xl p-7"
          style={{
            background: 'var(--c-card)',
            border: '1px solid var(--c-border)',
            boxShadow: 'var(--c-shadow)',
            transition: 'background 0.2s, border-color 0.2s',
          }}
        >
          <p className="text-center text-[13px] font-medium mb-5" style={{ color: 'var(--c-t2)' }}>
            Sign in to start predicting
          </p>
          <button
            onClick={loginWithGoogle}
            className="flex items-center justify-center gap-3 w-full font-semibold py-3 px-4 rounded-xl text-[14px] transition-all duration-200 active:scale-[0.98]"
            style={{
              background: '#ffffff',
              color: '#111827',
              border: '1px solid rgba(0,0,0,0.10)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
          >
            <GoogleIcon />
            Continue with Google
          </button>
          <p className="text-center text-[11px] mt-5" style={{ color: 'var(--c-t3)' }}>
            By signing in, you agree to participate in good faith.
          </p>
        </div>

        {/* Feature teasers */}
        <div className="flex items-center justify-center gap-8 mt-8">
          {[['⚽', 'Pick winners'], ['🏆', 'Earn points'], ['📊', 'Track rank']].map(([icon, text]) => (
            <div key={text} className="flex flex-col items-center gap-1.5">
              <span className="text-xl">{icon}</span>
              <span className="text-[11px] font-medium" style={{ color: 'var(--c-t3)' }}>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
