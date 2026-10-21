export function assertServerOnly(): void {
  if (typeof window !== 'undefined')
    throw new Error('OfferAnchor analysis modules are server-only');
}
assertServerOnly();
