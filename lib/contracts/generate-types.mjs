import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const sources = {
  AnalyzeRequest: 'analyze-request.schema.json',
  CanonicalExtraction: 'extraction.schema.json',
  ProviderExtraction: 'provider-extraction.schema.json',
  AnalyzeResponse: 'analyze-response.schema.json',
  TransportError: 'transport-error.schema.json',
};
const refNames = Object.fromEntries(
  Object.entries(sources).map(([k, v]) => [v, k]),
);
function type(s) {
  if (s.$ref) {
    if (!refNames[s.$ref]) throw Error('Unsupported schema reference');
    return refNames[s.$ref];
  }
  if (s.const !== undefined) return JSON.stringify(s.const);
  if (s.enum) return s.enum.map((x) => JSON.stringify(x)).join(' | ');
  if (s.oneOf) return s.oneOf.map((x) => '(' + type(x) + ')').join(' | ');
  if (Array.isArray(s.type))
    return s.type.map((t) => type({ ...s, type: t })).join(' | ');
  if (s.type === 'object')
    return (
      '{ ' +
      Object.entries(s.properties)
        .map(
          ([k, v]) =>
            JSON.stringify(k) +
            (s.required.includes(k) ? '' : '?') +
            ': ' +
            type(v) +
            ';',
        )
        .join(' ') +
      ' }'
    );
  if (s.type === 'array') return '(' + type(s.items) + ')[]';
  if (s.type === 'integer' || s.type === 'number') return 'number';
  if (['string', 'boolean', 'null'].includes(s.type)) return s.type;
  throw Error('Unsupported type-generation schema');
}
let output =
  '// Generated from the five root schemas. Run generate-types.mjs; never edit by hand.\n';
for (const [name, file] of Object.entries(sources)) {
  const bytes = readFileSync(
    new URL('../../contracts/' + file, import.meta.url),
  );
  output +=
    '// ' +
    file +
    ' SHA256 ' +
    createHash('sha256').update(bytes).digest('hex') +
    '\nexport type ' +
    name +
    ' = ' +
    type(JSON.parse(bytes)) +
    ';\n';
}
output += `export type CompleteResponse = Extract<AnalyzeResponse, {status: 'complete'}>;
export type IncompleteResponse = Extract<AnalyzeResponse, {status: 'incomplete'}>;
export type ErrorCode = IncompleteResponse['errorCode'];
export type Locale = AnalyzeRequest['locale'];
export type Guidance = CompleteResponse['guidance'];
export type Action = CanonicalExtraction['actions'][number];
export type Claim = CanonicalExtraction['claims'][number];
`;
const target = new URL('./generated.ts', import.meta.url);
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== output)
    throw Error('Generated types differ from authoritative schemas');
  console.log('Schema-derived types are current.');
} else writeFileSync(target, output);
