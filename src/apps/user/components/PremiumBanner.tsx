import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  AnimatePresence,
  motion,
  type PanInfo,
} from 'framer-motion';

import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Zap,
} from 'lucide-react';

import {
  useNavigate,
} from 'react-router-dom';

import {
  PackShot,
  Skeleton,
  toneVar,
} from '@/shared/ui';

import type {
  Banner,
  Product,
} from '@/shared/types';

import { cn } from '@/shared/lib/cn';


type PremiumBannerProps = {
  banners: Banner[];
  products: Product[];
  loading: boolean;
};


/* =========================================================
   EYEBROW
========================================================= */

function getEyebrow(
  banner: Banner
) {
  const text =
    `${banner.title} ${banner.subtitle}`.toLowerCase();

  if (
    text.includes('maggi') ||
    text.includes('noodle')
  ) {
    return 'LATE NIGHT MAGGI';
  }

  if (
    text.includes('exam') ||
    text.includes('energy')
  ) {
    return 'NIGHT FUEL';
  }

  if (
    text.includes('20%') ||
    text.includes('off')
  ) {
    return 'TONIGHT ONLY';
  }

  if (
    text.includes('sweet') ||
    text.includes('chocolate') ||
    text.includes('silk')
  ) {
    return 'SWEET TOOTH';
  }

  return 'NIGHT OWL SPECIAL';
}


/* =========================================================
   FIND PRODUCT
========================================================= */

function findBannerProduct(
  banner: Banner,
  products: Product[]
) {
  const text =
    `${banner.title} ${banner.subtitle}`.toLowerCase();

  let keywords: string[] = [];

  if (
    text.includes('maggi') ||
    text.includes('noodle')
  ) {
    keywords = [
      'maggi',
      'noodle',
    ];
  }

  else if (
    text.includes('exam') ||
    text.includes('energy')
  ) {
    keywords = [
      'red bull',
      'energy',
      'monster',
    ];
  }

  else if (
    text.includes('sweet') ||
    text.includes('chocolate') ||
    text.includes('silk') ||
    text.includes('cake')
  ) {
    keywords = [
      'dairy milk silk',
      'chocolate',
      'cake',
      'lava',
      'kitkat',
    ];
  }

  if (
    keywords.length === 0
  ) {
    return undefined;
  }

  return products.find(
    (product) => {
      const productText =
        `${product.name} ${product.brand}`.toLowerCase();

      return keywords.some(
        (keyword) =>
          productText.includes(
            keyword
          )
      );
    }
  );
}


/* =========================================================
   BACKGROUND
========================================================= */

function getBannerStyle(
  banner: Banner
) {
  const tone =
    toneVar[banner.tone];

  return {
    background: `
      radial-gradient(
        circle at 82% 45%,
        rgb(${tone} / 0.18),
        transparent 34%
      ),
      radial-gradient(
        circle at 12% 100%,
        rgb(${tone} / 0.10),
        transparent 38%
      ),
      linear-gradient(
        115deg,
        rgb(var(--surface) / 0.98),
        rgb(var(--bg) / 0.98)
      )
    `,
  };
}


/* =========================================================
   PRODUCT VISUAL
========================================================= */

function BannerProduct({
  product,
}: {
  product?: Product;
}) {

  if (!product) {
    return (
      <div
        className="
          relative
          flex
          h-full
          w-full
          items-center
          justify-center
        "
      >

        <div
          className="
            absolute
            h-[190px]
            w-[190px]
            rounded-full
            bg-lime/10
            blur-3xl
            md:h-[250px]
            md:w-[250px]
          "
        />

        <motion.div
          initial={{
            opacity: 0,
            scale: 0.8,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          transition={{
            duration: 0.6,
          }}
          className="
            relative
            z-10
            flex
            h-[180px]
            w-[180px]
            items-center
            justify-center
            rounded-full
            border
            border-lime/20
            bg-lime/[0.04]
            md:h-[220px]
            md:w-[220px]
          "
        >

          <span
            className="
              font-display
              text-[58px]
              font-extrabold
              tracking-[-0.08em]
              text-lime
              md:text-[70px]
            "
          >
            20%
          </span>

          <Zap
            className="
              absolute
              right-[18%]
              top-[18%]
              h-5
              w-5
              rotate-12
              fill-lime
              text-lime
            "
          />

        </motion.div>

      </div>
    );
  }


  return (
    <div
      className="
        relative
        flex
        h-full
        w-full
        items-center
        justify-center
      "
    >

      {/* Product glow */}

      <div
        className="
          absolute
          h-[190px]
          w-[190px]
          rounded-full
          bg-violet/10
          blur-3xl
          md:h-[260px]
          md:w-[260px]
        "
      />


      {/* Ground shadow */}

      <div
        className="
          absolute
          bottom-[15%]
          left-1/2
          h-6
          w-36
          -translate-x-1/2
          rounded-full
          bg-black/40
          blur-2xl
          md:w-52
        "
      />


      {/* Product */}

      <motion.div
        initial={{
          opacity: 0,
          scale: 0.8,
          y: 15,
          rotate: -5,
        }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
          rotate: 0,
        }}
        transition={{
          duration: 0.65,
          type: 'spring',
          stiffness: 110,
          damping: 16,
        }}
        className="
          relative
          z-10
          h-[175px]
          w-[175px]
          md:h-[230px]
          md:w-[230px]
        "
      >

        <PackShot
          product={product}
          className="
            drop-shadow-[0_30px_25px_rgb(0_0_0/.45)]
          "
        />

      </motion.div>


      {/* One subtle floating light */}

      <motion.span
        animate={{
          y: [-3, -9, -3],
          opacity: [
            0.25,
            0.7,
            0.25,
          ],
        }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="
          absolute
          right-[16%]
          top-[20%]
          h-1.5
          w-1.5
          rounded-full
          bg-violet
          shadow-[0_0_12px_rgb(var(--violet)/.7)]
        "
      />

    </div>
  );
}


/* =========================================================
   PREMIUM BANNER
========================================================= */

export function PremiumBanner({
  banners,
  products,
  loading,
}: PremiumBannerProps) {

  const [
    index,
    setIndex,
  ] = useState(0);

  const [
    direction,
    setDirection,
  ] = useState(1);

  const [
    paused,
    setPaused,
  ] = useState(false);

  const navigate =
    useNavigate();

  const wheelLock =
    useRef(false);

  const total =
    banners.length;


  /* =======================================================
     PRODUCT MAP
  ======================================================= */

  const productMap =
    useMemo(() => {

      const map =
        new Map<
          string,
          Product | undefined
        >();

      for (
        const banner of banners
      ) {

        map.set(
          banner.id,
          findBannerProduct(
            banner,
            products
          )
        );

      }

      return map;

    }, [
      banners,
      products,
    ]);


  /* =======================================================
     KEEP INDEX VALID
  ======================================================= */

  useEffect(() => {

    if (
      total === 0
    ) {
      return;
    }

    if (
      index >= total
    ) {
      setIndex(0);
    }

  }, [
    index,
    total,
  ]);


  /* =======================================================
     NAVIGATION
  ======================================================= */

  const goTo = (
    target: number,
    forcedDirection?: number
  ) => {

    if (
      total < 2
    ) {
      return;
    }

    let next =
      target;

    if (
      next < 0
    ) {
      next =
        total - 1;
    }

    if (
      next >= total
    ) {
      next = 0;
    }

    setDirection(
      forcedDirection ??
        (
          next > index
            ? 1
            : -1
        )
    );

    setIndex(next);
  };


  /* =======================================================
     AUTO CHANGE
  ======================================================= */

  useEffect(() => {

    if (
      total < 2 ||
      paused
    ) {
      return;
    }

    const timer =
      window.setInterval(
        () => {

          setDirection(1);

          setIndex(
            (current) =>
              (
                current + 1
              ) % total
          );

        },
        4500
      );

    return () =>
      window.clearInterval(
        timer
      );

  }, [
    total,
    paused,
  ]);


  /* =======================================================
     WHEEL
  ======================================================= */

  const handleWheel = (
    event: React.WheelEvent<HTMLDivElement>
  ) => {

    if (
      total < 2 ||
      wheelLock.current
    ) {
      return;
    }

    const delta =
      Math.abs(
        event.deltaY
      ) >
      Math.abs(
        event.deltaX
      )
        ? event.deltaY
        : event.deltaX;

    if (
      Math.abs(delta) < 30
    ) {
      return;
    }

    event.preventDefault();

    wheelLock.current =
      true;

    if (
      delta > 0
    ) {

      goTo(
        index + 1,
        1
      );

    } else {

      goTo(
        index - 1,
        -1
      );

    }

    window.setTimeout(
      () => {
        wheelLock.current =
          false;
      },
      600
    );
  };


  /* =======================================================
     TOUCH SWIPE
  ======================================================= */

  const handleDragEnd = (
    _event: unknown,
    info: PanInfo
  ) => {

    if (
      Math.abs(
        info.offset.x
      ) < 45
    ) {
      return;
    }

    if (
      info.offset.x < 0
    ) {

      goTo(
        index + 1,
        1
      );

    } else {

      goTo(
        index - 1,
        -1
      );

    }
  };


  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {

    return (
      <Skeleton
        className="
          h-[300px]
          w-full
          rounded-[26px]
          md:h-[350px]
        "
      />
    );

  }


  /* =======================================================
     EMPTY
  ======================================================= */

  if (
    total === 0
  ) {
    return null;
  }


  const banner =
    banners[
      Math.min(
        index,
        total - 1
      )
    ]!;


  const product =
    productMap.get(
      banner.id
    );


  const slideNumber =
    String(
      index + 1
    ).padStart(
      2,
      '0'
    );


  const totalNumber =
    String(
      total
    ).padStart(
      2,
      '0'
    );


  return (
    <section
      aria-roledescription="carousel"
      aria-label="NightOwl offers"
      onMouseEnter={() =>
        setPaused(true)
      }
      onMouseLeave={() =>
        setPaused(false)
      }
      onFocus={() =>
        setPaused(true)
      }
      onBlur={() =>
        setPaused(false)
      }
      onWheel={handleWheel}
      className="relative"
    >

      {/* ===================================================
          MAIN BANNER
      =================================================== */}

      <div
        className="
          relative
          h-[300px]
          overflow-hidden
          rounded-[26px]
          border
          border-line/60
          shadow-[0_25px_70px_-40px_rgb(0_0_0/.85)]
          md:h-[350px]
        "
        style={getBannerStyle(
          banner
        )}
      >

        {/* =================================================
            TOP LIGHT
        ================================================= */}

        <div
          className="
            pointer-events-none
            absolute
            inset-x-[8%]
            top-0
            h-px
            bg-gradient-to-r
            from-transparent
            via-violet/50
            to-transparent
          "
        />


        {/* =================================================
            SLIDE CONTENT
        ================================================= */}

        <AnimatePresence
          initial={false}
          mode="popLayout"
          custom={direction}
        >

          <motion.div
            key={banner.id}
            custom={direction}
            initial={{
              opacity: 0,
              x:
                direction > 0
                  ? '7%'
                  : '-7%',
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            exit={{
              opacity: 0,
              x:
                direction > 0
                  ? '-7%'
                  : '7%',
            }}
            transition={{
              duration: 0.55,
              ease: [
                0.22,
                1,
                0.36,
                1,
              ],
            }}
            className="
              absolute
              inset-0
            "
          >

            {/* =============================================
                TEXT
            ============================================= */}

            <div
              className="
                absolute
                left-6
                top-14
                z-20
                w-[58%]
                max-w-[560px]
                md:left-[7%]
                md:top-[62px]
                md:w-[52%]
              "
            >

              {/* Eyebrow */}

              <motion.p
                initial={{
                  opacity: 0,
                  y: 8,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.4,
                  delay: 0.05,
                }}
                className="
                  text-[9px]
                  font-semibold
                  uppercase
                  tracking-[0.36em]
                  text-violet
                  md:text-[10px]
                "
              >
                {getEyebrow(
                  banner
                )}
              </motion.p>


              {/* Title */}

              <motion.h2
                initial={{
                  opacity: 0,
                  y: 15,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.45,
                  delay: 0.08,
                }}
                className="
                  mt-3
                  max-w-[520px]
                  font-display
                  text-[38px]
                  font-extrabold
                  uppercase
                  leading-[0.9]
                  tracking-[-0.055em]
                  xs:text-[43px]
                  md:text-[57px]
                  lg:text-[62px]
                "
              >

                {banner.title
                  .split(' ')
                  .map(
                    (
                      word,
                      wordIndex
                    ) => (

                      <span
                        key={`${word}-${wordIndex}`}
                        className={
                          wordIndex ===
                          banner.title.split(
                            ' '
                          ).length -
                            1
                            ? 'block text-violet'
                            : ''
                        }
                      >
                        {word}{' '}
                      </span>

                    )
                  )}

              </motion.h2>


              {/* Description */}

              <motion.p
                initial={{
                  opacity: 0,
                  y: 10,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.4,
                  delay: 0.15,
                }}
                className="
                  mt-4
                  max-w-[430px]
                  text-[12.5px]
                  leading-5
                  text-muted
                  md:text-[14px]
                  md:leading-6
                "
              >
                {banner.subtitle}
              </motion.p>


              {/* CTA */}

              <motion.div
                initial={{
                  opacity: 0,
                  y: 10,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.4,
                  delay: 0.22,
                }}
                className="mt-5"
              >

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      banner.link
                    )
                  }
                  className="
                    group
                    inline-flex
                    h-10
                    items-center
                    gap-2
                    rounded-full
                    bg-fg
                    px-4
                    text-[12px]
                    font-bold
                    text-bg
                    shadow-[0_10px_30px_rgb(0_0_0/.25)]
                    transition-all
                    duration-300
                    hover:-translate-y-0.5
                    hover:shadow-[0_14px_36px_rgb(0_0_0/.32)]
                    md:h-11
                    md:px-5
                    md:text-[13px]
                  "
                >

                  {banner.cta}

                  <ArrowUpRight
                    className="
                      h-4
                      w-4
                      transition-transform
                      duration-300
                      group-hover:-translate-y-0.5
                      group-hover:translate-x-0.5
                    "
                  />

                </button>

              </motion.div>

            </div>


            {/* =============================================
                PRODUCT
            ============================================= */}

            <motion.div
              className="
                absolute
                right-0
                top-0
                h-full
                w-[45%]
                md:right-[4%]
                md:w-[42%]
              "
              drag="x"
              dragConstraints={{
                left: 0,
                right: 0,
              }}
              dragElastic={0.12}
              onDragEnd={
                handleDragEnd
              }
            >

              <BannerProduct
                product={product}
              />

            </motion.div>

          </motion.div>

        </AnimatePresence>


        {/* =================================================
            SLIDE NUMBER

            Deliberately very subtle.
        ================================================= */}

        <div
          className="
            absolute
            right-5
            top-5
            z-30
            font-mono
            text-[10px]
            tracking-[0.16em]
            text-muted/70
            md:right-8
            md:top-7
          "
        >

          <span className="text-fg">
            {slideNumber}
          </span>

          <span className="mx-1">
            /
          </span>

          {totalNumber}

        </div>


        {/* =================================================
            MINIMAL PROGRESS
        ================================================= */}

        {total > 1 && (

          <div
            className="
              absolute
              bottom-5
              left-[31%]
              right-[7%]
              z-30
              md:left-[30%]
            "
          >

            <div
              className="
                flex
                items-center
                gap-2
              "
            >

              {banners.map(
                (
                  item,
                  itemIndex
                ) => {

                  const active =
                    itemIndex ===
                    index;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        goTo(
                          itemIndex,
                          itemIndex >
                            index
                            ? 1
                            : -1
                        )
                      }
                      aria-label={`Show ${item.title}`}
                      aria-current={
                        active
                          ? 'true'
                          : undefined
                      }
                      className="
                        group
                        min-w-0
                        flex-1
                      "
                    >

                      <div
                        className="
                          relative
                          h-[2px]
                          overflow-hidden
                          rounded-full
                          bg-line/60
                        "
                      >

                        {active && (

                          <motion.div
                            key={`${banner.id}-progress`}
                            initial={{
                              scaleX: 0,
                            }}
                            animate={{
                              scaleX: paused
                                ? undefined
                                : 1,
                            }}
                            transition={{
                              duration: paused
                                ? 0
                                : 4.5,
                              ease: 'linear',
                            }}
                            className="
                              absolute
                              inset-0
                              origin-left
                              rounded-full
                              bg-violet
                            "
                          />

                        )}

                      </div>


                      <span
                        className={cn(
                          `
                            mt-2
                            hidden
                            truncate
                            text-left
                            text-[8px]
                            uppercase
                            tracking-[0.14em]
                            sm:block
                          `,
                          active
                            ? 'text-fg'
                            : 'text-muted/35'
                        )}
                      >
                        {getEyebrow(
                          item
                        )}
                      </span>

                    </button>
                  );

                }
              )}

            </div>


            {/* Small arrows */}

            <div
              className="
                mt-2
                flex
                justify-end
                gap-1
              "
            >

              <button
                type="button"
                onClick={() =>
                  goTo(
                    index - 1,
                    -1
                  )
                }
                aria-label="Previous offer"
                className="
                  grid
                  h-7
                  w-7
                  place-items-center
                  rounded-full
                  border
                  border-line
                  text-muted
                  transition-colors
                  hover:border-violet/50
                  hover:text-fg
                "
              >

                <ArrowLeft
                  className="
                    h-3
                    w-3
                  "
                />

              </button>


              <button
                type="button"
                onClick={() =>
                  goTo(
                    index + 1,
                    1
                  )
                }
                aria-label="Next offer"
                className="
                  grid
                  h-7
                  w-7
                  place-items-center
                  rounded-full
                  border
                  border-line
                  text-muted
                  transition-colors
                  hover:border-violet/50
                  hover:text-fg
                "
              >

                <ArrowRight
                  className="
                    h-3
                    w-3
                  "
                />

              </button>

            </div>

          </div>

        )}

      </div>

    </section>
  );
}