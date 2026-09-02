/**
 * Deferred framer-motion feature bundle.
 *
 * Imported ONLY dynamically (see App.tsx LazyMotion features loader) so the
 * ~90KB animation engine ships as its own async chunk instead of blocking
 * first paint in the entry bundle. `domAnimation` covers everything this app
 * uses (initial/animate/whileInView/exit transitions); no drag or layout
 * animations are used anywhere, so `domMax` is unnecessary weight.
 */
import { domAnimation } from 'framer-motion';

export default domAnimation;
