/* Minimal inline icon set (stroke, currentColor). Decorative by default: pass aria-hidden unless labelled. */
type P = React.SVGProps<SVGSVGElement>;
const base = (props: P) => ({ width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, ...props });

export const IconSearch = (p: P) => (<svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>);
export const IconCart = (p: P) => (<svg {...base(p)}><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.5L21.5 8H6" /><circle cx="10" cy="20" r="1.4" /><circle cx="17" cy="20" r="1.4" /></svg>);
export const IconMenu = (p: P) => (<svg {...base(p)}><path d="M4 7h16M4 12h16M4 17h16" /></svg>);
export const IconClose = (p: P) => (<svg {...base(p)}><path d="m6 6 12 12M18 6 6 18" /></svg>);
export const IconArrow = (p: P) => (<svg {...base(p)}><path d="M5 12h14m-6-6 6 6-6 6" /></svg>);
export const IconChevron = (p: P) => (<svg {...base(p)}><path d="m6 9 6 6 6-6" /></svg>);
export const IconCheck = (p: P) => (<svg {...base(p)}><path d="m5 12 5 5L20 7" /></svg>);
export const IconShield = (p: P) => (<svg {...base(p)}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></svg>);
export const IconTruck = (p: P) => (<svg {...base(p)}><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="1.8" /><circle cx="17" cy="18" r="1.8" /></svg>);
export const IconTag = (p: P) => (<svg {...base(p)}><path d="M3 12V4h8l10 10-8 8L3 12Z" /><circle cx="8" cy="9" r="1.2" /></svg>);
export const IconBox = (p: P) => (<svg {...base(p)}><path d="m12 3 9 4.5v9L12 21l-9-4.5v-9L12 3Z" /><path d="M3 7.5 12 12l9-4.5M12 12v9" /></svg>);
export const IconDoc = (p: P) => (<svg {...base(p)}><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M10 13h6M10 17h6" /></svg>);
export const IconBrush = (p: P) => (<svg {...base(p)}><path d="m14 4 6 6-8 8-6-6 8-8Z" /><path d="M6 12 3 15c-1 1-1 3 0 4s3 1 4 0l3-3" /></svg>);
export const IconUsers = (p: P) => (<svg {...base(p)}><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.4" /><path d="M16 14.5c2.8 0 5 2.2 5 5" /></svg>);
export const IconClock = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></svg>);
export const IconSpark = (p: P) => (<svg {...base(p)}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></svg>);
export const IconGift = (p: P) => (<svg {...base(p)}><path d="M3 9h18v4H3zM5 13h14v8H5zM12 9v12" /><path d="M12 9c-2-4-6-4-6-1 0 1.5 2 1 6 1Zm0 0c2-4 6-4 6-1 0 1.5-2 1-6 1Z" /></svg>);
export const IconPin = (p: P) => (<svg {...base(p)}><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>);
export const IconPhone = (p: P) => (<svg {...base(p)}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" /></svg>);
export const IconMail = (p: P) => (<svg {...base(p)}><path d="M3 6h18v12H3z" /><path d="m3 7 9 6 9-6" /></svg>);
