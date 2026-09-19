import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import {
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';

import { auth } from '@/shared/lib/firebase';
import { isNative } from '@/shared/lib/native';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

import {
  services,
  errorMessage,
} from '@/shared/services';

import { useSettings } from '@/shared/hooks/live';

import {
  Button,
  IconButton,
  Input,
  Logo,
} from '@/shared/ui';

import { toast } from '@/shared/store/toast';
import { APP } from '@/shared/config/app';
import { cn } from '@/shared/lib/cn';

import type {
  Address,
  Customer,
} from '@/shared/types';

import { isIOS, isStandalone } from '../lib/install';
import { useSession } from '../store/session';
import { useCart } from '../store/cart';

import {
  AddressFields,
  blankAddress,
} from '../components/AddressForm';


/* =========================================================
   TYPES
   ========================================================= */

type AuthMode = 'signin' | 'signup';

type LoginMethod = 'email' | 'phone';

const OTP_LEN = 6;

type PhoneStep =
  | 'phone'
  | 'otp'
  | 'profile';


/* =========================================================
   OTP BOXES
   ========================================================= */

function OtpBoxes({
  value,
  onChange,
  error,
  onComplete,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  onComplete: (value: string) => void;
}) {
  const refs = useRef<
    (HTMLInputElement | null)[]
  >([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const setDigit = (
    index: number,
    character: string,
  ) => {
    const digits = value
      .padEnd(OTP_LEN, ' ')
      .split('');

    digits[index] = character || ' ';

    const next = digits
      .join('')
      .replace(/\s+$/, '');

    onChange(next);

    if (
      next.replace(/\s/g, '').length === OTP_LEN
    ) {
      onComplete(next);
    }
  };

  return (
    /*
      This used to be a continuously animated
      Framer Motion container.

      It now only animates when an incorrect OTP
      is entered, which is much cheaper.
    */
    <motion.div
      className="flex justify-center gap-2 sm:gap-3"
      animate={
        error
          ? {
              x: [
                0,
                -8,
                8,
                -5,
                5,
                0,
              ],
            }
          : {
              x: 0,
            }
      }
      transition={{
        duration: 0.35,
      }}
      role="group"
      aria-label="6-digit verification code"
    >
      {Array.from({ length: OTP_LEN }, (_, index) => (
        <input
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
          inputMode="numeric"
          autoComplete={
            index === 0
              ? 'one-time-code'
              : 'off'
          }
          maxLength={1}
          aria-label={`Digit ${index + 1}`}
          value={
            value[index]?.trim() ?? ''
          }
          onChange={(event) => {
            const input =
              event.target.value.replace(
                /\D/g,
                '',
              );

            if (input.length > 1) {
              const all =
                input.slice(0, OTP_LEN);

              onChange(all);

              refs.current[
                Math.min(
                  OTP_LEN - 1,
                  all.length,
                )
              ]?.focus();

              if (all.length === OTP_LEN) {
                onComplete(all);
              }

              return;
            }

            setDigit(index, input);

            if (
              input &&
              index < OTP_LEN - 1
            ) {
              refs.current[
                index + 1
              ]?.focus();
            }
          }}
          onKeyDown={(event) => {
            if (
              event.key === 'Backspace' &&
              !value[index]?.trim() &&
              index > 0
            ) {
              refs.current[
                index - 1
              ]?.focus();
            }
          }}
          onPaste={(event) => {
            const pasted =
              event.clipboardData
                .getData('text')
                .replace(/\D/g, '')
                .slice(0, OTP_LEN);

            if (!pasted) {
              return;
            }

            event.preventDefault();

            onChange(pasted);

            if (pasted.length === OTP_LEN) {
              onComplete(pasted);
            }
          }}
          className={cn(
            'h-14 w-11 rounded-2xl border-2 sm:h-16 sm:w-14 bg-surface2/60 text-center font-display text-2xl font-extrabold outline-none sm:text-3xl transition-colors',
            'focus:border-violet',
            error
              ? 'border-pink'
              : value[index]?.trim()
                ? 'border-line'
                : 'border-line/60',
          )}
        />
      ))}
    </motion.div>
  );
}


/* =========================================================
   FIREBASE ERROR HANDLING
   ========================================================= */

function getFirebaseErrorMessage(
  code?: string,
  fallback?: string,
) {
  switch (code) {
    case 'auth/invalid-credential':
      return 'The email or password is incorrect.';

    case 'auth/invalid-email':
      return 'Please enter a valid email address.';

    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.';

    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';

    case 'auth/popup-closed-by-user':
      return 'Google sign-in was cancelled.';

    case 'auth/popup-blocked':
      return 'Chrome blocked the Google sign-in popup. Please allow popups for localhost.';

    case 'auth/cancelled-popup-request':
      return 'A Google sign-in request is already running.';

    case 'auth/unauthorized-domain':
      return 'localhost is not authorized in Firebase. Add localhost to Firebase Authorized Domains.';

    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled in Firebase.';

    case 'auth/invalid-oauth-client-id':
      return 'Google OAuth configuration is invalid in Firebase.';

    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';

    case 'auth/user-disabled':
      return 'This account has been disabled.';

    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a little and try again.';

    default:
      return (
        fallback ||
        'Something went wrong. Please try again.'
      );
  }
}


/* =========================================================
   LOGIN PAGE
   ========================================================= */

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const from =
    (
      location.state as {
        from?: string;
      } | null
    )?.from ?? '/';


  /* =======================================================
     EXISTING NIGHTOWL STORES
     ======================================================= */

  const login = useSession(
    (state) => state.login,
  );

  const finish = useSession(
    (state) =>
      state.finishOnboarding,
  );

  const setCartAddress = useCart(
    (state) => state.setAddress,
  );

  const [settings] =
    useSettings();


  /* =======================================================
     AUTH STATE
     ======================================================= */

  const [mode, setMode] =
    useState<AuthMode>('signin');

  const [method, setMethod] =
    useState<LoginMethod>(isIOS() && isStandalone() ? 'phone' : 'email');


  /* =======================================================
     EMAIL AUTH
     ======================================================= */

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [name, setName] =
    useState('');


  /* =======================================================
     PHONE AUTH
     ======================================================= */

  const [phoneStep, setPhoneStep] =
    useState<PhoneStep>('phone');

  const [phone, setPhone] =
    useState('');

  const [code, setCode] =
    useState('');

  const [resendIn, setResendIn] =
    useState(0);


  /* =======================================================
     ADDRESS
     ======================================================= */

  const [address, setAddress] =
    useState<Address>(() =>
      blankAddress(settings.hostels),
    );


  /* =======================================================
     UI STATE
     ======================================================= */

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState('');


  /* =======================================================
     KEEP ADDRESS CONFIG IN SYNC
     ======================================================= */

  useEffect(() => {
    if (
      !address.hostelId &&
      settings.hostels.length
    ) {
      setAddress(
        blankAddress(
          settings.hostels,
        ),
      );
    }
  }, [
    settings.hostels,
    address.hostelId,
  ]);


  /* =======================================================
     OTP COUNTDOWN
     ======================================================= */

  useEffect(() => {
    if (resendIn <= 0) {
      return;
    }

    const timer = setTimeout(
      () =>
        setResendIn(
          (current) =>
            current - 1,
        ),
      1000,
    );

    return () =>
      clearTimeout(timer);
  }, [resendIn]);


  /* =======================================================
     COMPLETE LOGIN
     ======================================================= */

  /**
   * Google/email sign-in only gives us a Firebase Auth user — unlike the
   * phone flow, nothing creates the matching customer record. Without one,
   * every screen that reads the customer (Profile, Cart, Addresses) waits
   * forever on data that will never arrive. Create a blank one on first
   * login so those screens have something to render.
   */
  const ensureCustomerRecord = async (userId: string, name?: string | null) => {
    const existing = await services.customers.getCustomer(userId);
    if (existing) return;
    await services.customers.saveProfile({
      id: userId,
      name: name?.trim() || 'Night Owl',
      phone: '',
      addresses: [],
      blocked: false,
      joinedAt: Date.now(),
    });
  };

  const finishLogin = (
    userId: string,
    displayName?: string | null,
    defaultAddressId?: string,
  ) => {
    login(userId);

    finish();

    if (defaultAddressId) {
      setCartAddress(
        defaultAddressId,
      );
    }

    const firstName =
      displayName
        ?.trim()
        .split(/\s+/)[0];

    toast({
      title: `Welcome${firstName ? `, ${firstName}` : ''}!`,
      emoji: '🦉',
    });

    navigate(from, {
      replace: true,
    });
  };


  /* =======================================================
     GOOGLE AUTH
     ======================================================= */

  const handleGoogleLogin =
    async () => {
      if (busy) {
        return;
      }

      setError('');
      setBusy(true);

      try {
        let result;

        if (isNative) {
          // Google blocks OAuth inside embedded WebViews, so ask the OS for the
          // Google account and hand the resulting token to the web SDK.
          const native =
            await FirebaseAuthentication.signInWithGoogle();

          const idToken =
            native.credential?.idToken;

          if (!idToken) {
            throw new Error('Google did not return a token.');
          }

          result =
            await signInWithCredential(
              auth,
              GoogleAuthProvider.credential(
                idToken,
                native.credential?.accessToken,
              ),
            );
        } else {
          const provider =
            new GoogleAuthProvider();

          provider.setCustomParameters({
            prompt: 'select_account',
          });

          result =
            await signInWithPopup(
              auth,
              provider,
            );
        }

        const user =
          result.user;

        await ensureCustomerRecord(user.uid, user.displayName);

        console.log(
          '================================',
        );

        console.log(
          '✅ NIGHTOWL GOOGLE LOGIN SUCCESS',
        );

        console.log(
          'UID:',
          user.uid,
        );

        console.log(
          'Name:',
          user.displayName,
        );

        console.log(
          'Email:',
          user.email,
        );

        console.log(
          '================================',
        );

        finishLogin(
          user.uid,
          user.displayName,
        );
      } catch (firebaseError: unknown) {
        console.error(
          '❌ NIGHTOWL GOOGLE LOGIN FAILED',
          firebaseError,
        );

        const errorObject =
          firebaseError as {
            code?: string;
            message?: string;
          };

        setError(
          getFirebaseErrorMessage(
            errorObject.code,
            errorObject.message,
          ),
        );
      } finally {
        setBusy(false);
      }
    };


  /* =======================================================
     EMAIL SIGN IN
     ======================================================= */

  const handleEmailSignIn =
    async () => {
      if (busy) {
        return;
      }

      setError('');

      const cleanEmail =
        email.trim();

      if (!cleanEmail) {
        setError(
          'Please enter your email address.',
        );
        return;
      }

      if (!password) {
        setError(
          'Please enter your password.',
        );
        return;
      }

      setBusy(true);

      try {
        const result =
          await signInWithEmailAndPassword(
            auth,
            cleanEmail,
            password,
          );

        await ensureCustomerRecord(result.user.uid, result.user.displayName);

        finishLogin(
          result.user.uid,
          result.user.displayName,
        );
      } catch (firebaseError: unknown) {
        console.error(
          'Email login failed:',
          firebaseError,
        );

        const errorObject =
          firebaseError as {
            code?: string;
            message?: string;
          };

        setError(
          getFirebaseErrorMessage(
            errorObject.code,
            errorObject.message,
          ),
        );
      } finally {
        setBusy(false);
      }
    };


  /* =======================================================
     EMAIL SIGN UP
     ======================================================= */

  const handleEmailSignup =
    async () => {
      if (busy) {
        return;
      }

      setError('');

      const cleanName =
        name.trim();

      const cleanEmail =
        email.trim();

      if (!cleanName) {
        setError(
          'Please enter your name.',
        );
        return;
      }

      if (!cleanEmail) {
        setError(
          'Please enter your email address.',
        );
        return;
      }

      if (password.length < 6) {
        setError(
          'Password must contain at least 6 characters.',
        );
        return;
      }

      if (
        password !==
        confirmPassword
      ) {
        setError(
          'Passwords do not match.',
        );
        return;
      }

      setBusy(true);

      try {
        const result =
          await createUserWithEmailAndPassword(
            auth,
            cleanEmail,
            password,
          );

        if (cleanName) {
          await updateProfile(
            result.user,
            {
              displayName:
                cleanName,
            },
          );
        }

        await ensureCustomerRecord(result.user.uid, cleanName);

        finishLogin(
          result.user.uid,
          cleanName,
        );
      } catch (firebaseError: unknown) {
        console.error(
          'Email signup failed:',
          firebaseError,
        );

        const errorObject =
          firebaseError as {
            code?: string;
            message?: string;
          };

        setError(
          getFirebaseErrorMessage(
            errorObject.code,
            errorObject.message,
          ),
        );
      } finally {
        setBusy(false);
      }
    };


  /* =======================================================
     SEND PHONE OTP
     ======================================================= */

  const sendOtp =
    async () => {
      setError('');
      setBusy(true);

      try {
        const result =
          await services.auth.requestOtp(
            phone,
          );

        setPhoneStep('otp');

        setCode('');

        setResendIn(30);

        toast(
          result.devCode
            ? {
                title: `Demo OTP: ${result.devCode}`,
                body: 'Dev-only demo account, no SMS is sent. Type or paste this code.',
                emoji: '💬',
                duration: 9000,
              }
            : {
                title: 'Code sent',
                body: `We texted a 6-digit code to +91 ${phone}.`,
                emoji: '💬',
                duration: 5000,
              },
        );
      } catch (otpError) {
        setError(
          errorMessage(otpError),
        );
      } finally {
        setBusy(false);
      }
    };


  /* =======================================================
     VERIFY PHONE OTP
     ======================================================= */

  const verifyOtp =
    async (
      verificationCode = code,
    ) => {
      if (
        verificationCode.length !== OTP_LEN ||
        busy
      ) {
        return;
      }

      setError('');
      setBusy(true);

      try {
        const result =
          await services.auth.verifyOtp(
            phone,
            verificationCode,
          );

        if (result.customer) {
          finishLogin(
            result.customer.id,
            result.customer.name,
            result.customer.defaultAddressId,
          );
        } else {
          setPhoneStep('profile');
        }
      } catch (otpError) {
        setError(
          errorMessage(otpError),
        );

        setCode('');
      } finally {
        setBusy(false);
      }
    };


  /* =======================================================
     CREATE PHONE PROFILE
     ======================================================= */

  const createPhoneProfile =
    async () => {
      setError('');
      setBusy(true);

      try {
        const finalAddress = {
          ...address,

          label:
            address.label.trim() ||
            'My room',
        };

        const customer: Customer = {
          id: phone,

          name: name.trim(),

          phone,

          addresses: [
            finalAddress,
          ],

          defaultAddressId:
            finalAddress.id,

          blocked: false,

          joinedAt: Date.now(),
        };

        await services.customers.saveProfile(
          customer,
        );

        finishLogin(
          customer.id,
          customer.name,
          customer.defaultAddressId,
        );
      } catch (profileError) {
        setError(
          errorMessage(profileError),
        );
      } finally {
        setBusy(false);
      }
    };


  /* =======================================================
     BACK
     ======================================================= */

  const handleBack = () => {
    setError('');

    if (
      method === 'phone' &&
      phoneStep !== 'phone'
    ) {
      setPhoneStep('phone');

      setCode('');

      return;
    }

    navigate(-1);
  };


  /* =======================================================
     SWITCH AUTH METHOD
     ======================================================= */

  const switchMethod = (
    nextMethod: LoginMethod,
  ) => {
    setMethod(nextMethod);

    setError('');
  };


  /* =======================================================
     SWITCH SIGN IN / SIGN UP
     ======================================================= */

  const switchMode = (
    nextMode: AuthMode,
  ) => {
    setMode(nextMode);

    setError('');
  };


  /* =======================================================
     PHONE PROFILE
     ======================================================= */

  if (
    method === 'phone' &&
    phoneStep === 'profile'
  ) {
    return (
      <main
        id="main"
        className="
          safe-top
          safe-bottom
          mx-auto
          flex
          min-h-dvh
          max-w-md
          flex-col
          px-6
          pb-8
        "
      >
        <div className="flex h-16 items-center">
          <IconButton
            label="Go back"
            onClick={handleBack}
            className="-ml-3"
          >
            <ArrowLeft className="h-5 w-5" />
          </IconButton>
        </div>

        <form
          className="flex flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();

            void createPhoneProfile();
          }}
        >
          <span
            className="text-5xl"
            aria-hidden
          >
            👋
          </span>

          <h1 className="mt-4 font-display text-[40px] font-extrabold leading-none tracking-tight">
            New here? Nice.
          </h1>

          <p className="mt-2 text-muted">
            Tell us where to bring the
            snacks.
          </p>

          <div className="mt-6 space-y-5">
            <Input
              label="Your name"
              placeholder="Full name"
              autoComplete="name"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value,
                )
              }
              autoFocus
              maxLength={40}
            />

            <AddressFields
              value={address}
              onChange={setAddress}
              hostels={
                settings.hostels
              }
            />
          </div>

          <p
            className="mt-2 min-h-[20px] text-sm text-pink"
            role="alert"
          >
            {error}
          </p>

          <div className="mt-auto pt-6">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              block
              loading={busy}
              disabled={
                !name.trim() ||
                !address.room.trim()
              }
            >
              Create account
            </Button>
          </div>
        </form>
      </main>
    );
  }


  /* =======================================================
     PHONE OTP
     ======================================================= */

  if (
    method === 'phone' &&
    phoneStep === 'otp'
  ) {
    return (
      <main
        id="main"
        className="
          safe-top
          safe-bottom
          mx-auto
          flex
          min-h-dvh
          max-w-md
          flex-col
          px-6
          pb-8
        "
      >
        <div className="flex h-16 items-center">
          <IconButton
            label="Go back"
            onClick={handleBack}
            className="-ml-3"
          >
            <ArrowLeft className="h-5 w-5" />
          </IconButton>
        </div>

        <div className="flex flex-1 flex-col">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-violet/15 text-violet">
            <ShieldCheck className="h-7 w-7" />
          </span>

          <h1 className="mt-6 font-display text-[40px] font-extrabold leading-none tracking-tight">
            Enter the code
          </h1>

          <p className="mt-2 text-muted">
            Sent to{' '}
            <b className="text-fg">
              +91{' '}
              {phone.replace(
                /(\d{5})(\d)/,
                '$1 $2',
              )}
            </b>
            .{' '}
            <button
              type="button"
              onClick={handleBack}
              className="font-semibold text-violet"
            >
              Change
            </button>
          </p>

          <div className="mt-10">
            <OtpBoxes
              value={code}
              onChange={setCode}
              error={!!error}
              onComplete={(value) =>
                void verifyOtp(value)
              }
            />

            <p
              className="mt-3 min-h-[20px] text-center text-sm text-pink"
              role="alert"
            >
              {error}
            </p>
          </div>

          <p className="mt-4 text-center text-sm text-muted">
            {resendIn > 0 ? (
              <>
                Resend code in{' '}
                <b className="tabular-nums text-fg">
                  0:
                  {String(
                    resendIn,
                  ).padStart(
                    2,
                    '0',
                  )}
                </b>
              </>
            ) : (
              <button
                type="button"
                onClick={() =>
                  void sendOtp()
                }
                className="hit font-semibold text-violet"
              >
                Resend code
              </button>
            )}
          </p>

          <div className="mt-auto pt-8">
            <Button
              variant="primary"
              size="lg"
              block
              loading={busy}
              disabled={
                code.length !== OTP_LEN
              }
              onClick={() =>
                void verifyOtp()
              }
            >
              Verify
            </Button>
          </div>
        </div>
      </main>
    );
  }


  /* =======================================================
     MAIN AUTH PAGE
     ======================================================= */

  return (
    <main
      id="main"
      className="
        safe-top
        safe-bottom
        min-h-dvh
        overflow-hidden
      "
    >
      <div className="mx-auto flex min-h-dvh max-w-7xl">

        {/* =================================================
            LEFT BRAND PANEL
            ================================================= */}

        <section
          className="
            relative
            hidden
            min-h-dvh
            w-1/2
            overflow-hidden
            border-r
            border-line
            bg-[#0b0911]
            lg:flex
            lg:flex-col
            lg:items-center
            lg:justify-center
          "
        >

          {/* -----------------------------------------------
              LIGHTWEIGHT AMBIENT GLOWS

              Smaller than the previous 600px/500px
              blur-[120px] elements.
             ----------------------------------------------- */}

          <div
            className="
              pointer-events-none
              absolute
              -left-32
              -top-32
              h-[420px]
              w-[420px]
              rounded-full
              bg-violet/15
              blur-[80px]
            "
          />

          <div
            className="
              pointer-events-none
              absolute
              -bottom-32
              left-10
              h-[360px]
              w-[360px]
              rounded-full
              bg-pink/10
              blur-[70px]
            "
          />

          <div
            className="
              pointer-events-none
              absolute
              bottom-0
              right-[-160px]
              h-[360px]
              w-[360px]
              rounded-full
              bg-cyan/10
              blur-[70px]
            "
          />


          {/* -----------------------------------------------
              BRAND
             ----------------------------------------------- */}

          <div className="absolute left-14 top-10 flex items-center gap-3">
            <Logo
              size={48}
              withText={false}
            />

            <span className="font-display text-2xl font-extrabold tracking-tight">
              NightOwl
            </span>
          </div>


          {/* =================================================
              FUTURISTIC ORBITAL SYSTEM

              IMPORTANT:
              No continuously running Framer Motion here.

              These use CSS transform animations from
              styles.css.

              This is substantially cheaper during scrolling.
              ================================================= */}

          <div className="relative mt-[-80px] h-[420px] w-[420px]">

            {/* Outer orbit */}
            <div
              className="
                login-orbit
                absolute
                inset-0
                rounded-full
                border
                border-violet/30
              "
            />

            {/* Second orbit */}
            <div
              className="
                login-orbit-reverse
                absolute
                inset-[42px]
                rounded-full
                border
                border-cyan/20
              "
            />

            {/* Third orbit */}
            <div
              className="
                login-orbit
                absolute
                inset-[82px]
                rounded-full
                border
                border-pink/20
              "
            />


            {/* ---------------------------------------------
                STATIC ORBITAL DOTS

                No independent infinite animation.
                They rotate naturally with their parent
                orbit system.
               --------------------------------------------- */}

            <span
              className="
                absolute
                left-1/2
                top-0
                h-3
                w-3
                -translate-x-1/2
                rounded-full
                bg-violet
                shadow-[0_0_20px_rgba(139,92,246,0.7)]
              "
            />

            <span
              className="
                absolute
                bottom-4
                right-12
                h-2.5
                w-2.5
                rounded-full
                bg-cyan
                shadow-[0_0_20px_rgba(34,211,238,0.7)]
              "
            />


            {/* ---------------------------------------------
                CENTER LOGO

                Static instead of continuously rotating
                and scaling.
               --------------------------------------------- */}

            <div
              className="
                absolute
                left-1/2
                top-1/2
                grid
                h-32
                w-32
                -translate-x-1/2
                -translate-y-1/2
                place-items-center
                rounded-[36px]
                bg-surface2/70
                shadow-2xl
                ring-1
                ring-white/5
                backdrop-blur-md
              "
            >
              <Logo
                size={72}
                withText={false}
              />
            </div>


            {/* ---------------------------------------------
                FLOATING LABELS

                Static now — no y animation running
                constantly during page scrolling.
               --------------------------------------------- */}

            <span
              className="
                absolute
                right-[-20px]
                top-[70px]
                rounded-full
                border
                border-cyan/30
                bg-[#11101a]/80
                px-4
                py-2
                font-mono
                text-xs
                font-bold
                text-cyan
              "
            >
              02 AM
            </span>

            <span
              className="
                absolute
                bottom-[40px]
                left-[-25px]
                rounded-full
                border
                border-violet/30
                bg-[#11101a]/80
                px-4
                py-2
                font-mono
                text-xs
                font-bold
                text-violet
              "
            >
              9 PM
            </span>
          </div>


          {/* -----------------------------------------------
              BRAND COPY
             ----------------------------------------------- */}

          <div className="relative z-10 mt-[-30px] max-w-xl px-10 text-center">

            <h2 className="font-display text-5xl font-extrabold leading-[1.02] tracking-tight">
              Midnight delivery,
              <br />

              <span className="bg-gradient-to-r from-violet via-fuchsia-400 to-pink bg-clip-text text-transparent">
                reimagined.
              </span>
            </h2>

            <p className="mx-auto mt-6 max-w-lg text-lg leading-8 text-muted">
              Built exclusively for hostel
              nights. Pick your stash, drop
              your room and let NightOwl
              handle the rest.
            </p>

            <div className="mt-8 flex justify-center gap-3">

              <span className="rounded-full border border-line bg-surface2/40 px-4 py-2 text-xs font-semibold text-muted">
                9 PM — 2 AM
              </span>

              <span className="rounded-full border border-line bg-surface2/40 px-4 py-2 text-xs font-semibold text-muted">
                Hostel only
              </span>

              <span className="rounded-full border border-line bg-surface2/40 px-4 py-2 text-xs font-semibold text-muted">
                Room delivery
              </span>

            </div>
          </div>
        </section>


        {/* =================================================
            RIGHT AUTH PANEL
            ================================================= */}

        <section
          className="
            relative
            flex
            min-h-dvh
            w-full
            flex-col
            justify-center
            px-6
            py-10
            lg:w-1/2
            lg:px-20
            xl:px-28
          "
        >

          {/* -----------------------------------------------
              MOBILE GLOW
             ----------------------------------------------- */}

          <div
            className="
              pointer-events-none
              absolute
              right-[-160px]
              top-[-160px]
              h-[380px]
              w-[380px]
              rounded-full
              bg-violet/10
              blur-[70px]
              lg:hidden
            "
          />


          {/* -----------------------------------------------
              BACK BUTTON
             ----------------------------------------------- */}

          <div className="absolute left-6 top-6 lg:left-10 lg:top-10">
            <IconButton
              label="Go back"
              onClick={handleBack}
            >
              <ArrowLeft className="h-5 w-5" />
            </IconButton>
          </div>


          <div className="relative mx-auto w-full max-w-xl">

            {/* ---------------------------------------------
                MOBILE LOGO
               --------------------------------------------- */}

            <div className="mb-10 flex items-center gap-3 lg:hidden">

              <Logo
                size={42}
                withText={false}
              />

              <span className="font-display text-xl font-extrabold">
                NightOwl
              </span>

            </div>


            {/* ---------------------------------------------
                HEADING
               --------------------------------------------- */}

            <div>

              <p className="font-mono text-xs font-bold uppercase tracking-[0.28em] text-violet">
                Night Access
              </p>

              <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
                {mode === 'signin'
                  ? 'Welcome back'
                  : 'Create your account'}
              </h1>

              <p className="mt-3 text-base text-muted">
                {mode === 'signin'
                  ? 'Sign in to continue your midnight run.'
                  : 'Create your NightOwl account and never miss the late-night stash.'}
              </p>

            </div>


            {/* ---------------------------------------------
                SIGN IN / SIGN UP
               --------------------------------------------- */}

            <div
              className="
                mt-8
                grid
                grid-cols-2
                rounded-2xl
                border
                border-line
                bg-surface2/20
                p-1
              "
            >

              <button
                type="button"
                onClick={() =>
                  switchMode('signin')
                }
                className={cn(
                  'h-12 rounded-xl font-semibold transition-colors',
                  mode === 'signin'
                    ? 'bg-fg text-bg shadow-lg'
                    : 'text-muted hover:text-fg',
                )}
              >
                Sign in
              </button>

              <button
                type="button"
                onClick={() =>
                  switchMode('signup')
                }
                className={cn(
                  'h-12 rounded-xl font-semibold transition-colors',
                  mode === 'signup'
                    ? 'bg-fg text-bg shadow-lg'
                    : 'text-muted hover:text-fg',
                )}
              >
                Sign up
              </button>

            </div>


            {/* =================================================
                GOOGLE
                ================================================= */}

            <button
              type="button"
              onClick={() =>
                void handleGoogleLogin()
              }
              disabled={busy}
              className="
                group
                mt-6
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
                transition-colors
                duration-200
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

              <span>
                {busy
                  ? 'Connecting to Google...'
                  : 'Continue with Google'}
              </span>

              {!busy && (
                <ArrowRight
                  className="
                    h-4
                    w-4
                    text-muted
                    transition-transform
                    duration-200
                    group-hover:translate-x-1
                  "
                />
              )}

            </button>


            {/* ---------------------------------------------
                DIVIDER
               --------------------------------------------- */}

            <div className="my-7 flex items-center gap-4">

              <div className="h-px flex-1 bg-line" />

              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                or continue with
              </span>

              <div className="h-px flex-1 bg-line" />

            </div>


            {/* =================================================
                EMAIL / PHONE
                ================================================= */}

            <div
              className="
                grid
                grid-cols-2
                rounded-2xl
                bg-surface2/60
                p-1
              "
            >

              <button
                type="button"
                onClick={() =>
                  switchMethod('email')
                }
                className={cn(
                  'flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors',
                  method === 'email'
                    ? 'bg-surface2 text-fg shadow-sm'
                    : 'text-muted hover:text-fg',
                )}
              >
                <Mail className="h-4 w-4" />
                Email
              </button>

              <button
                type="button"
                onClick={() =>
                  switchMethod('phone')
                }
                className={cn(
                  'flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors',
                  method === 'phone'
                    ? 'bg-surface2 text-fg shadow-sm'
                    : 'text-muted hover:text-fg',
                )}
              >
                <Phone className="h-4 w-4" />
                Phone
              </button>

            </div>


            <AnimatePresence mode="wait">

              {/* =================================================
                  EMAIL AUTH
                  ================================================= */}

              {method === 'email' && (
                <motion.div
                  key={`email-${mode}`}
                  initial={{
                    opacity: 0,
                    y: 8,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    y: -8,
                  }}
                  transition={{
                    duration: 0.16,
                  }}
                  className="mt-6"
                >

                  <form
                    onSubmit={(event) => {
                      event.preventDefault();

                      if (
                        mode === 'signin'
                      ) {
                        void handleEmailSignIn();
                      } else {
                        void handleEmailSignup();
                      }
                    }}
                    className="space-y-5"
                  >

                    {/* -----------------------------------------
                        NAME
                       ----------------------------------------- */}

                    {mode === 'signup' && (
                      <div>

                        <label
                          htmlFor="name"
                          className="field-label"
                        >
                          Your name
                        </label>

                        <div className="relative">

                          <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />

                          <input
                            id="name"
                            type="text"
                            autoComplete="name"
                            placeholder="Enter your full name"
                            value={name}
                            onChange={(event) =>
                              setName(
                                event.target.value,
                              )
                            }
                            className="field pl-12"
                            maxLength={40}
                          />

                        </div>
                      </div>
                    )}


                    {/* -----------------------------------------
                        EMAIL
                       ----------------------------------------- */}

                    <div>

                      <label
                        htmlFor="email"
                        className="field-label"
                      >
                        Email address
                      </label>

                      <div className="relative">

                        <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />

                        <input
                          id="email"
                          type="email"
                          autoComplete="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(event) =>
                            setEmail(
                              event.target.value,
                            )
                          }
                          className={cn(
                            'field pl-12',
                            error &&
                              'border-pink',
                          )}
                        />

                      </div>
                    </div>


                    {/* -----------------------------------------
                        PASSWORD
                       ----------------------------------------- */}

                    <div>

                      <div className="flex items-center justify-between">

                        <label
                          htmlFor="password"
                          className="field-label"
                        >
                          Password
                        </label>

                        {mode === 'signin' && (
                          <button
                            type="button"
                            className="text-xs font-semibold text-violet hover:underline"
                            onClick={() =>
                              toast({
                                title:
                                  'Password reset',
                                body:
                                  'Password reset flow will be connected next.',
                                emoji: '🔐',
                              })
                            }
                          >
                            Forgot password?
                          </button>
                        )}

                      </div>

                      <div className="relative">

                        <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />

                        <input
                          id="password"
                          type={
                            showPassword
                              ? 'text'
                              : 'password'
                          }
                          autoComplete={
                            mode === 'signin'
                              ? 'current-password'
                              : 'new-password'
                          }
                          placeholder={
                            mode === 'signin'
                              ? 'Enter your password'
                              : 'Create a password'
                          }
                          value={password}
                          onChange={(event) =>
                            setPassword(
                              event.target.value,
                            )
                          }
                          className={cn(
                            'field pl-12 pr-12',
                            error &&
                              'border-pink',
                          )}
                        />

                        <button
                          type="button"
                          aria-label={
                            showPassword
                              ? 'Hide password'
                              : 'Show password'
                          }
                          onClick={() =>
                            setShowPassword(
                              (value) =>
                                !value,
                            )
                          }
                          className="
                            absolute
                            right-3
                            top-1/2
                            grid
                            h-10
                            w-10
                            -translate-y-1/2
                            place-items-center
                            rounded-xl
                            text-muted
                            transition-colors
                            hover:bg-surface2
                            hover:text-fg
                          "
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>

                      </div>
                    </div>


                    {/* -----------------------------------------
                        CONFIRM PASSWORD
                       ----------------------------------------- */}

                    {mode === 'signup' && (
                      <div>

                        <label
                          htmlFor="confirm-password"
                          className="field-label"
                        >
                          Confirm password
                        </label>

                        <div className="relative">

                          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />

                          <input
                            id="confirm-password"
                            type={
                              showConfirmPassword
                                ? 'text'
                                : 'password'
                            }
                            autoComplete="new-password"
                            placeholder="Confirm your password"
                            value={
                              confirmPassword
                            }
                            onChange={(event) =>
                              setConfirmPassword(
                                event.target
                                  .value,
                              )
                            }
                            className={cn(
                              'field pl-12 pr-12',
                              error &&
                                'border-pink',
                            )}
                          />

                          <button
                            type="button"
                            aria-label={
                              showConfirmPassword
                                ? 'Hide password'
                                : 'Show password'
                            }
                            onClick={() =>
                              setShowConfirmPassword(
                                (value) =>
                                  !value,
                              )
                            }
                            className="
                              absolute
                              right-3
                              top-1/2
                              grid
                              h-10
                              w-10
                              -translate-y-1/2
                              place-items-center
                              rounded-xl
                              text-muted
                              transition-colors
                              hover:bg-surface2
                              hover:text-fg
                            "
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </button>

                        </div>
                      </div>
                    )}


                    {/* -----------------------------------------
                        ERROR
                       ----------------------------------------- */}

                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{
                            opacity: 0,
                            height: 0,
                          }}
                          animate={{
                            opacity: 1,
                            height: 'auto',
                          }}
                          exit={{
                            opacity: 0,
                            height: 0,
                          }}
                          transition={{
                            duration: 0.15,
                          }}
                          className="
                            overflow-hidden
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
                        </motion.div>
                      )}
                    </AnimatePresence>


                    {/* -----------------------------------------
                        SUBMIT
                       ----------------------------------------- */}

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      block
                      loading={busy}
                      disabled={
                        !email.trim() ||
                        !password ||
                        (
                          mode === 'signup' &&
                          (
                            !name.trim() ||
                            !confirmPassword
                          )
                        )
                      }
                      icon={
                        <ArrowRight className="h-5 w-5" />
                      }
                    >
                      {mode === 'signin'
                        ? 'Sign in'
                        : 'Create account'}
                    </Button>

                  </form>
                </motion.div>
              )}


              {/* =================================================
                  PHONE AUTH
                  ================================================= */}

              {method === 'phone' && (
                <motion.div
                  key="phone"
                  initial={{
                    opacity: 0,
                    y: 8,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    y: -8,
                  }}
                  transition={{
                    duration: 0.16,
                  }}
                  className="mt-6"
                >

                  <form
                    onSubmit={(event) => {
                      event.preventDefault();

                      void sendOtp();
                    }}
                    className="space-y-5"
                  >

                    {/* -----------------------------------------
                        PHONE
                       ----------------------------------------- */}

                    <div>

                      <label
                        htmlFor="phone"
                        className="field-label"
                      >
                        Mobile number
                      </label>

                      <div
                        className={cn(
                          'flex h-14 items-center rounded-2xl border-2 bg-surface2/60 transition-colors focus-within:border-violet',
                          error
                            ? 'border-pink'
                            : 'border-line',
                        )}
                      >

                        <span className="flex h-full items-center gap-1.5 border-r border-line px-4 font-semibold text-muted">
                          <Phone className="h-4 w-4" />
                          +91
                        </span>

                        <input
                          id="phone"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          placeholder="98765 43210"
                          value={phone.replace(
                            /(\d{5})(\d)/,
                            '$1 $2',
                          )}
                          onChange={(event) =>
                            setPhone(
                              event.target.value
                                .replace(
                                  /\D/g,
                                  '',
                                )
                                .slice(
                                  0,
                                  10,
                                ),
                            )
                          }
                          className="
                            h-full
                            min-w-0
                            flex-1
                            bg-transparent
                            px-4
                            font-display
                            text-2xl
                            font-bold
                            tracking-wide
                            outline-none
                            placeholder:text-muted/40
                          "
                        />

                      </div>
                    </div>


                    {/* -----------------------------------------
                        DEMO ACCOUNT
                       ----------------------------------------- */}

                    {import.meta.env.DEV && (
                      <button
                        type="button"
                        onClick={() =>
                          setPhone(
                            APP.demoUserPhone,
                          )
                        }
                        className="text-sm font-semibold text-violet hover:underline"
                      >
                        Use demo account (
                        {APP.demoUserPhone})
                      </button>
                    )}


                    {/* -----------------------------------------
                        ERROR
                       ----------------------------------------- */}

                    {error && (
                      <div
                        className="
                          rounded-xl
                          border
                          border-pink/30
                          bg-pink/5
                          px-4
                          py-3
                          text-sm
                          text-pink
                        "
                        role="alert"
                      >
                        {error}
                      </div>
                    )}


                    {/* -----------------------------------------
                        SEND OTP
                       ----------------------------------------- */}

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      block
                      loading={busy}
                      disabled={
                        phone.length !== 10
                      }
                      icon={
                        <ArrowRight className="h-5 w-5" />
                      }
                    >
                      Send code
                    </Button>


                    {/* -----------------------------------------
                        LEGAL
                       ----------------------------------------- */}

                    <p className="text-center text-[12px] leading-5 text-muted">
                      By continuing you agree
                      to our{' '}

                      <Link
                        className="underline"
                        to="/legal/terms"
                      >
                        Terms
                      </Link>{' '}

                      and{' '}

                      <Link
                        className="underline"
                        to="/legal/privacy"
                      >
                        Privacy policy
                      </Link>
                      .
                    </p>

                  </form>
                </motion.div>
              )}

            </AnimatePresence>


            {/* =================================================
                SECURITY FOOTER
                ================================================= */}

            <div className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-muted">

              <LockKeyhole className="h-3.5 w-3.5" />

              <span>
                Secure authentication powered by
                Firebase
              </span>

            </div>

          </div>
        </section>

      </div>
    </main>
  );
}