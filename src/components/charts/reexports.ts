/**
 * Recharts barrel — the ONE import point for charting primitives
 * (audit F-13 / P1-4).
 *
 * History: five lazy-loaded views each imported `recharts` directly, and the
 * bundler emitted the library TWICE across two ~388 KB async chunks
 * (~776 KB shipped where ~388 KB would do). Routing every import through
 * this single module forces one shared chunk: every chart-bearing view pays
 * for the library exactly once, and non-chart views never pay at all.
 *
 * Lazy-loading behaviour is unchanged — the barrel is only ever imported by
 * route-level lazy views, so it stays out of the first-load bundle.
 */
export {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type {
  TooltipProps,
  XAxisProps,
  YAxisProps,
} from 'recharts';
