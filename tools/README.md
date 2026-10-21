# Shared Baseline Verification

This checks schemas, authored request/response pairs, exact fixture citations, source grouping, library/locale references, rejection examples, work-package dependencies, CSV headers and local documentation links. It never calls a model or verifies application behavior. Owner DASE; AI reviews schema checks and CS reviews integration links.

From the repository, with Python 3.11+ and the versions listed in [requirements-verification.txt](requirements-verification.txt) installed:

```powershell
python -X utf8 tools/verify-project.py
```

The checker uses the repository containing the script by default, or an explicit root argument for a review copy. It prints results and exits nonzero on disagreement. Required packages were already available in the documentation-review environment; no installation was performed during this review. A teammate can install them into a project-local Python environment if needed, after considering their own setup.

Run the unchanged standalone component checks separately:

```powershell
node --test tests/analysis-runner.test.mjs
```

Authored design rejection cases and runner checks do not mean the proposed API/reducer/model passes the [shared integration matrix](../docs/integration-test-matrix.md). The checker now permits a scaffold, excludes Git-ignored build/private artifacts in clones and allows populated non-template development CSV files. Source-only snapshots must already exclude private/generated material. These structural checks still establish no app/controller acceptance; record actual application commands and results separately. Human approval/results must never be manufactured to make a check pass.

## Startup regression checks

Run the filesystem regression checks with Python and Git available:

```powershell
python -B -X utf8 tools/verify-project-startup-test.py
```

Five checks use fictional files in isolated temporary Git copies under ignored .local-data/verification-tests: allow a scaffold with normal ignored artifacts, allow a separate development annotation CSV, and reject unowned source, populated blank templates and malformed CSV rows. Temporary copies are removed after each check. No model calls, private source records or application builds occur. The standing startup assignments are also checked by verify-project.py; approval to start is distinct from an active writer, review or completed task.
