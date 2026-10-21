import registry from '../../examples/simulation-fixtures.json' with { type: 'json' };
import taskEn from '../../examples/request-task-en.json' with { type: 'json' };
import taskEnOut from '../../examples/response-task-en.json' with { type: 'json' };
import taskZh from '../../examples/request-task-zh.json' with { type: 'json' };
import taskZhOut from '../../examples/response-task-zh.json' with { type: 'json' };
import companyEn from '../../examples/request-company-en.json' with { type: 'json' };
import companyEnOut from '../../examples/response-company-en.json' with { type: 'json' };
import companyZh from '../../examples/request-company-zh.json' with { type: 'json' };
import companyZhOut from '../../examples/response-company-zh.json' with { type: 'json' };
import missing from '../../examples/request-missing-payer-en.json' with { type: 'json' };
import missingOut from '../../examples/response-missing-payer-en.json' with { type: 'json' };
import note from '../../examples/request-funding-note-en.json' with { type: 'json' };
import noteOut from '../../examples/response-funding-note-en.json' with { type: 'json' };
import denial from '../../examples/request-task-denial-en.json' with { type: 'json' };
import denialOut from '../../examples/response-task-denial-en.json' with { type: 'json' };
import loan from '../../examples/request-personal-loan.json' with { type: 'json' };
import loanOut from '../../examples/response-personal-loan.json' with { type: 'json' };
import type { AnalyzeRequest, CompleteResponse } from '../contracts/index.ts';
import { validateAnalyzeResponse } from '../contracts/index.ts';
import { AnalysisFailure } from './failure.ts';
const files: Record<string, unknown> = {
  'request-task-en.json': taskEn,
  'response-task-en.json': taskEnOut,
  'request-task-zh.json': taskZh,
  'response-task-zh.json': taskZhOut,
  'request-company-en.json': companyEn,
  'response-company-en.json': companyEnOut,
  'request-company-zh.json': companyZh,
  'response-company-zh.json': companyZhOut,
  'request-missing-payer-en.json': missing,
  'response-missing-payer-en.json': missingOut,
  'request-funding-note-en.json': note,
  'response-funding-note-en.json': noteOut,
  'request-task-denial-en.json': denial,
  'response-task-denial-en.json': denialOut,
  'request-personal-loan.json': loan,
  'response-personal-loan.json': loanOut,
};
export function getSimulation(request: AnalyzeRequest): CompleteResponse {
  for (const fixture of registry.fixtures) {
    const input = files[fixture.requestFile] as AnalyzeRequest | undefined;
    if (!input || !files[fixture.responseFile])
      throw new AnalysisFailure('configuration_unavailable');
    const same =
      input.contractVersion === request.contractVersion &&
      input.locale === request.locale &&
      input.clarificationsUsed === request.clarificationsUsed &&
      input.evidence.length === request.evidence.length &&
      input.evidence.every((e, i) =>
        ['id', 'kind', 'label', 'sequence', 'text'].every(
          (k) =>
            e[k as keyof typeof e] === request.evidence[i][k as keyof typeof e],
        ),
      );
    if (same) {
      const out = structuredClone(
        files[fixture.responseFile],
      ) as CompleteResponse;
      out.requestId = request.requestId;
      out.revision = request.revision;
      return validateAnalyzeResponse(
        out,
        request,
        'simulation',
      ) as CompleteResponse;
    }
  }
  throw new AnalysisFailure('simulation_unsupported');
}
