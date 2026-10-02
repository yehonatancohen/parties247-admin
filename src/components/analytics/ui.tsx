"use client";
import React from 'react';

export type Ink = 'sales' | 'click' | 'view';

export const INK_BG: Record<Ink, string> = {
  sales: 'bg-ink-sales',
  click: 'bg-ink-click',
  view: 'bg-ink-view',
};

export const INK_TEXT: Record<Ink, string> = {
  sales: 'text-ink-sales',
  click: 'text-ink-click',
  view: 'text-ink-view',
};

// Hex twins of the tailwind ink tokens, for places that need inline colour (SVG, mixes).
export const INK_HEX: Record<Ink, string> = {
  sales: '#FFD23F',
  click: '#FF6A3D',
  view: '#8E9BFF',
};

export const InkKey: React.FC<{ ink: Ink }> = ({ ink }) => (
  <span aria-hidden className={`inline-block w-2.5 h-2.5 ${INK_BG[ink]} shrink-0`} />
);

type SegOption<T extends string> = { value: T; label: string };

// Equal-width segmented control. `tone="ink"` fills the active segment with sun-yellow
// (period pickers); `tone="paper"` fills it with cream (view switches).
export function Segmented<T extends string>({
  options, value, onChange, tone = 'ink', label, className = '', size = 'md',
}: {
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  tone?: 'ink' | 'paper';
  label: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const active = tone === 'ink' ? 'bg-ink-sales text-jungle-deep' : 'bg-jungle-text text-jungle-deep';
  const h = size === 'md' ? 'h-12 text-[15px]' : 'h-10 text-sm';
  return (
    <div role="group" aria-label={label} className={`grid border border-wood-brown ${className}`} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o, i) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`${h} px-2 font-medium whitespace-nowrap transition-colors ${i > 0 ? 'border-r border-wood-brown' : ''} ${value === o.value ? active : 'text-ink-dim hover:text-white hover:bg-white/5'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const Panel: React.FC<{ title: string; note?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, note, actions, children, className = '' }) => (
  <section className={`bg-jungle-surface border border-wood-brown p-4 sm:p-5 ${className}`}>
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h3 className="text-lg font-bold text-white leading-tight">{title}</h3>
        {note && <p className="text-[13px] text-ink-dim mt-1 leading-snug">{note}</p>}
      </div>
      {actions}
    </div>
    {children}
  </section>
);

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-ink-cell animate-pulse ${className}`} aria-hidden />
);

export const GhostButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', ...props }) => (
  <button
    type="button"
    {...props}
    className={`h-10 px-3 text-sm font-medium border border-wood-brown text-jungle-text hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap transition-colors ${className}`}
  />
);
