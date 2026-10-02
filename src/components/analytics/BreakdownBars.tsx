"use client";
import React from 'react';
import { BreakdownItem } from '../../data/types';
import { SOURCE_LABELS } from '../../lib/analytics';
import { Ink, INK_BG, Panel } from './ui';

const BreakdownBars: React.FC<{
  title: string;
  note?: string;
  items: BreakdownItem[];
  ink?: Ink;
  limit?: number;
  labels?: boolean;
}> = ({ title, note, items, ink = 'view', limit = 6, labels = true }) => {
  if (!items.length) return null;
  const top = items.slice(0, limit);
  const max = Math.max(...top.map(i => i.count), 1);
  return (
    <Panel title={title} note={note}>
      <ul className="space-y-3">
        {top.map(item => (
          <li key={item.label}>
            <div className="flex items-baseline justify-between gap-3 text-[15px]">
              <span className="text-jungle-text truncate">{labels ? (SOURCE_LABELS[item.label] || item.label) : item.label}</span>
              <span className="shrink-0 text-white font-bold">
                {item.count} <span className="text-ink-dim font-normal text-[13px]">· {item.percent}%</span>
              </span>
            </div>
            <div className="h-2.5 mt-1 bg-ink-cell">
              <div className={`h-full ${INK_BG[ink]}`} style={{ width: `${(item.count / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
};

export default BreakdownBars;
