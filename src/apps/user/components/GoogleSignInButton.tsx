import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import { signInWithGoogle } from '@/shared/lib/firebaseAuth';
import { useSession } from '../store/session';

interface GoogleSignInButtonProps {
  from?: string;
}

export default function GoogleSignInButton({
  from = '/',
}: GoogleSignInButtonProps) {
  const navigate = useNavigate();

  const login = useSession((state) => state.login);
  const finishOnboarding = useSession(
    (state) => state.finishOnboarding
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const user = await signInWithGoogle();

      /*
       * Firebase gives the user a unique UID.
       * We use that UID as the NightOwl session ID.
       */
      login(user.uid);

      /*
       * Google authentication is complete.
       */
      finishOnboarding();

      /*
       * Redirect to the page the user originally wanted.
       */
      navigate(from, {
        replace: true,
      });
    } catch (error: unknown) {
      console.error(
        'NightOwl Google authentication error:',
        error
      );

      const firebaseError = error as {
        code?: string;
        message?: string;
      };

      switch (firebaseError.code) {
        case 'auth/popup-closed-by-user':
          setError('Google sign-in was cancelled.');
          break;

        case 'auth/popup-blocked':
          setError(
            'Chrome blocked the Google sign-in popup. Please allow popups for localhost.'
          );
          break;

        case 'auth/cancelled-popup-request':
          setError(
            'A Google sign-in request is already running.'
          );
          break;

        case 'auth/unauthorized-domain':
          setError(
            'localhost is not authorized in Firebase. Add localhost to Firebase Authorized Domains.'
          );
          break;

        case 'auth/operation-not-allowed':
          setError(
            'Google sign-in is not enabled in Firebase Authentication.'
          );
          break;

        case 'auth/invalid-oauth-client-id':
          setError(
            'Google OAuth configuration is invalid in Firebase.'
          );
          break;

        case 'auth/network-request-failed':
          setError(
            'Network error. Check your internet connection and try again.'
          );
          break;

        default:
          setError(
            firebaseError.message ||
              'Google sign-in failed. Please try again.'
          );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => void handleGoogleSignIn()}
        disabled={loading}
        className="
          group
          flex
          h-14
          w-full
          items-center
          justify-center
          gap-3
          rounded-2xl
          border
          border-line
          bg-transparent
          px-5
          font-semibold
          text-fg
          transition-all
          duration-300
          hover:border-violet
          hover:bg-violet/10
          disabled:cursor-not-allowed
          disabled:opacity-60
        "
      >
        {/* Google logo */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fill="#4285F4"
            d="M21.35 12.27c0-.71-.06-1.4-.18-2.06H12v3.9h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.23Z"
          />

          <path
            fill="#34A853"
            d="M12 21.7c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.75 9.75 0 0 0 12 21.7Z"
          />

          <path
            fill="#FBBC05"
            d="M6.54 13.78A5.86 5.86 0 0 1 6.23 12c0-.62.11-1.22.31-1.78V7.69H3.3A9.76 9.76 0 0 0 2.25 12c0 1.57.38 3.05 1.05 4.31l3.24-2.53Z"
          />

          <path
            fill="#EA4335"
            d="M12 6.19c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.29 14.63 2.3 12 2.3a9.75 9.75 0 0 0-8.7 5.39l3.24 2.53C7.31 7.91 9.46 6.19 12 6.19Z"
          />
        </svg>

        {/* Button text */}
        <span>
          {loading
            ? 'Connecting to Google...'
            : 'Continue with Google'}
        </span>

        {/* Arrow */}
        {!loading && (
          <ArrowRight
            className="
              h-4
              w-4
              text-muted
              transition-transform
              duration-300
              group-hover:translate-x-1
            "
          />
        )}
      </button>

      {/* Firebase error */}
      {error && (
        <div
          className="
            mt-3
            rounded-xl
            border
            border-pink/30
            bg-pink/5
            px-4
            py-3
            text-sm
            leading-relaxed
            text-pink
          "
          role="alert"
        >
          {error}
        </div>
      )}
    </div>
  );
}