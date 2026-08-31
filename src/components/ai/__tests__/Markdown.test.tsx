// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Markdown from '@/components/ai/Markdown';

/** The chat renderer must stay pure React nodes — no raw HTML sink. */
describe('Markdown (chat renderer)', () => {
  it('renders bold and inline code without HTML injection', () => {
    render(<Markdown content="**bold** and `code`" />);
    const bold = screen.getByText('bold');
    expect(bold.tagName).toBe('STRONG');
    expect(screen.getByText('code').tagName).toBe('CODE');
  });

  it('renders markdown table syntax as a real <table>', () => {
    const content = [
      '| Area | Median |',
      '| --- | --- |',
      '| Kilimani | 15.2M |',
      '| Nyali | 9.8M |',
    ].join('\n');
    const { container } = render(<Markdown content={content} />);
    const table = container.querySelector('table');
    expect(table).not.toBeNull();
    expect(table?.querySelectorAll('th')).toHaveLength(2);
    expect(table?.querySelectorAll('tbody tr')).toHaveLength(2);
  });

  it('renders bullet and numbered lines as styled paragraphs', () => {
    const content = '- first point\n1. step one';
    render(<Markdown content={content} />);
    expect(screen.getByText('first point')).toBeTruthy();
    expect(screen.getByText('step one')).toBeTruthy();
  });

  it('never renders raw HTML from the model output (XSS pin)', () => {
    const evil = '<img src=x onerror=alert(1)> **safe**';
    const { container } = render(<Markdown content={evil} />);
    // no real element is ever created from model markup…
    expect(container.querySelector('img')).toBeNull();
    expect(container.innerHTML).not.toMatch(/<img/);
    // …instead the markup is escaped into inert text
    expect(container.innerHTML).toContain('&lt;img');
    expect(screen.getByText(/<img src=x/)).toBeTruthy();
  });

  it('renders emoji-leading lines as emphasized paragraphs', () => {
    render(<Markdown content="✅ Verified: title check passed" />);
    expect(screen.getByText('✅ Verified: title check passed')).toBeTruthy();
  });
});
