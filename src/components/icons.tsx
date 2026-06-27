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
