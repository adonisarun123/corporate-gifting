"use client";

import { useState } from "react";
import { tileGradient } from "./visuals";

export function Gallery({ images, name, slug }: { images: Array<{ url: string; alt: string }>; name: string; slug: string }) {
  const [i, setI] = useState(0);
  const current = images[i];
  return (
    <div>
      <div className="card overflow-hidden bg-surface-2">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={current.url} src={current.url} alt={current.alt || name} width={1200} height={900} className="aspect-[4/3] w-full object-cover" fetchPriority={i === 0 ? "high" : undefined} />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center text-white/80" style={{ background: tileGradient(slug) }}>
            <span className="rounded-full border border-white/30 px-3 py-1 text-sm">Product photography to follow</span>
          </div>
        )}
      </div>
      {images.length > 1 && (
        <ul className="mt-3 grid grid-cols-5 gap-2" aria-label="Gallery thumbnails">
          {images.map((g, idx) => (
            <li key={g.url}>
              <button type="button" onClick={() => setI(idx)} aria-pressed={idx === i} aria-label={`Show image ${idx + 1}: ${g.alt}`} className={`card block w-full overflow-hidden transition-colors ${idx === i ? "border-brand ring-2 ring-brand/30" : "hover:border-border-strong"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.url} alt="" width={300} height={225} loading="lazy" className="aspect-[4/3] w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
