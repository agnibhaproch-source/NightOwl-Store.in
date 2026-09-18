import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import type { Category } from '@/shared/types';
import { cn } from '@/shared/lib/cn';

type MidnightPicksProps = {
  categories: Category[];
};

type Mood = {
  title: string;
  description: string;
};


/* =========================================================
   CATEGORY PERSONALITY
========================================================= */

const moodCopy: Record<string, Mood> = {
  noodles: {
    title: 'QUICK FIX',
    description: '2 AM emergency',
  },

  chips: {
    title: 'CRUNCH TIME',
    description: 'Movie? Sorted.',
  },

  biscuits: {
    title: 'STUDY MODE',
    description: 'One more chapter.',
  },

  cakes: {
    title: 'SWEET ATTACK',
    description: 'You earned it.',
  },

  drinks: {
    title: 'CHILL MODE',
    description: 'Keep it cold.',
  },

  'cold-drinks': {
    title: 'CHILL MODE',
    description: 'Keep it cold.',
  },

  pasta: {
    title: 'MIDNIGHT MEAL',
    description: 'Actually hungry?',
  },

  chocolates: {
    title: 'CHOCO FIX',
    description: 'Need it. Now.',
  },

  combos: {
    title: 'FULL SEND',
    description: 'More. For less.',
  },
};


/* =========================================================
   FALLBACK MOODS
========================================================= */

const fallbackMoods: Mood[] = [
  {
    title: 'LATE NIGHT',
    description: 'Something for now.',
  },
  {
    title: 'CRUNCH TIME',
    description: 'Movie? Sorted.',
  },
  {
    title: 'STUDY MODE',
    description: 'One more chapter.',
  },
  {
    title: 'SWEET ATTACK',
    description: 'You earned it.',
  },
  {
    title: 'CHILL MODE',
    description: 'Keep it cold.',
  },
  {
    title: 'MIDNIGHT MEAL',
    description: 'Actually hungry?',
  },
  {
    title: 'CHOCO FIX',
    description: 'Need it. Now.',
  },
  {
    title: 'FULL SEND',
    description: 'More. For less.',
  },
];


/* =========================================================
   ACCENT COLORS
========================================================= */

const accentClasses = [
  'group-hover:text-violet',
  'group-hover:text-cyan',
  'group-hover:text-lime',
  'group-hover:text-pink',
  'group-hover:text-cyan',
  'group-hover:text-amber',
  'group-hover:text-violet',
  'group-hover:text-lime',
];


/* =========================================================
   HELPERS
========================================================= */

function normalizeCategoryName(
  name: string
) {
  return name
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/\s+/g, '-');
}


function getMood(
  category: Category,
  index: number
): Mood {
  const normalized =
    normalizeCategoryName(
      category.name
    );

  const compact =
    category.name
      .toLowerCase()
      .trim();

  return (
    moodCopy[normalized] ??
    moodCopy[compact] ??
    fallbackMoods[
      index %
        fallbackMoods.length
    ]
  );
}


/* =========================================================
   CATEGORY ITEM
========================================================= */

function MoodItem({
  category,
  index,
}: {
  category: Category;
  index: number;
}) {
  const mood =
    getMood(
      category,
      index
    );

  const accent =
    accentClasses[
      index %
        accentClasses.length
    ];

  return (
    <Link
      to={`/c/${category.id}`}
      aria-label={`Open ${category.name}`}
      className="
        group
        relative
        flex
        min-w-[158px]
        flex-1
        overflow-hidden
        rounded-[16px]
        border
        border-line/40
        bg-surface/[0.24]
        px-4
        py-3.5
        transition-all
        duration-300
        ease-out
        hover:-translate-y-[2px]
        hover:border-line/80
        hover:bg-surface/[0.52]
        hover:shadow-[0_14px_40px_rgb(0_0_0/.20)]
        active:scale-[0.985]
        sm:min-w-[175px]
        md:min-w-0
      "
    >

      {/* ---------------------------------------------------
          Ambient hover glow
      --------------------------------------------------- */}

      <span
        aria-hidden
        className="
          pointer-events-none
          absolute
          -right-8
          -top-10
          h-24
          w-24
          rounded-full
          bg-violet/10
          opacity-0
          blur-2xl
          transition-opacity
          duration-500
          group-hover:opacity-100
        "
      />


      {/* ---------------------------------------------------
          Top row
      --------------------------------------------------- */}

      <div
        className="
          relative
          flex
          items-start
          justify-between
        "
      >

        <motion.span
          aria-hidden
          whileHover={{
            y: -3,
            rotate: 3,
            scale: 1.08,
          }}
          transition={{
            type: 'spring',
            stiffness: 350,
            damping: 18,
          }}
          className="
            text-[25px]
            leading-none
            md:text-[27px]
          "
        >
          {category.emoji}
        </motion.span>


        {/* Arrow */}

        <span
          className="
            grid
            h-6
            w-6
            place-items-center
            rounded-full
            border
            border-line/50
            text-muted/70
            transition-all
            duration-300
            group-hover:border-violet/50
            group-hover:bg-violet/10
            group-hover:text-fg
          "
        >
          <ArrowUpRight
            className="
              h-3
              w-3
              transition-transform
              duration-300
              group-hover:-translate-y-0.5
              group-hover:translate-x-0.5
            "
          />
        </span>

      </div>


      {/* ---------------------------------------------------
          Text
      --------------------------------------------------- */}

      <div
        className="
          relative
          mt-4
        "
      >

        <p
          className={cn(
            `
              text-[10px]
              font-extrabold
              tracking-[0.11em]
              text-fg
              transition-colors
              duration-300
              sm:text-[11px]
            `,
            accent
          )}
        >
          {mood.title}
        </p>


        <p
          className="
            mt-1
            truncate
            text-[10px]
            leading-4
            text-muted/70
          "
        >
          {mood.description}
        </p>

      </div>


      {/* ---------------------------------------------------
          Bottom interaction line
      --------------------------------------------------- */}

      <span
        aria-hidden
        className="
          absolute
          bottom-0
          left-4
          right-4
          h-px
          origin-left
          scale-x-0
          bg-gradient-to-r
          from-violet
          to-transparent
          transition-transform
          duration-500
          group-hover:scale-x-100
        "
      />

    </Link>
  );
}


/* =========================================================
   MAIN COMPONENT
========================================================= */

export function MidnightPicks({
  categories,
}: MidnightPicksProps) {

  const visibleCategories =
    categories.filter(
      (category) =>
        category.active
    );


  if (
    visibleCategories.length === 0
  ) {
    return null;
  }


  return (
    <section
      aria-labelledby="midnight-picks-title"
      className="
        relative
        mt-10
        px-4
        md:px-0
      "
    >

      {/* ===================================================
          HEADER
      =================================================== */}

      <div
        className="
          flex
          items-end
          justify-between
          gap-4
        "
      >

        <div className="min-w-0">

          {/* Eyebrow */}

          <div
            className="
              flex
              items-center
              gap-2
            "
          >

            <span
              aria-hidden
              className="
                h-1.5
                w-1.5
                shrink-0
                rounded-full
                bg-lime
                shadow-[0_0_10px_rgb(var(--lime)/.65)]
              "
            />

            <span
              className="
                text-[9px]
                font-bold
                uppercase
                tracking-[0.28em]
                text-muted
              "
            >
              Midnight Picks
            </span>

          </div>


          {/* Heading */}

          <h2
            id="midnight-picks-title"
            className="
              mt-1.5
              font-display
              text-[23px]
              font-extrabold
              leading-tight
              tracking-[-0.035em]
              text-fg
              sm:text-[26px]
            "
          >
            What's the craving?
          </h2>

        </div>


        {/* =================================================
            STORE STATUS
        ================================================= */}

        <div
          className="
            hidden
            shrink-0
            items-center
            gap-2
            pb-1
            text-[9px]
            font-semibold
            uppercase
            tracking-[0.14em]
            text-muted
            sm:flex
          "
        >

          <span
            aria-hidden
            className="
              h-1.5
              w-1.5
              rounded-full
              bg-lime
              shadow-[0_0_8px_rgb(var(--lime)/.75)]
            "
          />

          <span>
            9 PM — 2 AM
          </span>

          <span
            aria-hidden
            className="text-muted/30"
          >
            ·
          </span>

          <span>
            Open
          </span>

        </div>

      </div>


      {/* ===================================================
          CATEGORY RAIL
      =================================================== */}

      <div
        className="
          no-scrollbar
          mt-4
          flex
          snap-x
          snap-mandatory
          gap-2.5
          overflow-x-auto
          overscroll-x-contain
          pb-2
          [scrollbar-width:none]
          [-ms-overflow-style:none]
          sm:gap-3
        "
      >

        {visibleCategories.map(
          (
            category,
            index
          ) => (

            <div
              key={category.id}
              className="
                snap-start
                md:flex-1
              "
            >

              <MoodItem
                category={category}
                index={index}
              />

            </div>

          )
        )}

      </div>


      {/* ===================================================
          BOTTOM GUIDE
      =================================================== */}

      <div
        className="
          mt-1
          flex
          items-center
        "
      >

        {/* Progress line */}

        <div
          className="
            relative
            h-px
            flex-1
            overflow-hidden
            bg-line/40
          "
        >

          <motion.span
            aria-hidden
            initial={{
              x: '-100%',
            }}
            animate={{
              x: '200%',
            }}
            transition={{
              duration: 3.8,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="
              absolute
              inset-y-0
              left-0
              w-1/3
              bg-gradient-to-r
              from-transparent
              via-violet/70
              to-transparent
            "
          />

        </div>


        {/* Explore */}

        <Link
          to="/search"
          className="
            group
            ml-4
            flex
            shrink-0
            items-center
            gap-1
            text-[9px]
            font-semibold
            uppercase
            tracking-[0.14em]
            text-muted
            transition-colors
            duration-200
            hover:text-fg
          "
        >

          Explore

          <ChevronRight
            className="
              h-3
              w-3
              transition-transform
              duration-300
              group-hover:translate-x-0.5
            "
          />

        </Link>

      </div>

    </section>
  );
}