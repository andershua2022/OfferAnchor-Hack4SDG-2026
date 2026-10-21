import {selectPolicyReferences} from '../contracts/policy.ts';
import '../analysis/server-guard.ts';
import template from '../../knowledge/library.json' with { type: 'json' };
import type {
  Locale,
  CanonicalExtraction,
  Guidance,
  Action,
} from '../contracts/index.ts';
import { isRecord, validUnicode } from '../contracts/schema.ts';
type Reviewed<T> = Omit<
  T,
  'humanReviewer' | 'approvalStatus' | 'localizedMeaningApproved'
> & {
  humanReviewer: string | null;
  approvalStatus: 'draft' | 'approved';
  localizedMeaningApproved: boolean;
};
export type LibraryContent = Omit<
  typeof template,
  'status' | 'cards' | 'routes'
> & {
  status: 'draft' | 'approved';
  cards: Reviewed<(typeof template.cards)[number]>[];
  routes: Reviewed<(typeof template.routes)[number]>[];
};
type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;
export type ReferenceLibrary = DeepReadonly<LibraryContent> & {
  readonly localeStrings: Readonly<
    Record<Locale, Readonly<Record<string, string>>>
  >;
};
export class LibraryConfigurationError extends Error {
  readonly errorCode = 'configuration_unavailable';
  constructor() {
    super('Reference library is unavailable');
    this.name = 'LibraryConfigurationError';
  }
}
const loaded = new WeakSet<object>();
function requireLibrary(ok: unknown): asserts ok {
  if (!ok) throw new LibraryConfigurationError();
}
function sameShape(value: unknown, example: unknown, key = ''): boolean {
  if (key === 'humanReviewer' || key === 'telephone')
    return (
      value === null ||
      (typeof value === 'string' &&
        !!value.trim() &&
        value.length <= 300 &&
        validUnicode(value))
    );
  if (key === 'status' || key === 'approvalStatus')
    return value === 'draft' || value === 'approved';
  if (Array.isArray(example))
    return (
      Array.isArray(value) &&
      value.length <= 100 &&
      value.every((x) => sameShape(x, example[0] ?? '', key))
    );
  if (isRecord(example))
    return (
      isRecord(value) &&
      Object.keys(value).length === Object.keys(example).length &&
      Object.entries(example).every(
        ([k, v]) => Object.hasOwn(value, k) && sameShape(value[k], v, k),
      )
    );
  if (typeof example === 'string')
    return (
      typeof value === 'string' &&
      !!value.trim() &&
      value.length <= 3000 &&
      validUnicode(value) &&
      !value.includes('\r')
    );
  return typeof value === typeof example;
}
function flatten(
  value: unknown,
  prefix = '',
  out: Record<string, string> = {},
): Record<string, string> {
  requireLibrary(isRecord(value));
  for (const [key, item] of Object.entries(value)) {
    const path = prefix ? prefix + '.' + key : key;
    if (typeof item === 'string') {
      requireLibrary(!!item.trim() && validUnicode(item));
      Object.defineProperty(out, path, {
        value: item,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    } else flatten(item, path, out);
  }
  return out;
}
function freeze<T>(value: T): DeepReadonly<T> {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value as DeepReadonly<T>;
}
export function loadReferenceLibrary(
  content: unknown,
  localeFiles: Record<Locale, unknown>,
): ReferenceLibrary {
  try {
    requireLibrary(sameShape(content, template));
    const c = structuredClone(content) as LibraryContent;
    requireLibrary(
      c.libraryVersion === template.libraryVersion &&
        c.humanApprovalRequiredForLiveUse === true,
    );
    const strings = {
      'en-HK': flatten(localeFiles['en-HK']),
      'zh-Hant-HK': flatten(localeFiles['zh-Hant-HK']),
    };
    requireLibrary(
      JSON.stringify(Object.keys(strings['en-HK']).sort()) ===
        JSON.stringify(Object.keys(strings['zh-Hant-HK']).sort()),
    );
    for (const key of Object.keys(strings['en-HK']))
      requireLibrary(
        JSON.stringify(
          (
            strings['en-HK'][key].match(/\{[A-Za-z_][A-Za-z0-9_]*\}/g) ?? []
          ).sort(),
        ) ===
          JSON.stringify(
            (
              strings['zh-Hant-HK'][key].match(/\{[A-Za-z_][A-Za-z0-9_]*\}/g) ??
              []
            ).sort(),
          ),
      );
    const ids = (rows: { id: string }[]) => {
      requireLibrary(new Set(rows.map((x) => x.id)).size === rows.length);
      return new Set(rows.map((x) => x.id));
    };
    const sourceIds = ids(c.sources),
      cardIds = ids(c.cards),
      routeIds = ids(c.routes);
    requireLibrary(
      template.cards.every((x) => cardIds.has(x.id)) &&
        template.routes.every((x) => routeIds.has(x.id)),
    );
    for (const source of c.sources) {
      const u = new URL(source.url);
      requireLibrary(u.protocol === 'https:' && !u.username && !u.password);
    }
    for (const route of c.routes) {
      requireLibrary(sourceIds.has(route.sourceId));
      const u = new URL(route.url);
      requireLibrary(u.protocol === 'https:' && !u.username && !u.password);
    }
    for (const card of c.cards)
      requireLibrary(
        card.sourceIds.length > 0 &&
          card.sourceIds.every((id) => sourceIds.has(id)) &&
          card.routeIds.every((id) => routeIds.has(id)),
      );
    for (const [rows, suffixes] of [
      [c.cards, ['title', 'question']],
      [c.routes, ['label', 'scope']],
    ] as const)
      for (const item of rows)
        for (const loc of ['en-HK', 'zh-Hant-HK'] as const)
          for (const suffix of suffixes)
            requireLibrary(!!strings[loc][item.localeKey + '.' + suffix]);
    requireLibrary(
      !!strings['en-HK']['guidance.noScopedQuestion'] &&
        !!strings['zh-Hant-HK']['guidance.noScopedQuestion'],
    );
    const view = freeze({ ...c, localeStrings: strings }) as ReferenceLibrary;
    loaded.add(view);
    return view;
  } catch {
    throw new LibraryConfigurationError();
  }
}
export function requireLoadedLibrary(
  value: unknown,
): asserts value is ReferenceLibrary {
  requireLibrary(
    typeof value === 'object' && value !== null && loaded.has(value),
  );
}
export function selectReferences(
  extraction: CanonicalExtraction,
  library: ReferenceLibrary,
  locale: Locale,
  mode: 'live' | 'simulation',
): { guidance: Guidance; referenceIds: string[]; routeIds: string[] } {
  requireLoadedLibrary(library);
  requireLibrary(
    ['en-HK', 'zh-Hant-HK'].includes(locale) &&
      ['live', 'simulation'].includes(mode),
  );
  const {guidance, referenceIds, routeIds} = selectPolicyReferences(extraction, library.cards);
  const cards = referenceIds.map((id) => {
    const card = library.cards.find((c) => c.id === id);
    requireLibrary(card);
    return card;
  });
  const routes = routeIds.map((id) => {
    const route = library.routes.find((r) => r.id === id);
    requireLibrary(route);
    return route;
  });
  if (mode === 'live')
    for (const item of [...cards, ...routes])
      requireLibrary(
        item.approvalStatus === 'approved' &&
          typeof item.humanReviewer === 'string' &&
          !!item.humanReviewer.trim() &&
          !!item.checkedOn.trim() &&
          item.localizedMeaningApproved === true,
      );
  return { guidance, referenceIds, routeIds };
}
