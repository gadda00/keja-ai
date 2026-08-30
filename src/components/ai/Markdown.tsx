/**
 * Minimal markdown renderer for Keja AI responses:
 * supports **bold**, `inline code`, bullets (• / - / numbers), tables (| a | b |), and line breaks.
 */
import { Fragment } from 'react';

function renderInline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={`${keyPrefix}-b${i}`} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={`${keyPrefix}-c${i}`}
          className="rounded bg-gold-50 px-1.5 py-0.5 font-mono text-[0.85em] text-gold-800 ring-1 ring-gold-100"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={`${keyPrefix}-t${i}`}>{part}</Fragment>;
  });
}

export default function Markdown({ content }: { content: string }) {
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let tableRows: string[][] = [];

  const flushTable = (key: string) => {
    if (tableRows.length) {
      const [header, , ...rows] = tableRows;
      blocks.push(
        <div key={key} className="my-3 overflow-x-auto rounded-xl border border-gold-100">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gold-50">
                {header.map((h, i) => (
                  <th key={i} className="px-3 py-2 text-left font-semibold text-ink">
                    {renderInline(h, `${key}-h${i}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-t border-gold-100">
                  {r.map((c, ci) => (
                    <td key={ci} className="px-3 py-2 text-ink-soft">
                      {renderInline(c, `${key}-c${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      tableRows.push(
        trimmed
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim())
      );
      return;
    }
    flushTable(`tbl-${idx}`);

    if (!trimmed) return;

    if (/^[•\-*]\s/.test(trimmed)) {
      blocks.push(
        <p key={idx} className="flex gap-2 py-0.5 pl-1 text-sm leading-relaxed">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
          <span>{renderInline(trimmed.replace(/^[•\-*]\s/, ''), `l${idx}`)}</span>
        </p>
      );
    } else if (/^\d+[.)]\s/.test(trimmed)) {
      const num = trimmed.match(/^(\d+)[.)]\s/)?.[1];
      blocks.push(
        <p key={idx} className="flex gap-2.5 py-0.5 pl-1 text-sm leading-relaxed">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-100 text-[10px] font-bold text-gold-700">
            {num}
          </span>
          <span>{renderInline(trimmed.replace(/^\d+[.)]\s/, ''), `l${idx}`)}</span>
        </p>
      );
    } else if (/^⚠️|^✅|^📊|^📝|^🪜|^⚖️|^📜|^💳|^🛡️|^🏠|^🏡/.test(trimmed)) {
      blocks.push(
        <p key={idx} className="py-0.5 text-sm font-semibold leading-relaxed">
          {renderInline(trimmed, `l${idx}`)}
        </p>
      );
    } else {
      blocks.push(
        <p key={idx} className="py-0.5 text-sm leading-relaxed">
          {renderInline(trimmed, `l${idx}`)}
        </p>
      );
    }
  });
  flushTable('tbl-final');

  return <div className="space-y-0.5">{blocks}</div>;
}
