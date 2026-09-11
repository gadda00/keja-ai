/**
 * Governed events — the public surface (audit Sprint 1+2).
 *
 *   envelope   — the common contract every event carries
 *   taxonomy   — the versioned event catalog (schemas ARE the contract)
 *   sdk        — emit(): validate → redact → append → mirror
 *   metrics    — the metric registry + local computation
 *   quality    — the data-quality report
 */
export * from './envelope';
export * from './taxonomy';
export * from './sdk';
export * from './metrics';
export * from './quality';
