import { motion } from 'framer-motion';
import {
  Bell,
  Home,
  Moon,
  Package,
  Search,
  ShoppingBag,
  Sun,
  User,
  Utensils,
} from 'lucide-react';
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import {
  IconButton,
  Logo,
} from '@/shared/ui';

import { useTheme } from '@/shared/store/theme';
import { cn } from '@/shared/lib/cn';

import { useUi } from '../store/ui';
import {
  useCart,
  cartCount,
} from '../store/cart';

import { useUnread } from './NotificationBridge';


/* =========================================================
   NAVIGATION TABS
========================================================= */

const TABS = [
  {
    to: '/',
    label: 'Home',
    icon: Home,
    end: true,
  },
  {
    to: '/search',
    label: 'Search',
    icon: Search,
  },
  {
    to: '/orders',
    label: 'Orders',
    icon: Package,
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: User,
  },
];


/* =========================================================
   MOBILE BOTTOM NAV
   Existing functionality preserved
========================================================= */

export function BottomNav() {
  const { pathname } = useLocation();

  const active =
    TABS.find((t) =>
      t.end
        ? pathname === t.to
        : pathname.startsWith(t.to)
    )?.to;

  if (pathname.startsWith('/cart')) {
    return null;
  }

  return (
    <nav
      aria-label="Main"
      className="
        glass
        safe-bottom
        fixed
        inset-x-0
        bottom-0
        z-40
        border-t
        border-line/60
        md:hidden
      "
    >
      <ul className="grid grid-cols-4">

        {TABS.map((t) => {

          const on =
            active === t.to;

          return (
            <li key={t.to}>

              <Link
                to={t.to}
                aria-current={
                  on
                    ? 'page'
                    : undefined
                }
                className="
                  relative
                  flex
                  h-[62px]
                  flex-col
                  items-center
                  justify-center
                  gap-0.5
                "
              >

                {on && (
                  <motion.span
                    layoutId="bottom-pill"
                    className="
                      absolute
                      top-1.5
                      h-8
                      w-14
                      rounded-full
                      bg-violet/20
                    "
                    transition={{
                      type: 'spring',
                      stiffness: 500,
                      damping: 36,
                    }}
                  />
                )}

                <t.icon
                  className={cn(
                    `
                      relative
                      h-[22px]
                      w-[22px]
                      transition-colors
                    `,
                    on
                      ? 'text-violet'
                      : 'text-muted'
                  )}
                  strokeWidth={
                    on
                      ? 2.4
                      : 2
                  }
                />

                <span
                  className={cn(
                    `
                      relative
                      text-[11px]
                      font-semibold
                    `,
                    on
                      ? 'text-fg'
                      : 'text-muted'
                  )}
                >
                  {t.label}
                </span>

              </Link>

            </li>
          );
        })}

      </ul>
    </nav>
  );
}


/* =========================================================
   THEME BUTTON
========================================================= */

export function ThemeButton() {

  const {
    theme,
    toggle,
  } = useTheme();

  return (
    <IconButton
      label={
        theme === 'dark'
          ? 'Switch to light mode'
          : 'Switch to dark mode'
      }
      onClick={toggle}
    >

      <motion.span
        key={theme}
        initial={{
          rotate: -90,
          opacity: 0,
          scale: 0.7,
        }}
        animate={{
          rotate: 0,
          opacity: 1,
          scale: 1,
        }}
        transition={{
          type: 'spring',
          stiffness: 320,
          damping: 20,
        }}
        className="inline-flex"
      >

        {theme === 'dark' ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}

      </motion.span>

    </IconButton>
  );
}


/* =========================================================
   NOTIFICATION BUTTON
========================================================= */

export function BellButton() {

  const unread =
    useUnread();

  const nav =
    useNavigate();

  return (
    <div className="relative">

      <IconButton
        label="Notifications"
        badge={unread}
        onClick={() =>
          nav('/notifications')
        }
      >

        <motion.span
          whileHover={{
            rotate: [-5, 5, -3, 0],
          }}
          transition={{
            duration: 0.35,
          }}
          className="relative inline-flex"
        >

          <Bell className="h-5 w-5" />

          {unread > 0 && (
            <motion.span
              initial={{
                scale: 0,
              }}
              animate={{
                scale: 1,
              }}
              className="
                absolute
                -right-0.5
                -top-0.5
                h-1.5
                w-1.5
                rounded-full
                bg-pink
                shadow-[0_0_8px_rgba(236,72,153,0.8)]
              "
            />
          )}

        </motion.span>

      </IconButton>

    </div>
  );
}


/* =========================================================
   PREMIUM SEARCH BAR
========================================================= */

function SearchBar() {

  return (
    <Link
      to="/search"
      className="
        group
        relative
        flex
        h-[44px]
        min-w-0
        flex-1
        items-center
        overflow-hidden
        rounded-[15px]
        border
        border-line/60
        bg-surface2/45
        px-3.5
        transition-all
        duration-300
        hover:border-violet/30
        hover:bg-surface2/65
        hover:shadow-[0_0_28px_rgba(139,92,246,0.07)]
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-violet/30
      "
    >

      {/* =================================================
          AMBIENT LIGHT
      ================================================= */}

      <span
        aria-hidden
        className="
          pointer-events-none
          absolute
          -left-8
          top-1/2
          h-16
          w-16
          -translate-y-1/2
          rounded-full
          bg-violet/10
          blur-2xl
          transition-all
          duration-500
          group-hover:bg-violet/20
        "
      />


      {/* =================================================
          SEARCH ICON
      ================================================= */}

      <motion.span
        whileHover={{
          scale: 1.08,
        }}
        className="
          relative
          z-10
          mr-2.5
          inline-flex
          shrink-0
        "
      >

        <Search
          className="
            h-[17px]
            w-[17px]
            text-muted
            transition-colors
            duration-300
            group-hover:text-violet
          "
        />

      </motion.span>


      {/* =================================================
          PLACEHOLDER
      ================================================= */}

      <span
        className="
          relative
          z-10
          min-w-0
          flex-1
          truncate
          text-[14px]
          font-medium
          text-muted
          transition-colors
          duration-300
          group-hover:text-fg/80
        "
      >
        Search Maggi, chips, Red Bull…
      </span>


      {/* =================================================
          MIDNIGHT FOOD INDICATOR
      ================================================= */}

      <span
        className="
          relative
          z-10
          hidden
          shrink-0
          items-center
          gap-1.5
          rounded-full
          border
          border-line/50
          bg-bg/30
          px-2.5
          py-1
          text-[9px]
          font-bold
          uppercase
          tracking-[0.12em]
          text-muted/70
          transition-all
          duration-300
          group-hover:border-violet/20
          group-hover:text-violet/80
          lg:flex
        "
      >

        <Utensils
          className="
            h-3
            w-3
          "
        />

        Midnight

      </span>


      {/* =================================================
          ENTER INDICATOR
      ================================================= */}

      <span
        className="
          relative
          z-10
          ml-2
          hidden
          h-6
          min-w-6
          items-center
          justify-center
          rounded-md
          border
          border-line/50
          bg-bg/30
          px-1.5
          text-[9px]
          font-bold
          text-muted/60
          transition-all
          duration-300
          group-hover:border-violet/20
          group-hover:text-violet
          sm:flex
        "
      >
        ↵
      </span>

    </Link>
  );
}


/* =========================================================
   DESKTOP NAVIGATION LINK
========================================================= */

function DesktopNavLink({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          `
            group
            relative
            flex
            h-9
            items-center
            rounded-xl
            px-3
            text-[13px]
            font-semibold
            transition-all
            duration-200
          `,
          isActive
            ? `
              bg-surface2
              text-fg
            `
            : `
              text-muted
              hover:bg-surface2/60
              hover:text-fg
            `
        )
      }
    >

      {({ isActive }) => (
        <>
          {children}

          {/* Active indicator */}

          <span
            className={cn(
              `
                absolute
                bottom-0.5
                left-1/2
                h-[2px]
                -translate-x-1/2
                rounded-full
                bg-violet
                transition-all
                duration-300
              `,
              isActive
                ? 'w-4 opacity-100'
                : 'w-0 opacity-0'
            )}
          />
        </>
      )}

    </NavLink>
  );
}


/* =========================================================
   CART
========================================================= */

function CartButton({
  count,
  pulse,
}: {
  count: number;
  pulse: number;
}) {

  return (
    <Link
      to="/cart"
      className="
        group
        relative
        ml-1
        inline-flex
        h-11
        shrink-0
        items-center
        gap-2
        overflow-hidden
        rounded-[14px]
        bg-accent
        px-4
        font-bold
        text-onaccent
        shadow-[0_6px_20px_rgba(163,230,53,0.10)]
        transition-all
        duration-300
        hover:-translate-y-[1px]
        hover:shadow-[0_10px_28px_rgba(163,230,53,0.20)]
        active:translate-y-0
      "
      aria-label={`Cart, ${count} items`}
    >

      {/* =================================================
          MOVING SHINE
      ================================================= */}

      <span
        aria-hidden
        className="
          pointer-events-none
          absolute
          -left-10
          top-[-20%]
          h-[140%]
          w-8
          rotate-[20deg]
          bg-white/25
          blur-sm
          transition-transform
          duration-700
          group-hover:translate-x-[150px]
        "
      />


      {/* =================================================
          CART ICON
      ================================================= */}

      <motion.span
        key={pulse}
        data-cart-target
        animate={
          pulse
            ? {
                scale: [
                  1,
                  1.22,
                  0.96,
                  1,
                ],
                rotate: [
                  0,
                  -5,
                  5,
                  0,
                ],
              }
            : undefined
        }
        transition={{
          duration: 0.45,
        }}
        className="
          relative
          inline-flex
        "
      >

        <ShoppingBag
          className="
            h-[19px]
            w-[19px]
          "
          strokeWidth={2.2}
        />

      </motion.span>


      {/* =================================================
          CART LABEL / COUNT
      ================================================= */}

      {count > 0 ? (

        <span
          className="
            relative
            flex
            items-center
            gap-1.5
          "
        >

          <span
            className="
              text-[13px]
            "
          >
            Cart
          </span>

          <motion.span
            key={count}
            initial={{
              scale: 0.7,
              opacity: 0,
            }}
            animate={{
              scale: 1,
              opacity: 1,
            }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 18,
            }}
            className="
              grid
              h-[21px]
              min-w-[21px]
              place-items-center
              rounded-full
              bg-onaccent/15
              px-1
              text-[10px]
              font-extrabold
            "
          >
            {count > 99
              ? '99+'
              : count}
          </motion.span>

        </span>

      ) : (

        <span
          className="
            relative
            text-[13px]
          "
        >
          Cart
        </span>

      )}

    </Link>
  );
}


/* =========================================================
   TOP NAVIGATION
========================================================= */

export function TopNav() {

  const count =
    useCart((s) =>
      cartCount(s.lines)
    );

  const pulse =
    useUi((s) =>
      s.cartPulse
    );


  return (
    <header
      className="
        glass
        sticky
        top-0
        z-30
        hidden
        border-b
        border-line/60
        bg-bg/75
        backdrop-blur-xl
        md:block
      "
    >

      {/* =================================================
          AMBIENT TOP GLOW
      ================================================= */}

      <div
        aria-hidden
        className="
          pointer-events-none
          absolute
          inset-x-0
          bottom-[-1px]
          h-px
          overflow-hidden
        "
      >

        <motion.div
          animate={{
            x: [
              '-40%',
              '40%',
              '-40%',
            ],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="
            h-px
            w-[180%]
            bg-gradient-to-r
            from-transparent
            via-violet/50
            to-transparent
          "
        />

      </div>


      {/* =================================================
          HEADER CONTENT
      ================================================= */}

      <div
        className="
          mx-auto
          flex
          h-16
          max-w-6xl
          items-center
          gap-5
          px-6
        "
      >

        {/* =================================================
            LOGO
        ================================================= */}

        <Link
          to="/"
          aria-label="Home"
          className="
            group
            relative
            shrink-0
          "
        >

          {/* subtle aura */}

          <motion.span
            aria-hidden
            animate={{
              opacity: [
                0.05,
                0.12,
                0.05,
              ],
              scale: [
                0.95,
                1.05,
                0.95,
              ],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="
              pointer-events-none
              absolute
              -inset-3
              rounded-full
              bg-violet/20
              blur-xl
            "
          />


          <motion.span
            whileHover={{
              y: -1,
              scale: 1.025,
            }}
            transition={{
              type: 'spring',
              stiffness: 350,
              damping: 20,
            }}
            className="
              relative
              block
            "
          >

            <Logo />

          </motion.span>

        </Link>


        {/* =================================================
            SEARCH
        ================================================= */}

        <SearchBar />


        {/* =================================================
            DESKTOP LINKS
        ================================================= */}

        <nav
          aria-label="Main"
          className="
            hidden
            items-center
            gap-0.5
            lg:flex
          "
        >

          <DesktopNavLink
            to="/orders"
          >
            Orders
          </DesktopNavLink>


          <DesktopNavLink
            to="/profile"
          >
            Profile
          </DesktopNavLink>

        </nav>


        {/* =================================================
            ACTIONS
        ================================================= */}

        <div
          className="
            flex
            shrink-0
            items-center
            gap-0.5
          "
        >

          <BellButton />

          <ThemeButton />

          <CartButton
            count={count}
            pulse={pulse}
          />

        </div>

      </div>

    </header>
  );
}