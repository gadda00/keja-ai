#!/usr/bin/env python3
"""Generate all matplotlib charts for the Keja AI Technical Audit PDF.
Follows typesetting/charts.md: no top/right spines, dashed grid 20% opacity,
donut hole 65%, horizontal bars for long labels, legend without border.
Palette from palette.cascade (seed 42). English labels only.
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.font_manager as fm
fm.fontManager.addfont('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')
import matplotlib.pyplot as plt
import numpy as np
import os

plt.rcParams['font.sans-serif'] = ['DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False
plt.rcParams['font.size'] = 11

# Cascade palette (seed 42)
ACCENT   = '#1f6c92'
ACCENT2  = '#c23a50'
HEADER   = '#32454e'
ICON     = '#4b86a4'
BORDER   = '#acbdc5'
MUTED    = '#747b7e'
TEXTP    = '#131515'
STRIPE   = '#ebeded'
CARD     = '#e8eaeb'
SEM_OK   = '#529067'
SEM_WARN = '#8c7443'
SEM_ERR  = '#a25b54'
SEM_INFO = '#507aa4'

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets')
os.makedirs(OUT, exist_ok=True)

def style_ax(ax, xgrid=True, ygrid=False):
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color(BORDER)
    ax.spines['bottom'].set_color(BORDER)
    ax.tick_params(colors=MUTED, labelsize=10)
    for lbl in ax.get_xticklabels() + ax.get_yticklabels():
        lbl.set_color(TEXTP)
    if xgrid:
        ax.grid(axis='x', linestyle='--', linewidth=0.5, alpha=0.2, color=HEADER)
    if ygrid:
        ax.grid(axis='y', linestyle='--', linewidth=0.5, alpha=0.2, color=HEADER)
    ax.set_axisbelow(True)

def save(fig, name):
    fig.savefig(os.path.join(OUT, name), dpi=200, facecolor='white')
    plt.close(fig)
    print('saved', name)

# ---------------------------------------------------------------- Chart 1
# LOC by source area (horizontal bar)
def chart_loc_by_area():
    areas = ['src/components', 'src/data', 'src/lib', 'src/app', 'src/hooks', 'src/config']
    locs  = [15245, 8855, 8460, 428, 212, 53]
    fig, ax = plt.subplots(figsize=(7.6, 3.4), constrained_layout=True)
    bars = ax.barh(areas[::-1], locs[::-1], color=[ICON, ACCENT, ACCENT, ICON, ICON, ICON][::-1],
                   height=0.62, edgecolor='none')
    bars[::-1][0].set_color(ACCENT)  # components emphasized
    for b, v in zip(bars, locs[::-1]):
        ax.text(v + 220, b.get_y() + b.get_height()/2, f'{v:,}',
                va='center', ha='left', fontsize=10, color=TEXTP)
    style_ax(ax)
    ax.set_xlabel('Lines of TypeScript / TSX', fontsize=10, color=MUTED)
    ax.set_xlim(0, 17500)
    save(fig, 'chart_loc_by_area.png')

# ---------------------------------------------------------------- Chart 2
# Top files by LOC
def chart_top_files():
    files = ['auto-listings.json', 'properties.ts', 'ai/engine.ts', 'tokenizeStore.tsx',
             'tokenize/TokenizeView.tsx', 'ui/sidebar.tsx (dead)', 'property/PropertyDetailView.tsx',
             'adminStore.ts', 'landlordStore.ts', 'manage/ManageView.tsx', 'home/Home.tsx', 'auth.tsx']
    locs  = [5630, 1927, 1049, 1041, 744, 726, 657, 642, 622, 588, 564, 556]
    colors = [SEM_ERR if '(dead)' in f else ACCENT for f in files]
    fig, ax = plt.subplots(figsize=(7.6, 4.6), constrained_layout=True)
    bars = ax.barh(files[::-1], locs[::-1], color=colors[::-1], height=0.62)
    for b, v in zip(bars, locs[::-1]):
        ax.text(v + 60, b.get_y() + b.get_height()/2, f'{v:,}',
                va='center', ha='left', fontsize=9.5, color=TEXTP)
    style_ax(ax)
    ax.set_xlabel('Lines of code', fontsize=10, color=MUTED)
    ax.set_xlim(0, 6300)
    save(fig, 'chart_top_files.png')

# ---------------------------------------------------------------- Chart 3
# Tracked files by top-level directory (donut)
def chart_files_by_dir():
    labels = ['src/ (136)', 'public/ (122)', 'android/ (77)', 'ios/ (26)',
              'scripts/ (32)', 'docs/ (18)', 'root + tests (24)']
    vals   = [136, 122, 77, 26, 32, 18, 24]
    cols   = [ACCENT, ICON, HEADER, ICON, MUTED, BORDER, CARD]
    fig, ax = plt.subplots(figsize=(7.2, 3.9), constrained_layout=True)
    wedges, _ = ax.pie(vals, colors=cols, startangle=90, counterclock=False,
                       wedgeprops=dict(width=0.35, edgecolor='white', linewidth=1.5))
    ax.text(0, 0, '435\nfiles', ha='center', va='center', fontsize=15,
            color=TEXTP, fontweight='bold', linespacing=1.3)
    ax.legend(wedges, labels, loc='center left', bbox_to_anchor=(1.02, 0.5),
              frameon=False, fontsize=10, handlelength=1.0, handleheight=1.0)
    save(fig, 'chart_files_by_dir.png')

# ---------------------------------------------------------------- Chart 4
# Findings by severity and domain (grouped horizontal bar)
def chart_severity():
    domains = ['Security & Privacy', 'SEO / Discoverability', 'Testing & Quality Gates',
               'Performance', 'Architecture & Design', 'DevOps & Observability', 'Code Hygiene']
    crit = [2, 1, 1, 0, 0, 0, 0]
    high = [2, 3, 3, 1, 2, 2, 1]
    med  = [3, 1, 3, 3, 3, 2, 3]
    low  = [2, 1, 1, 2, 2, 2, 2]
    y = np.arange(len(domains))[::-1]
    h = 0.2
    fig, ax = plt.subplots(figsize=(7.8, 4.4), constrained_layout=True)
    ax.barh(y + 1.5*h, crit, h, label='Critical', color=SEM_ERR)
    ax.barh(y + 0.5*h, high, h, label='High', color=ACCENT2)
    ax.barh(y - 0.5*h, med, h, label='Medium', color=SEM_WARN)
    ax.barh(y - 1.5*h, low, h, label='Low', color=BORDER)
    ax.set_yticks(y); ax.set_yticklabels(domains, fontsize=10)
    style_ax(ax)
    ax.set_xlabel('Number of findings', fontsize=10, color=MUTED)
    ax.set_xlim(0, 5)
    ax.set_xticks(range(0, 6))
    ax.legend(loc='lower right', frameon=False, fontsize=10, ncol=1,
              bbox_to_anchor=(1.0, -0.02))
    save(fig, 'chart_severity.png')

# ---------------------------------------------------------------- Chart 5
# Bundle composition (first-load chunks raw vs gzip)
def chart_bundle():
    chunks = ['Main shell + framer-motion\n+ Home', 'Framework / React', 'Radix + shadcn layer',
              'Initial chunk D', 'Initial chunk E', 'CSS (2 files)']
    raw    = [224.6, 156.2, 112.6, 126.0, 128.0, 144.6]
    gz     = [67.4, 46.9, 33.8, 37.8, 38.4, 22.0]
    x = np.arange(len(chunks))
    w = 0.38
    fig, ax = plt.subplots(figsize=(7.8, 3.9), constrained_layout=True)
    ax.bar(x - w/2, raw, w, label='Raw (KB)', color=ICON)
    ax.bar(x + w/2, gz, w, label='Gzipped (KB)', color=ACCENT)
    for xi, v in zip(x - w/2, raw):
        ax.text(xi, v + 4, f'{v:.0f}', ha='center', fontsize=9, color=TEXTP)
    for xi, v in zip(x + w/2, gz):
        ax.text(xi, v + 4, f'{v:.0f}', ha='center', fontsize=9, color=TEXTP)
    style_ax(ax, xgrid=False, ygrid=True)
    ax.set_xticks(x); ax.set_xticklabels(chunks, fontsize=9)
    ax.set_ylabel('Kilobytes', fontsize=10, color=MUTED)
    ax.set_ylim(0, 260)
    ax.legend(loc='upper right', frameon=False, fontsize=10)
    save(fig, 'chart_bundle.png')

# ---------------------------------------------------------------- Chart 6
# Dead code donut: UI primitives
def chart_deadcode():
    fig, ax = plt.subplots(figsize=(7.2, 3.6), constrained_layout=True)
    wedges, _ = ax.pie([18, 30], colors=[ACCENT, SEM_ERR], startangle=90,
                       counterclock=False,
                       wedgeprops=dict(width=0.35, edgecolor='white', linewidth=1.5))
    ax.text(0, 0, '48\nshadcn files', ha='center', va='center', fontsize=14,
            color=TEXTP, fontweight='bold', linespacing=1.3)
    ax.legend(wedges, ['Imported by app code (18)', 'Never imported (30, ~4,243 LOC)'],
              loc='center left', bbox_to_anchor=(1.02, 0.5), frameon=False, fontsize=10)
    save(fig, 'chart_deadcode.png')

# ---------------------------------------------------------------- Chart 7
# Deleted test suites (bar)
def chart_tests():
    suites = ['landlordStore\n.test.ts', 'finance.test.ts', 'tokenizeStore\n.test.tsx',
              'Other 20 suites\n(aggregate)', 'vitest.config.ts\n(+ husky, prettier)']
    locs   = [298, 160, 120, 2455, 6]
    fig, ax = plt.subplots(figsize=(7.6, 3.6), constrained_layout=True)
    bars = ax.bar(suites, locs, color=[ACCENT, ACCENT, ACCENT, SEM_ERR, BORDER],
                  width=0.55)
    for b, v in zip(bars, locs):
        ax.text(b.get_x() + b.get_width()/2, v + 55, f'{v:,}',
                ha='center', fontsize=10, color=TEXTP)
    style_ax(ax, xgrid=False, ygrid=True)
    ax.set_ylabel('Lines removed in rebuild', fontsize=10, color=MUTED)
    ax.set_ylim(0, 2800)
    ax.tick_params(axis='x', labelsize=9.5)
    save(fig, 'chart_tests.png')

# ---------------------------------------------------------------- Chart 8
# 90-day roadmap (Gantt-style broken bars)
def chart_roadmap():
    tasks = [
        ('Wire sitemap + JSON-LD + per-route meta', 0, 5, 'P0'),
        ('Gate #/admin, remove demo creds path', 0, 5, 'P0'),
        ('Restore vitest suites from git history', 3, 12, 'P0'),
        ('Re-enable ESLint rules + noImplicitAny', 5, 15, 'P1'),
        ('Purge dead deps / ui components / db.ts', 5, 10, 'P1'),
        ('Sentry + Plausible + SW update toast', 10, 18, 'P1'),
        ('recharts dedupe + image diet (webp)', 10, 20, 'P1'),
        ('Real Prisma domain schema (from dictionary)', 15, 30, 'P2'),
        ('Phase-2 backend spike (auth, API contract)', 20, 45, 'P2'),
        ('M-Pesa Daraja sandbox behind PSP', 40, 70, 'P2'),
        ('Prerendering decision + rollout', 25, 55, 'P2'),
        ('ODPC registration + privacy notices', 30, 60, 'P2'),
    ]
    cmap = {'P0': SEM_ERR, 'P1': ACCENT, 'P2': ICON}
    fig, ax = plt.subplots(figsize=(8.0, 4.9), constrained_layout=True)
    for i, (name, start, dur, pri) in enumerate(tasks):
        y = len(tasks) - 1 - i
        ax.barh(y, dur, left=start, height=0.55, color=cmap[pri], alpha=0.9)
    ax.set_yticks([len(tasks) - 1 - i for i in range(len(tasks))])
    ax.set_yticklabels([t[0] for t in tasks], fontsize=9.5)
    ax.set_xlim(0, 90)
    ax.set_xticks([0, 15, 30, 45, 60, 75, 90])
    ax.set_xlabel('Days from audit publication', fontsize=10, color=MUTED)
    style_ax(ax)
    handles = [plt.Rectangle((0,0),1,1,color=cmap[k]) for k in ['P0','P1','P2']]
    ax.legend(handles, ['P0 - immediate', 'P1 - this month', 'P2 - this quarter'],
              loc='lower right', frameon=False, fontsize=10)
    save(fig, 'chart_roadmap.png')

# ---------------------------------------------------------------- Chart 9
# Risk matrix scatter
def chart_risk():
    risks = [
        ('R1 Real-user credential exposure', 3.2, 4.6),
        ('R2 SEO channel stays dark', 4.2, 3.9),
        ('R3 Untested financial math regressions', 3.6, 3.4),
        ('R4 Regulatory (ODPC) enforcement', 2.2, 4.1),
        ('R5 Platform-scaling wall (localStorage)', 3.9, 2.9),
        ('R6 Silent production errors', 3.4, 2.6),
        ('R7 Dead-code drift', 4.4, 1.6),
        ('R8 Tokenization compliance overreach', 1.9, 4.3),
        ('R9 Dependency supply chain', 2.6, 2.2),
        ('R10 Single-maintainer bus factor', 3.0, 3.7),
    ]
    fig, ax = plt.subplots(figsize=(7.2, 4.6), constrained_layout=True)
    # quadrant shading
    ax.axhspan(3.0, 5.2, xmin=0.5, xmax=1.0, facecolor=SEM_ERR, alpha=0.06)
    ax.axvline(3.0, color=BORDER, linewidth=0.8, linestyle='--')
    ax.axhline(3.0, color=BORDER, linewidth=0.8, linestyle='--')
    for name, x, y in risks:
        ax.scatter(x, y, s=150, color=ACCENT, alpha=0.75, edgecolor='white',
                   linewidth=1.2, zorder=3)
        ax.annotate(name.split(' ')[0], (x, y), textcoords='offset points',
                    xytext=(9, 6), fontsize=10, color=TEXTP, fontweight='bold')
    ax.set_xlim(0.5, 5.2); ax.set_ylim(0.5, 5.2)
    ax.set_xlabel('Likelihood (audit judgment, 1-5)', fontsize=10, color=MUTED)
    ax.set_ylabel('Impact (1-5)', fontsize=10, color=MUTED)
    ax.set_xticks([1, 2, 3, 4, 5]); ax.set_yticks([1, 2, 3, 4, 5])
    style_ax(ax, xgrid=True, ygrid=True)
    save(fig, 'chart_risk.png')

# ---------------------------------------------------------------- Chart 10
# localStorage keys by domain store
def chart_storage():
    stores = ['tokenize (KYC + wallet + ledger)', 'admin (submissions, audit, feeds)',
              'landlord (units, tenants, payments)', 'search (saved, alerts, coords)',
              'tenant (applications, PII)', 'auth (users, sessions, fails)',
              'core store (favorites, leads, chat)', 'analytics ring buffer']
    approx = [30, 60, 55, 45, 25, 35, 50, 15]  # representative relative weight KB
    fig, ax = plt.subplots(figsize=(7.8, 4.2), constrained_layout=True)
    bars = ax.barh(stores[::-1], approx[::-1], color=[ACCENT]*8, height=0.6)
    style_ax(ax)
    ax.set_xlabel('Approximate persisted footprint per store (indicative KB scale)',
                  fontsize=9.5, color=MUTED)
    save(fig, 'chart_storage.png')

if __name__ == '__main__':
    chart_loc_by_area()
    chart_top_files()
    chart_files_by_dir()
    chart_severity()
    chart_bundle()
    chart_deadcode()
    chart_tests()
    chart_roadmap()
    chart_risk()
    chart_storage()
    print('ALL CHARTS DONE')
