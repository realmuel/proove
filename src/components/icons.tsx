/* Small inline icon set — stroked, currentColor, consistent 1.6 weight. */

type Props = { className?: string; size?: number };

function base(size = 20, className = "") {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };
}

export const PlusIcon = ({ className, size }: Props) => (
  <svg {...base(size, className)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const BackIcon = ({ className, size }: Props) => (
  <svg {...base(size, className)}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

export const EditIcon = ({ className, size }: Props) => (
  <svg {...base(size, className)}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

export const SearchIcon = ({ className, size }: Props) => (
  <svg {...base(size, className)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export const UploadIcon = ({ className, size }: Props) => (
  <svg {...base(size, className)}>
    <path d="M12 16V4m0 0L7 9m5-5 5 5" />
    <path d="M5 20h14" />
  </svg>
);

/* Stand-in shown when a recipe/meal image can't be loaded — a framed photo
   with a little sun-and-hills scene, in the app's stroked style. */
export const ImagePlaceholderIcon = ({ className, size }: Props) => (
  <svg {...base(size, className)}>
    <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
    <circle cx="8.5" cy="9.5" r="1.6" />
    <path d="M3 16.5 8 12l3.5 3.5L15 12l6 5.5" />
  </svg>
);

export const ClockIcon = ({ className, size }: Props) => (
  <svg {...base(size, className)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const CheckIcon = ({ className, size }: Props) => (
  <svg {...base(size, className)}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const DownloadIcon = ({ className, size }: Props) => (
  <svg {...base(size, className)}>
    <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
);

export const ImportIcon = ({ className, size }: Props) => (
  <svg {...base(size, className)}>
    <path d="M12 19V7m0 0-4 4m4-4 4 4" />
    <path d="M5 21h14" />
  </svg>
);

export const CalendarIcon = ({ className, size }: Props) => (
  <svg {...base(size, className)}>
    <rect x="3" y="4.5" width="18" height="16" rx="2" />
    <path d="M3 9h18M8 2.5v4M16 2.5v4" />
  </svg>
);

export const TimerIcon = ({ className, size }: Props) => (
  <svg {...base(size, className)}>
    <path d="M10 2h4" />
    <circle cx="12" cy="13" r="8" />
    <path d="M12 13V9" />
  </svg>
);

export const ChevronUpIcon = ({ className, size }: Props) => (
  <svg {...base(size, className)}>
    <path d="m6 14 6-6 6 6" />
  </svg>
);

export const ChevronDownIcon = ({ className, size }: Props) => (
  <svg {...base(size, className)}>
    <path d="m6 10 6 6 6-6" />
  </svg>
);

export const TrashIcon = ({ className, size }: Props) => (
  <svg {...base(size, className)}>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7" />
  </svg>
);

export const PlayIcon = ({ className, size }: Props) => (
  <svg {...base(size, className)}>
    <path d="M7 5v14l11-7-11-7Z" />
  </svg>
);

export const StopIcon = ({ className, size }: Props) => (
  <svg {...base(size, className)}>
    <rect x="6" y="6" width="12" height="12" rx="1.5" />
  </svg>
);

export const ResetIcon = ({ className, size }: Props) => (
  <svg {...base(size, className)}>
    <path d="M3 12a9 9 0 1 0 2.6-6.3" />
    <path d="M3 4v5h5" />
  </svg>
);
