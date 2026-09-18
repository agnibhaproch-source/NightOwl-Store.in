import { motion } from 'framer-motion';
import { useId } from 'react';
import { fmtDuration, type StoreStatus } from '../lib/time';
import { cn } from '../lib/cn';

export function NightDial({
  status,
  now,
  compact,
  className,
}: {
  status: StoreStatus;
  now: number;
  compact?: boolean;
  className?: string;
}) {
  const id = useId().replace(/:/g, '');

  const span = Math.max(
    status.windowEnd - status.windowStart,
    1
  );

  const inWindow =
    now >= status.windowStart &&
    now < status.windowEnd;

  const progress =
    status.isOpen && inWindow
      ? Math.min(
          Math.max(
            (now - status.windowStart) / span,
            0
          ),
          1
        )
      : 0;

  const headline = status.manual
    ? status.isOpen
      ? 'Open'
      : 'Closed'
    : status.msToChange != null
      ? fmtDuration(status.msToChange)
      : '';

  const sub = status.manual
    ? status.isOpen
      ? 'The store opened early tonight'
      : 'Taking a short break tonight'
    : status.isOpen
      ? 'left to order tonight'
      : 'until we open';

  const radius = 104;
  const circumference =
    2 * Math.PI * radius;

  const dashOffset =
    circumference * (1 - progress);

  return (
    <div
      className={cn(
        'relative flex flex-col items-center',
        className
      )}
    >
      {/* =====================================================
          NIGHT WINDOW HEADER
      ===================================================== */}

      {!compact && (
        <div className="mb-3 flex w-full items-center justify-between px-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
              Night window
            </p>

            <p className="mt-1 text-sm font-semibold text-fg">
              9 PM{' '}
              <span className="text-muted">
                →
              </span>{' '}
              2 AM
            </p>
          </div>

          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
              status.isOpen
                ? status.closingSoon
                  ? 'bg-amber/10 text-amber'
                  : 'bg-lime/10 text-lime'
                : 'bg-pink/10 text-pink'
            )}
          >
            <span className="relative flex h-1.5 w-1.5">
              {status.isOpen && (
                <span className="pulse-ring absolute inset-0 rounded-full bg-current" />
              )}

              <span className="relative h-1.5 w-1.5 rounded-full bg-current" />
            </span>

            {status.isOpen
              ? status.closingSoon
                ? 'Closing soon'
                : 'Open now'
              : 'Closed'}
          </span>
        </div>
      )}

      {/* =====================================================
          ORBITAL SYSTEM
      ===================================================== */}

      <div
        className={cn(
          'relative aspect-square w-full',
          compact
            ? 'max-w-[230px]'
            : 'max-w-[320px]'
        )}
      >
        {/* Ambient glow */}

        <motion.div
          className={cn(
            'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full',
            'bg-violet/10 blur-3xl',
            compact
              ? 'h-32 w-32'
              : 'h-48 w-48'
          )}
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.45, 0.7, 0.45],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* =================================================
            OUTER ORBIT
        ================================================= */}

        <motion.div
          className="
            absolute
            inset-[8%]
            rounded-full
            border
            border-violet/20
          "
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 35,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          {/* Orbit particle */}

          <span
            className="
              absolute
              left-1/2
              top-0
              h-2.5
              w-2.5
              -translate-x-1/2
              -translate-y-1/2
              rounded-full
              bg-cyan
              shadow-[0_0_18px_rgb(var(--cyan)/.8)]
            "
          />
        </motion.div>

        {/* =================================================
            SECONDARY ORBIT
        ================================================= */}

        <motion.div
          className="
            absolute
            inset-[18%]
            rounded-full
            border
            border-line/60
          "
          animate={{
            rotate: -360,
          }}
          transition={{
            duration: 50,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          <span
            className="
              absolute
              bottom-[8%]
              left-[12%]
              h-1.5
              w-1.5
              rounded-full
              bg-violet
              shadow-[0_0_14px_rgb(var(--violet)/.8)]
            "
          />
        </motion.div>

        {/* =================================================
            PROGRESS RING
        ================================================= */}

        <svg
          viewBox="0 0 240 240"
          className="
            absolute
            inset-0
            h-full
            w-full
            -rotate-90
          "
          aria-hidden
        >
          <defs>
            <linearGradient
              id={`night-progress-${id}`}
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="rgb(var(--violet))"
              />

              <stop
                offset="50%"
                stopColor="rgb(var(--cyan))"
              />

              <stop
                offset="100%"
                stopColor="rgb(var(--lime))"
              />
            </linearGradient>
          </defs>

          {/* Base ring */}

          <circle
            cx="120"
            cy="120"
            r={radius}
            fill="none"
            stroke="rgb(var(--line) / .55)"
            strokeWidth="2"
          />

          {/* Active progress */}

          {status.isOpen && (
            <motion.circle
              cx="120"
              cy="120"
              r={radius}
              fill="none"
              stroke={`url(#night-progress-${id})`}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{
                strokeDashoffset:
                  circumference,
              }}
              animate={{
                strokeDashoffset:
                  dashOffset,
              }}
              transition={{
                duration: 1.2,
                ease: [
                  0.22,
                  1,
                  0.36,
                  1,
                ],
              }}
            />
          )}
        </svg>

        {/* =================================================
            CENTER CONTENT
        ================================================= */}

        <div
          className="
            absolute
            inset-0
            flex
            flex-col
            items-center
            justify-center
            text-center
          "
        >
          {/* =================================================
              FUTURISTIC MOON
          ================================================= */}

          <motion.div
            className={cn(
              'relative mb-4 grid place-items-center rounded-full',
              'border border-violet/20',
              'bg-surface/80',
              'backdrop-blur-md',
              'shadow-[0_0_40px_rgb(var(--violet)/.12)]',
              compact
                ? 'h-11 w-11'
                : 'h-14 w-14'
            )}
            animate={{
              y: [-2, 2, -2],
            }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {/* Glow */}

            <span
              className="
                absolute
                inset-0
                rounded-full
                bg-lime/10
                blur-md
              "
            />

            {/* Moon */}

            <div
              className={cn(
                'relative rounded-full bg-lime',
                'shadow-[0_0_22px_rgb(var(--lime)/.55)]',
                compact
                  ? 'h-4 w-4'
                  : 'h-5 w-5'
              )}
            >
              <div
                className="
                  absolute
                  -right-1.5
                  -top-1
                  h-4
                  w-4
                  rounded-full
                  bg-bg
                "
              />
            </div>
          </motion.div>

          {/* Countdown */}

          <motion.span
            className={cn(
              'font-display font-extrabold tracking-[-0.05em]',
              compact
                ? 'text-3xl'
                : 'text-[46px]'
            )}
            initial={{
              opacity: 0,
              y: 8,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.5,
            }}
          >
            {headline}
          </motion.span>

          {/* Subtitle */}

          <motion.span
            className="mt-1 text-xs text-muted"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            transition={{
              duration: 0.5,
              delay: 0.1,
            }}
          >
            {sub}
          </motion.span>
        </div>
      </div>

      {/* =====================================================
          FOOT INFORMATION
      ===================================================== */}

      {!compact && (
        <div className="mt-2 flex items-center gap-2 text-[11px] text-muted">
          <motion.span
            className="h-1 w-1 rounded-full bg-lime"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.6, 1, 0.6],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          />

          Late-night delivery

          <span className="text-line">
            •
          </span>

          10–15 min
        </div>
      )}
    </div>
  );
}