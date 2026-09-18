import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useScroll,
  useTransform,
  type PanInfo,
} from 'framer-motion';
import {
  ArrowRight,
  ChevronRight,
  MapPin,
  Search,
  Timer,
  Zap,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import {
  useBanners,
  useUserOrders,
} from '@/shared/hooks/live';

import {
  useStoreStatus,
} from '@/shared/hooks/misc';

import {
  NightDial,
  Reveal,
  RevealItem,
  Skeleton,
  Logo,
  toneVar,
} from '@/shared/ui';

import { cn } from '@/shared/lib/cn';
import { HOUR } from '@/shared/lib/time';
import { APP } from '@/shared/config/app';

import type { Banner } from '@/shared/types';

import {
  useCatalog,
  useCurrentUser,
} from '../hooks';

import { ProductRail } from '../components/ProductLists';

import {
  BellButton,
  ThemeButton,
} from '../components/Nav';

import { addressLine } from '../components/AddressForm';


/* =========================================================
   GREETING
========================================================= */

function greeting(now: number) {
  const h = new Date(now).getHours();

  if (h >= 21 || h < 1) {
    return 'Midnight munchies?';
  }

  if (h >= 1 && h < 5) {
    return 'Still up, night owl?';
  }

  if (h < 17) {
    return 'Tonight’s stash, sorted.';
  }

  return 'Doors open soon.';
}


/* =========================================================
   BANNER CAROUSEL
========================================================= */

function BannerCarousel({
  banners,
  loading,
}: {
  banners: Banner[];
  loading: boolean;
}) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  const nav = useNavigate();

  const n = banners.length;


  useEffect(() => {
    if (n < 2 || paused) return;

    const timer = setInterval(() => {
      setI((x) => (x + 1) % n);
    }, 4500);

    return () => clearInterval(timer);
  }, [n, paused]);


  useEffect(() => {
    if (i >= n) {
      setI(0);
    }
  }, [i, n]);


  if (loading) {
    return (
      <Skeleton
        className="
          h-[148px]
          rounded-card
        "
      />
    );
  }


  if (!n) {
    return null;
  }


  const b =
    banners[Math.min(i, n - 1)]!;


  const onDragEnd = (
    _event: unknown,
    info: PanInfo
  ) => {
    if (info.offset.x < -50) {
      setI((x) => (x + 1) % n);
    } else if (info.offset.x > 50) {
      setI((x) => (x - 1 + n) % n);
    }
  };


  return (
    <section
      aria-roledescription="carousel"
      aria-label="Offers"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >

      <div
        className="
          relative
          h-[148px]
          overflow-hidden
          rounded-card
        "
      >

        <AnimatePresence
          initial={false}
          mode="popLayout"
        >

          <motion.button
            key={b.id}
            type="button"
            onClick={() => nav(b.link)}
            drag="x"
            dragConstraints={{
              left: 0,
              right: 0,
            }}
            dragElastic={0.25}
            onDragEnd={onDragEnd}
            initial={{
              x: '100%',
              opacity: 0.4,
            }}
            animate={{
              x: 0,
              opacity: 1,
            }}
            exit={{
              x: '-40%',
              opacity: 0,
            }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 32,
            }}
            className="
              absolute
              inset-0
              flex
              w-full
              items-center
              gap-4
              overflow-hidden
              rounded-card
              border
              border-line/60
              p-5
              text-left
            "
            style={{
              background: `
                linear-gradient(
                  120deg,
                  rgb(${toneVar[b.tone]} / .28),
                  rgb(${toneVar[b.tone]} / .06) 70%
                )
              `,
            }}
            aria-label={`${b.title}. ${b.subtitle}. ${b.cta}`}
          >

            <div
              className="
                relative
                z-10
                min-w-0
                flex-1
              "
            >

              <h3
                className="
                  font-display
                  text-[26px]
                  font-extrabold
                  leading-none
                "
              >
                {b.title}
              </h3>


              <p
                className="
                  mt-1.5
                  line-clamp-2
                  max-w-[28ch]
                  text-[13.5px]
                  text-fg/75
                "
              >
                {b.subtitle}
              </p>


              <span
                className="
                  mt-3
                  inline-flex
                  items-center
                  gap-1
                  rounded-full
                  bg-fg
                  px-3
                  py-1.5
                  text-[13px]
                  font-bold
                  text-bg
                "
              >
                {b.cta}

                <ArrowRight
                  className="
                    h-3.5
                    w-3.5
                  "
                />
              </span>

            </div>


            <motion.span
              aria-hidden
              initial={{
                scale: 0.6,
                rotate: -20,
              }}
              animate={{
                scale: 1,
                rotate: 0,
              }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 12,
                delay: 0.1,
              }}
              className="
                pointer-events-none
                -mr-2
                select-none
                text-[88px]
                leading-none
                drop-shadow-2xl
              "
            >
              {b.emoji}
            </motion.span>

          </motion.button>

        </AnimatePresence>

      </div>


      {n > 1 && (
        <div
          className="
            mt-2.5
            flex
            justify-center
            gap-1.5
          "
          role="tablist"
          aria-label="Choose offer"
        >

          {banners.map((x, k) => (
            <button
              key={x.id}
              role="tab"
              aria-selected={k === i}
              aria-label={`Offer ${k + 1}: ${x.title}`}
              onClick={() => setI(k)}
              className="
                grid
                h-6
                place-items-center
                px-0.5
              "
            >

              <motion.span
                animate={{
                  width: k === i ? 22 : 6,
                }}
                className={cn(
                  'block h-1.5 rounded-full',
                  k === i
                    ? 'bg-fg'
                    : 'bg-line'
                )}
              />

            </button>
          ))}

        </div>
      )}

    </section>
  );
}


/* =========================================================
   HOME
========================================================= */

export default function Home() {

  const {
    products,
    categories,
    loading,
    byId,
  } = useCatalog();


  const {
    status,
    settings,
    now,
  } = useStoreStatus(15_000);


  const [
    banners,
    bLoading,
  ] = useBanners();


  const {
    userId,
    customer,
  } = useCurrentUser();


  const [orders] =
    useUserOrders(userId);


  /* =======================================================
     HERO SCROLL ANIMATION
  ======================================================= */

  const hero =
    useRef<HTMLDivElement>(null);


  const {
    scrollYProgress,
  } = useScroll({
    target: hero,
    offset: [
      'start start',
      'end start',
    ],
  });


  const dialY =
    useTransform(
      scrollYProgress,
      [0, 1],
      [0, 70]
    );


  const dialOpacity =
    useTransform(
      scrollYProgress,
      [0, 0.8],
      [1, 0]
    );


  const textY =
    useTransform(
      scrollYProgress,
      [0, 1],
      [0, 30]
    );


  /* =======================================================
     CUSTOMER
  ======================================================= */

  const address =
    customer?.addresses.find(
      (a) =>
        a.id ===
        customer.defaultAddressId
    ) ??
    customer?.addresses[0];


  const firstName =
    customer?.name.split(' ')[0];


  /* =======================================================
     PRODUCT RAIL DATA
  ======================================================= */

  const rails = useMemo(() => {

    const inStock =
      products.filter(
        (p) =>
          p.stock > 0
      );


    const trending =
      [...inStock]
        .filter(
          (p) =>
            p.categoryId !==
            'combos'
        )
        .sort(
          (a, b) =>
            b.popularity -
            a.popularity
        )
        .slice(0, 12);


    const combos =
      products.filter(
        (p) =>
          p.categoryId ===
          'combos'
      );


    const under50 =
      inStock
        .filter(
          (p) =>
            p.price < 50
        )
        .sort(
          (a, b) =>
            b.popularity -
            a.popularity
        )
        .slice(0, 14);


    const fresh =
      [...products]
        .sort(
          (a, b) =>
            b.createdAt -
            a.createdAt
        )
        .filter(
          (p) =>
            p.createdAt >
            now -
              14 *
                24 *
                HOUR
        )
        .slice(0, 10);


    const seen =
      new Set<string>();


    const again =
      orders
        .filter(
          (o) =>
            o.status ===
            'delivered'
        )
        .sort(
          (a, b) =>
            b.createdAt -
            a.createdAt
        )
        .flatMap(
          (o) =>
            o.items.map(
              (i) =>
                i.productId
            )
        )
        .filter(
          (id) =>
            seen.has(id)
              ? false
              : (
                  seen.add(id),
                  true
                )
        )
        .map(
          (id) =>
            byId.get(id)
        )
        .filter(
          (
            p
          ): p is NonNullable<
            typeof p
          > =>
            !!p &&
            p.active
        )
        .slice(0, 12);


    return {
      trending,
      combos,
      under50,
      fresh,
      again,
    };

  }, [
    products,
    orders,
    byId,
    now,
  ]);


  return (
    <main
      id="main"
      className="
        relative
        mx-auto
        w-full
        max-w-6xl

        pb-[118px]

        md:px-6
        md:pb-24
      "
    >


      {/* ===================================================
          MOBILE LOCATION / ACTION BAR
      =================================================== */}

      <div
        className="
          safe-top
          px-5
          pt-3.5

          md:hidden
        "
      >

        <div
          className="
            flex
            items-center
            gap-4
          "
        >

          {/* Delivery + location */}

          <Link
            to={
              customer
                ? '/profile/addresses'
                : '/login'
            }
            className="
              min-w-0
              flex-1
            "
          >

            {/* Delivery */}

            <div
              className="
                flex
                items-center
                gap-1.5
              "
            >

              <Zap
                className="
                  h-[17px]
                  w-[17px]
                  shrink-0
                  fill-current
                  text-lime
                "
              />

              <span
                className="
                  text-[11px]
                  font-extrabold
                  uppercase
                  tracking-[0.08em]
                  text-lime
                "
              >
                {settings.etaMin}–
                {settings.etaMax}
                {' '}MIN DELIVERY
              </span>

            </div>


            {/* Location */}

            <div
              className="
                mt-1.5
                flex
                min-w-0
                items-center
                gap-1.5
              "
            >

              <MapPin
                className="
                  h-[18px]
                  w-[18px]
                  shrink-0
                  text-muted
                "
              />

              <span
                className="
                  truncate
                  text-[15px]
                  font-bold
                  text-fg
                "
              >
                {
                  address
                    ? addressLine(
                        address,
                        settings.hostels
                      )
                    : 'Set your hostel room'
                }
              </span>

              <ChevronRight
                className="
                  h-[17px]
                  w-[17px]
                  shrink-0
                  text-muted
                "
              />

            </div>

          </Link>


          {/* Actions */}

          <div
            className="
              flex
              shrink-0
              items-center
              gap-3
            "
          >

            <BellButton />

            <ThemeButton />

          </div>

        </div>

      </div>


      {/* ===================================================
          HERO
      =================================================== */}

      <section
        ref={hero}
        className="
          relative
          px-5
          pt-7

          md:grid
          md:grid-cols-[1.1fr_1fr]
          md:items-center
          md:gap-10
          md:px-0
          md:pt-12
        "
      >

        <motion.div
          style={{
            y: textY,
          }}
        >

          {/* =================================================
              WELCOME
          ================================================= */}

          <div
            className="
              flex
              items-center
              gap-3
            "
          >

            <span
              className="
                flex
                h-[36px]
                w-[36px]
                shrink-0
                items-center
                justify-center
                rounded-[11px]
                border
                border-violet/15
                bg-violet/[0.08]
                shadow-[0_5px_22px_rgba(139,92,246,0.08)]
              "
            >

              <Logo
                size={20}
                withText={false}
              />

            </span>


            <p
              className="
                text-[13px]
                font-semibold
                text-muted
              "
            >

              {
                firstName
                  ? `Hey ${firstName},`
                  : `Welcome to ${APP.name},`
              }

            </p>

          </div>


          {/* =================================================
              HEADING
          ================================================= */}

          <h1
            className="
              mt-5
              max-w-[9.5ch]
              font-display
              text-[43px]
              font-extrabold
              leading-[0.92]
              tracking-[-0.055em]
              text-fg

              sm:text-[47px]

              md:mt-3
              md:max-w-none
              md:text-[80px]
            "
          >

            {greeting(now)}

          </h1>


          {/* =================================================
              DESCRIPTION
          ================================================= */}

          <p
            className="
              mt-5
              max-w-[38ch]
              text-[14px]
              leading-[1.65]
              text-muted

              sm:text-[15px]

              md:mt-4
              md:text-lg
            "
          >

            Maggi, chips, cold drinks
            and chocolate, packed and
            at your door{' '}

            <span
              className="
                font-semibold
                text-fg
              "
            >
              in {settings.etaMin}–
              {settings.etaMax}
              {' '}minutes
            </span>

            . Open{' '}

            <span
              className="
                font-semibold
                text-fg
              "
            >
              9 PM to 2 AM
            </span>

            .

          </p>


          {/* =================================================
              MOBILE SEARCH
          ================================================= */}

          <Link
            to="/search"
            className="
              group
              mt-6
              flex
              h-[54px]
              w-full
              items-center
              gap-3.5
              rounded-[17px]
              border
              border-line/70
              bg-surface/70
              px-4
              shadow-[0_10px_30px_rgba(0,0,0,0.12)]
              backdrop-blur-xl

              transition-all
              duration-300

              active:scale-[0.985]

              hover:border-violet/50

              md:hidden
            "
          >

            <Search
              className="
                h-[20px]
                w-[20px]
                shrink-0
                text-violet
                transition-transform
                duration-300
                group-hover:scale-110
              "
            />

            <span
              className="
                truncate
                text-[14px]
                font-medium
                text-muted
              "
            >
              Search “maggi”, “red bull”…
            </span>

          </Link>


          {/* =================================================
              MOBILE TRUST DETAILS
          ================================================= */}

          <div
            className="
              mt-4
              flex
              items-center
              gap-2.5
              overflow-hidden
              whitespace-nowrap
              text-[9px]
              font-semibold
              uppercase
              tracking-[0.08em]
              text-muted/70

              md:hidden
            "
          >

            <span
              className="
                flex
                items-center
                gap-1.5
              "
            >

              <span
                className="
                  h-1.5
                  w-1.5
                  rounded-full
                  bg-lime
                  shadow-[0_0_7px_rgba(163,230,53,0.7)]
                "
              />

              Fast delivery

            </span>


            <span
              className="
                h-3
                w-px
                shrink-0
                bg-line
              "
            />


            <span>
              Pay via UPI
            </span>


            <span
              className="
                h-3
                w-px
                shrink-0
                bg-line
              "
            />


            <span>
              9 PM–2 AM
            </span>

          </div>


          {/* =================================================
              DESKTOP META
          ================================================= */}

          <div
            className="
              mt-4
              hidden
              flex-wrap
              gap-2
              md:flex
            "
          >

            <span
              className="
                chip
                border-lime/40
                text-lime
              "
            >

              <Timer
                className="
                  h-4
                  w-4
                "
              />

              {settings.etaMin}–
              {settings.etaMax}
              {' '}min

            </span>


            {address && (
              <span className="chip">

                <MapPin
                  className="
                    h-4
                    w-4
                    text-muted
                  "
                />

                {
                  addressLine(
                    address,
                    settings.hostels
                  )
                }

              </span>
            )}


            <span className="chip">
              Pay via UPI
            </span>

          </div>

        </motion.div>


        {/* ===================================================
            NIGHT DIAL
        =================================================== */}

        <motion.div
          style={{
            y: dialY,
            opacity: dialOpacity,
          }}
          className="
            relative
            mt-7
            w-full

            md:mt-0
            md:max-w-[480px]
          "
        >

          <div
            className="
              relative
              mx-auto
              w-full
              max-w-[350px]
              overflow-hidden
              rounded-[26px]
              border
              border-line/60
              bg-surface/60
              shadow-soft

              md:max-w-[480px]
              md:overflow-visible
              md:rounded-[32px]
              md:p-4
              md:pb-5
            "
          >

            {/* Mobile dial crop */}

            <div
              className="
                relative
                h-[300px]
                w-full
                overflow-hidden

                md:h-auto
                md:overflow-visible
              "
            >

              <div
                className="
                  absolute
                  left-1/2
                  top-0
                  w-[138%]
                  -translate-x-1/2
                  origin-top
                  scale-[0.72]

                  md:static
                  md:w-auto
                  md:translate-x-0
                  md:scale-100
                "
              >

                <NightDial
                  status={status}
                  now={now}
                />

              </div>

            </div>

          </div>

        </motion.div>

      </section>


      {/* ===================================================
          BANNER
      =================================================== */}

      <div
        className="
          mt-7
          px-4

          md:mt-8
          md:px-0
        "
      >

        <BannerCarousel
          banners={banners.filter(
            (b) => b.active
          )}
          loading={bLoading}
        />

      </div>


      {/* ===================================================
          CATEGORIES
      =================================================== */}

      <section
        className="
          mt-8
          px-4

          md:mt-9
          md:px-0
        "
        aria-label="Categories"
      >

        <h2
          className="
            mb-3
            text-[20px]
            font-extrabold

            md:text-[22px]
          "
        >
          What are you craving?
        </h2>


        {loading ? (

          <div
            className="
              grid
              grid-cols-4
              gap-2

              md:grid-cols-8
              md:gap-2.5
            "
          >

            {Array.from(
              { length: 8 },
              (_, i) => (
                <Skeleton
                  key={i}
                  className="
                    aspect-[4/5]
                    rounded-card
                  "
                />
              )
            )}

          </div>

        ) : (

          <Reveal
            className="
              grid
              grid-cols-4
              gap-2

              md:grid-cols-8
              md:gap-2.5
            "
          >

            {categories.map(
              (c) => (
                <RevealItem
                  key={c.id}
                >

                  <Link
                    to={`/c/${c.id}`}
                    className="
                      group
                      flex
                      aspect-[4/5]
                      flex-col
                      items-center
                      justify-center
                      gap-1.5
                      rounded-card
                      border
                      border-line/50
                      text-center
                      transition-transform
                      active:scale-95
                    "
                    style={{
                      background:
                        `linear-gradient(
                          170deg,
                          rgb(${toneVar[c.tone]} / .2),
                          rgb(${toneVar[c.tone]} / .04)
                        )`,
                    }}
                  >

                    <span
                      className="
                        text-[31px]
                        leading-none
                        transition-transform
                        duration-300
                        group-hover:-translate-y-1
                        group-hover:scale-110

                        md:text-[42px]
                      "
                      aria-hidden
                    >
                      {c.emoji}
                    </span>


                    <span
                      className="
                        px-1
                        text-[11px]
                        font-semibold
                        leading-tight

                        md:text-sm
                      "
                    >
                      {c.name}
                    </span>

                  </Link>

                </RevealItem>
              )
            )}

          </Reveal>

        )}

      </section>


      {/* ===================================================
          PRODUCT RAILS
      =================================================== */}

      <ProductRail
        title="Buy again"
        note="Your usual, one tap away"
        products={rails.again}
      />


      <ProductRail
        title="Trending tonight 🔥"
        note="What your hostel is ordering"
        products={rails.trending}
        loading={loading}
        href="/search?sort=popular"
      />


      <ProductRail
        title="Midnight combos"
        note="Bundled, and cheaper than buying separately"
        products={rails.combos}
        loading={loading}
        href="/c/combos"
      />


      <ProductRail
        title="Under ₹50"
        note="Broke-student approved"
        products={rails.under50}
        loading={loading}
        href="/search?max=50"
      />


      <ProductRail
        title="New arrivals"
        note="Just landed on the shelf"
        products={rails.fresh}
        loading={loading}
        href="/search?sort=new"
      />


      {/* ===================================================
          PREMIUM ENDING
      =================================================== */}

      <section
        className="
          relative
          mt-16
          overflow-hidden
          px-4
          pb-8

          md:mt-24
          md:px-0
        "
      >

        {/* Ambient glow */}

        <div
          aria-hidden
          className="
            pointer-events-none
            absolute
            left-1/2
            top-0
            h-[320px]
            w-[320px]
            -translate-x-1/2
            -translate-y-1/3
            rounded-full
            bg-violet/[0.05]
            blur-[90px]

            md:h-[420px]
            md:w-[420px]
          "
        />


        {/* Animated divider */}

        <div
          className="
            relative
            mx-auto
            mb-12
            h-px
            max-w-5xl
            overflow-hidden
            bg-line/50

            md:mb-16
          "
        >

          <motion.div
            animate={{
              x: [
                '-100%',
                '100%',
              ],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="
              absolute
              inset-y-0
              left-0
              w-1/3
              bg-gradient-to-r
              from-transparent
              via-violet
              to-transparent
            "
          />

        </div>


        {/* Orbit */}

        <div
          aria-hidden
          className="
            pointer-events-none
            absolute
            left-1/2
            top-[82px]
            h-[190px]
            w-[190px]
            -translate-x-1/2
            rounded-full
            border
            border-violet/[0.07]

            md:top-[92px]
            md:h-[250px]
            md:w-[250px]
          "
        >

          <motion.div
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="
              absolute
              inset-0
            "
          >

            <span
              className="
                absolute
                left-1/2
                top-[-3px]
                h-1.5
                w-1.5
                -translate-x-1/2
                rounded-full
                bg-lime
                shadow-[0_0_12px_rgba(163,230,53,0.8)]
              "
            />

          </motion.div>

        </div>


        {/* Center */}

        <div
          className="
            relative
            z-10
            mx-auto
            flex
            max-w-2xl
            flex-col
            items-center
            text-center
          "
        >

          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
            }}
            transition={{
              duration: 0.6,
            }}
            className="
              flex
              items-center
              gap-2
            "
          >

            <span
              className="
                h-1.5
                w-1.5
                rounded-full
                bg-lime
              "
            />

            <span
              className="
                text-[8px]
                font-bold
                uppercase
                tracking-[0.28em]
                text-muted
              "
            >
              NIGHTOWL
            </span>

            <span
              className="
                h-1.5
                w-1.5
                rounded-full
                bg-violet
              "
            />

          </motion.div>


          <motion.div
            initial={{
              opacity: 0,
              scale: 0.9,
            }}
            whileInView={{
              opacity: 1,
              scale: 1,
            }}
            viewport={{
              once: true,
            }}
            transition={{
              duration: 0.7,
              type: 'spring',
              stiffness: 120,
              damping: 18,
            }}
            className="
              mt-4
            "
          >

            <motion.div
              animate={{
                y: [
                  0,
                  -4,
                  0,
                ],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >

              <Logo
                size={40}
                withText
              />

            </motion.div>

          </motion.div>


          <motion.h2
            initial={{
              opacity: 0,
              y: 15,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
            }}
            transition={{
              duration: 0.65,
              delay: 0.12,
            }}
            className="
              mt-4
              font-display
              text-[30px]
              font-extrabold
              leading-[0.95]
              tracking-[-0.045em]

              sm:text-[38px]
            "
          >

            Your midnight stash,

            <br />

            <span
              className="
                bg-gradient-to-r
                from-violet
                via-fg
                to-lime
                bg-clip-text
                text-transparent
              "
            >
              sorted.
            </span>

          </motion.h2>


          <motion.p
            initial={{
              opacity: 0,
            }}
            whileInView={{
              opacity: 1,
            }}
            viewport={{
              once: true,
            }}
            transition={{
              duration: 0.6,
              delay: 0.2,
            }}
            className="
              mt-3
              max-w-[34ch]
              text-[12px]
              leading-5
              text-muted
            "
          >

            From the first midnight craving
            to the last-minute study snack.

            <br />

            We’re here when the hostel
            lights go out.

          </motion.p>


          {/* Status */}

          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
            }}
            transition={{
              duration: 0.6,
              delay: 0.3,
            }}
            className="
              mt-5
              flex
              items-center
              gap-2.5
              rounded-full
              border
              border-line/60
              bg-surface/50
              px-3.5
              py-2
              backdrop-blur-md
            "
          >

            <span
              className="
                relative
                flex
                h-2
                w-2
              "
            >

              <span
                className="
                  absolute
                  inset-0
                  animate-ping
                  rounded-full
                  bg-lime/50
                "
              />

              <span
                className="
                  relative
                  h-2
                  w-2
                  rounded-full
                  bg-lime
                "
              />

            </span>


            <span
              className="
                text-[9px]
                font-bold
                uppercase
                tracking-[0.12em]
              "
            >
              Open tonight
            </span>


            <span
              className="
                h-3
                w-px
                bg-line
              "
            />


            <span
              className="
                text-[9px]
                text-muted
              "
            >
              9 PM – 2 AM
            </span>

          </motion.div>


          {/* CTA */}

          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
            }}
            transition={{
              duration: 0.6,
              delay: 0.38,
            }}
            className="
              mt-4
            "
          >

            <Link
              to="/search"
              className="
                group
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-violet/30
                bg-violet/10
                px-4
                py-2
                text-[11px]
                font-bold
                transition-all
                duration-300
                hover:-translate-y-0.5
                hover:border-violet/60
                hover:bg-violet/15
              "
            >

              Browse the stash

              <ArrowRight
                className="
                  h-3
                  w-3
                  transition-transform
                  duration-300
                  group-hover:translate-x-1
                "
              />

            </Link>

          </motion.div>

        </div>


        {/* Footer */}

        <motion.footer
          initial={{
            opacity: 0,
          }}
          whileInView={{
            opacity: 1,
          }}
          viewport={{
            once: true,
          }}
          transition={{
            duration: 0.8,
            delay: 0.25,
          }}
          className="
            relative
            z-10
            mx-auto
            mt-14
            max-w-5xl
            border-t
            border-line/50
            pt-6

            md:mt-20
            md:pt-7
          "
        >

          <div
            className="
              flex
              flex-col
              items-center
              justify-between
              gap-4
              text-center

              md:flex-row
              md:text-left
            "
          >

            <div>

              <div
                className="
                  flex
                  items-center
                  justify-center

                  md:justify-start
                "
              >

                <Logo
                  size={25}
                  withText
                />

              </div>


              <p
                className="
                  mt-1.5
                  text-[9px]
                  text-muted
                "
              >
                Packaged snacks · Pay via UPI
              </p>

            </div>


            <nav
              aria-label="Footer"
              className="
                flex
                items-center
                gap-4
                text-[10px]
                font-semibold
                text-muted
              "
            >

              <Link
                to="/help"
                className="
                  transition-colors
                  hover:text-fg
                "
              >
                Help & FAQ
              </Link>


              <Link
                to="/legal/terms"
                className="
                  transition-colors
                  hover:text-fg
                "
              >
                Terms
              </Link>


              <Link
                to="/legal/privacy"
                className="
                  transition-colors
                  hover:text-fg
                "
              >
                Privacy
              </Link>

            </nav>

          </div>


          <div
            className="
              mt-5
              flex
              flex-col
              items-center
              justify-between
              gap-1.5
              border-t
              border-line/30
              pt-3
              text-[8px]
              uppercase
              tracking-[0.12em]
              text-muted/60

              md:flex-row
            "
          >

            <span>
              Serving late-night hostels
            </span>


            <span>
              © 2026 NightOwl
            </span>

          </div>

        </motion.footer>

      </section>

    </main>
  );
}