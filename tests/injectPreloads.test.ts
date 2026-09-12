/**
 * inject-preloads.mjs — the boot-waterfall preload injector (2026-09-12).
 *
 * The SPA shell loads via next/dynamic, so the browser discovers the shell
 * chunks (zod + the KejaApp graph) only AFTER the entry scripts execute.
 * The build now injects <link rel="preload"> hints derived from the webpack
 * runtime's own chunk map. These tests pin the extraction maths against the
 * exact minified shapes webpack 5 / Next 16 emits (byte-verified against
 * the real runtime chunk, including the paren-wrapped `({...})[e]` map and
 * the named-base special case).
 */
import { describe, expect, it } from 'vitest';

import {
  buildPreloadLinks,
  parseChunkUrlMap,
  parseDynamicChunkIds,
  parseEntryScripts,
} from '../scripts/inject-preloads.mjs';

/* The exact shapes observed in out/_next/static/chunks/webpack-*.js (2026-09-12). */
const RUNTIME_FIXTURE = String.raw`
var s={};s.u=e=>6509===e?"static/chunks/6509-2b8ab353db82af4c.js":4831===e?"static/chunks/4831-8d8d8c9f639934fb.js":"static/chunks/"+(1761===e?"d0deef33":e)+"."+({213:"00a57d68090acd16",704:"cd946bd995865627",1759:"6e06c6564278047d",1761:"1e75a8cc68c34508",6786:"0a390a7e0c695732"})[e]+".js";
`;

const PAGE_FIXTURE = String.raw`
let l=n.n(a)()(()=>Promise.all([n.e(6509),n.e(6786),n.e(1759)]).then(n.bind(n,1759)),{loadableGenerated:{webpack:()=>[1759]},ssr:!1,loading:()=>(0,r.jsxs)("div",{})});
`;

const HTML_FIXTURE = `<!doctype html><html><head>
    <link rel="preload" href="/_next/static/media/font-s.p.woff2" as="font" type="font/woff2" crossorigin />
    <script src="/_next/static/chunks/webpack-52658bd0fba037e0.js" async=""></script>
    <script src="/_next/static/chunks/4bd1b696-8a4ab4fdf0ae305a.js"></script>
    <script src="/_next/static/chunks/app/page-6e3feb210a00d074.js"></script>
    <script src="/_next/static/chunks/polyfills-42372ed130431b0a.js" nomodule=""></script>
  </head><body></body></html>`;

describe('parseEntryScripts', () => {
  it('collects script srcs and excludes nomodule polyfills', () => {
    const scripts = parseEntryScripts(HTML_FIXTURE);
    const srcs = scripts.map((s: { src: string }) => s.src);
    expect(srcs).toHaveLength(3);
    expect(srcs[0]).toBe('/_next/static/chunks/webpack-52658bd0fba037e0.js');
    expect(srcs).not.toContain('/_next/static/chunks/polyfills-42372ed130431b0a.js');
  });

  it('also excludes the camelCase noModule form the real build emits', () => {
    // the actual Next 16 output uses noModule (camelCase), sometimes with
    // the attribute before src
    const html =
      '<script noModule="" src="/_next/static/chunks/polyfills-1.js"></script>' +
      '<script src="/_next/static/chunks/polyfills-2.js" noModule=""></script>' +
      '<script src="/_next/static/chunks/app/page-1.js"></script>';
    const srcs = parseEntryScripts(html).map((s: { src: string }) => s.src);
    expect(srcs).toEqual(['/_next/static/chunks/app/page-1.js']);
  });

  it('returns an empty list when there are no scripts', () => {
    expect(parseEntryScripts('<html><head></head></html>')).toEqual([]);
  });
});

describe('parseDynamicChunkIds', () => {
  it('extracts the unique chunk ids from .e() calls', () => {
    expect(parseDynamicChunkIds(PAGE_FIXTURE).sort()).toEqual(['1759', '6509', '6786']);
  });

  it('does not match lookalike member calls (.be(123), .ce(9))', () => {
    expect(parseDynamicChunkIds('t.be(123); x.ce(9); y.se(7)')).toEqual([]);
  });

  it('returns an empty list for plain module code', () => {
    expect(parseDynamicChunkIds('console.log("hello"); var a = 1;')).toEqual([]);
  });
});

describe('parseChunkUrlMap (webpack runtime shapes)', () => {
  it('resolves the two inline special cases', () => {
    const { resolve } = parseChunkUrlMap(RUNTIME_FIXTURE);
    expect(resolve('6509')).toBe('static/chunks/6509-2b8ab353db82af4c.js');
    expect(resolve('4831')).toBe('static/chunks/4831-8d8d8c9f639934fb.js');
  });

  it('resolves regular id.hash.js entries from the paren-wrapped map', () => {
    const { resolve } = parseChunkUrlMap(RUNTIME_FIXTURE);
    expect(resolve('1759')).toBe('static/chunks/1759.6e06c6564278047d.js');
    expect(resolve('6786')).toBe('static/chunks/6786.0a390a7e0c695732.js');
  });

  it('resolves the named-base special case (id 1761 → base d0deef33)', () => {
    const { resolve } = parseChunkUrlMap(RUNTIME_FIXTURE);
    expect(resolve('1761')).toBe('static/chunks/d0deef33.1e75a8cc68c34508.js');
  });

  it('returns undefined for ids outside the map instead of guessing', () => {
    const { resolve } = parseChunkUrlMap(RUNTIME_FIXTURE);
    expect(resolve('999999')).toBeUndefined();
  });

  it('handles the bare (non-paren-wrapped) map indexing form too', () => {
    const bare = String.raw`s.u=e=>"static/chunks/"+e+"."+({99:"abcdef0123456789"})[e]+".js";`;
    const { resolve } = parseChunkUrlMap(bare);
    expect(resolve('99')).toBe('static/chunks/99.abcdef0123456789.js');
  });
});

describe('buildPreloadLinks', () => {
  const { resolve } = parseChunkUrlMap(RUNTIME_FIXTURE);
  const entrySrcs = [
    '/_next/static/chunks/webpack-52658bd0fba037e0.js',
    '/_next/static/chunks/app/page-6e3feb210a00d074.js',
    // 6509 is also an entry <script> in the real build (shared chunk)
    '/_next/static/chunks/6509-2b8ab353db82af4c.js',
  ];

  it('preloads only dynamic chunks that are not already entry scripts', () => {
    const links = buildPreloadLinks(['1759', '6509', '6786'], resolve, entrySrcs);
    expect(links).toEqual([
      '<link rel="preload" as="script" href="/_next/static/chunks/1759.6e06c6564278047d.js" />',
      '<link rel="preload" as="script" href="/_next/static/chunks/6786.0a390a7e0c695732.js" />',
    ]);
  });

  it('skips ids the runtime cannot resolve', () => {
    const links = buildPreloadLinks(['424242'], resolve, entrySrcs);
    expect(links).toEqual([]);
  });

  it('is idempotent: already-preloaded hrefs are not emitted twice', () => {
    const existing = new Set(['/_next/static/chunks/1759.6e06c6564278047d.js']);
    const links = buildPreloadLinks(['1759', '6786'], resolve, entrySrcs, existing);
    expect(links).toEqual([
      '<link rel="preload" as="script" href="/_next/static/chunks/6786.0a390a7e0c695732.js" />',
    ]);
  });
});
