import request from '../../contracts/analyze-request.schema.json' with { type: 'json' };
import response from '../../contracts/analyze-response.schema.json' with { type: 'json' };
import canonical from '../../contracts/extraction.schema.json' with { type: 'json' };
import provider from '../../contracts/provider-extraction.schema.json' with { type: 'json' };
import transport from '../../contracts/transport-error.schema.json' with { type: 'json' };
export interface Schema {
  $ref?: string;
  type?: string | string[];
  const?: unknown;
  enum?: unknown[];
  oneOf?: Schema[];
  properties?: Record<string, Schema>;
  required?: string[];
  additionalProperties?: boolean;
  items?: Schema;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}
export const schemas: Record<string, Schema> = {
  'analyze-request.schema.json': request as Schema,
  'analyze-response.schema.json': response as unknown as Schema,
  'extraction.schema.json': canonical as Schema,
  'provider-extraction.schema.json': provider as Schema,
  'transport-error.schema.json': transport as Schema,
};
const supported = new Set([
  '$schema',
  'title',
  '$ref',
  'type',
  'const',
  'enum',
  'oneOf',
  'properties',
  'required',
  'additionalProperties',
  'items',
  'minItems',
  'maxItems',
  'uniqueItems',
  'minimum',
  'maximum',
  'minLength',
  'maxLength',
  'pattern',
]);
function checkDialect(s: Schema) {
  if (Object.keys(s).some((k) => !supported.has(k)))
    throw Error(
      'Unsupported schema keyword; update validator before changing contract',
    );
  if (s.$ref && !schemas[s.$ref]) throw Error('Unsupported schema reference');
  for (const child of Object.values(s.properties ?? {})) checkDialect(child);
  if (s.items) checkDialect(s.items);
  for (const child of s.oneOf ?? []) checkDialect(child);
}
Object.values(schemas).forEach(checkDialect);
export function validUnicode(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const u = value.charCodeAt(i);
    if (u >= 0xd800 && u <= 0xdbff) {
      const next = value.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
    } else if (u >= 0xdc00 && u <= 0xdfff) return false;
  }
  return true;
}
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/** Exact audited schema subset, with stricter UTF-16/safe-integer bounds. No coercion or repair. */
export function matchesSchema(value: unknown, s: Schema): boolean {
  if (s.$ref) return matchesSchema(value, schemas[s.$ref]);
  if (
    s.oneOf &&
    s.oneOf.filter((child) => matchesSchema(value, child)).length !== 1
  )
    return false;
  if ('const' in s && value !== s.const) return false;
  if (s.enum && !s.enum.includes(value)) return false;
  if (Array.isArray(s.type))
    return s.type.some((type) => matchesSchema(value, { ...s, type }));
  if (s.type === 'null') return value === null;
  if (s.type === 'boolean') return typeof value === 'boolean';
  if (s.type === 'integer' || s.type === 'number')
    return (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      (s.type !== 'integer' || Number.isSafeInteger(value)) &&
      value >= (s.minimum ?? -Infinity) &&
      value <= (s.maximum ?? Infinity)
    );
  if (s.type === 'string')
    return (
      typeof value === 'string' &&
      validUnicode(value) &&
      !value.includes('\r') &&
      value.length >= (s.minLength ?? 0) &&
      value.length <= (s.maxLength ?? Infinity) &&
      (!s.pattern || new RegExp(s.pattern, 'u').test(value))
    );
  if (s.type === 'array')
    return (
      Array.isArray(value) &&
      value.length >= (s.minItems ?? 0) &&
      value.length <= (s.maxItems ?? Infinity) &&
      (!s.uniqueItems ||
        new Set(value.map((v) => JSON.stringify(v))).size === value.length) &&
      value.every((v) => matchesSchema(v, s.items!))
    );
  if (s.type === 'object')
    return (
      isRecord(value) &&
      (s.required ?? []).every((k) => Object.hasOwn(value, k)) &&
      (s.additionalProperties !== false ||
        Object.keys(value).every((k) =>
          Object.hasOwn(s.properties ?? {}, k),
        )) &&
      Object.entries(s.properties ?? {}).every(
        ([k, child]) =>
          !Object.hasOwn(value, k) || matchesSchema(value[k], child),
      )
    );
  return true;
}
