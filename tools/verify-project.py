"""Check the shared documentation baseline; never call an inference service."""
from pathlib import Path
from urllib.parse import unquote
import copy
import hashlib
import csv
import fnmatch
import json
import re
import subprocess
import sys

from jsonschema import Draft202012Validator
from referencing import Registry, Resource

ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parents[1]


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def load(relative):
    return json.loads((ROOT / relative).read_text(encoding="utf-8-sig"))


def units(value):
    return len(value.encode("utf-16-le")) // 2


def bounded_strings(value, schema):
    if isinstance(value, str):
        require("\r" not in value, "Unexpected CR in normalized fixture")
        require(units(value) <= schema.get("maxLength", 10**9), "UTF-16 string bound")
    elif isinstance(value, list):
        for item in value:
            bounded_strings(item, schema.get("items", {}))
    elif isinstance(value, dict):
        for key, item in value.items():
            bounded_strings(item, schema.get("properties", {}).get(key, {}))


paths = sorted((ROOT / "contracts").glob("*.schema.json"))
require(len(paths) == 5, "Expected five contract schemas")
schemas = {}
for path in paths:
    data = load(path.relative_to(ROOT))
    Draft202012Validator.check_schema(data)
    schemas[path.as_uri()] = {**data, "$id": path.as_uri()}
registry = Registry().with_resources((uri, Resource.from_contents(data)) for uri, data in schemas.items())


def validator(name):
    return Draft202012Validator(schemas[(ROOT / "contracts" / name).as_uri()], registry=registry)


request_check = validator("analyze-request.schema.json")
response_check = validator("analyze-response.schema.json")
canonical_check = validator("extraction.schema.json")
provider_check = validator("provider-extraction.schema.json")
transport_check = validator("transport-error.schema.json")


def check_request(request):
    request_check.validate(request)
    bounded_strings(request, request_check.schema)
    entries = request["evidence"]
    require(len({e["id"] for e in entries}) == len(entries), "Duplicate evidence IDs")
    require(len({e["sequence"] for e in entries}) == len(entries), "Duplicate evidence sequence")
    require(any(e["kind"] in ("instruction", "reply") for e in entries), "Missing instruction/reply")
    require(all(e["text"].strip() for e in entries), "Whitespace-only evidence")
    require(sum(units(e["text"]) for e in entries) <= 12000, "Total source bound")
    require(len(json.dumps(request, ensure_ascii=False).encode("utf-8")) <= 96 * 1024, "Body byte bound")


library = load("knowledge/library.json")
card_ids = {c["id"] for c in library["cards"]}
route_ids = {r["id"] for r in library["routes"]}
source_ids = {s["id"] for s in library["sources"]}
require(len(card_ids) == len(library["cards"]), "Duplicate cards")
require(len(route_ids) == len(library["routes"]), "Duplicate routes")
for item in library["cards"] + library["routes"]:
    require(item["approvalStatus"] in ("draft", "approved"), "Unknown approval state")
    if item["approvalStatus"] == "approved":
        require(item["humanReviewer"] and item["localizedMeaningApproved"], "Unreviewed live meaning")
for card in library["cards"]:
    require(set(card["sourceIds"]) <= source_ids and set(card["routeIds"]) <= route_ids, "Card references")
for route in library["routes"]:
    require(route["sourceId"] in source_ids, "Route source missing")
    require(route["url"].startswith("https://"), "Non-HTTPS official route")


def flatten(value, prefix=""):
    if isinstance(value, dict):
        result = {}
        for key, item in value.items():
            result.update(flatten(item, f"{prefix}.{key}" if prefix else key))
        return result
    require(isinstance(value, str) and value.strip(), "Missing locale string")
    return {prefix: value}


locale_maps = {loc: flatten(load(f"locales/{loc}.json")) for loc in ("en-HK", "zh-Hant-HK")}
require(locale_maps["en-HK"].keys() == locale_maps["zh-Hant-HK"].keys(), "Locale key mismatch")
for key in locale_maps["en-HK"]:
    require(set(re.findall(r"\{[A-Za-z_][A-Za-z0-9_]*\}", locale_maps["en-HK"][key])) ==
            set(re.findall(r"\{[A-Za-z_][A-Za-z0-9_]*\}", locale_maps["zh-Hant-HK"][key])), "Locale placeholder mismatch")
for item in library["cards"] + library["routes"]:
    suffix = ".title" if item["id"] in card_ids else ".label"
    for mapping in locale_maps.values():
        require(item["localeKey"] + suffix in mapping, "Missing displayed library label")
        require(item["localeKey"] + (".question" if item["id"] in card_ids else ".scope") in mapping, "Missing library scope/question")


def check_complete(request, response):
    response_check.validate(response)
    require(response["status"] == "complete", "Expected authored complete response")
    require(response["requestId"] == request["requestId"] and response["revision"] == request["revision"], "Response identity mismatch")
    ex = response["extraction"]
    bounded_strings(ex, canonical_check.schema)
    sources = {e["id"]: e for e in request["evidence"]}
    items = {}
    citation_count = 0
    for field in ("actions", "claims", "comparisons", "relationships", "unknowns", "questions"):
        require(len({i["id"] for i in ex[field]}) == len(ex[field]), "Duplicate extraction IDs")
    for item in ex["actions"] + ex["claims"]:
        items[item["id"]] = item
        for cite in item["citations"]:
            source = sources[cite["evidenceId"]]["text"]
            require(0 <= cite["start"] < cite["end"] <= units(source), "Canonical citation bounds")
            quote = source.encode("utf-16-le")[2*cite["start"]:2*cite["end"]].decode("utf-16-le")
            require(quote == cite["quote"], "Canonical citation mismatch")
            citation_count += 1
    require(citation_count <= 20, "Citation count bound")

    def order(item_id):
        return min(sources[c["evidenceId"]]["sequence"] for c in items[item_id]["citations"])

    for comp in ex["comparisons"]:
        require(order(comp["earlierClaimId"]) < order(comp["laterActionId"]), "Comparison order/reference")
    for rel in ex["relationships"]:
        require(rel["earlierItemId"] != rel["laterItemId"] and order(rel["earlierItemId"]) < order(rel["laterItemId"]), "Relationship order/reference")
    actions = {a["id"]: a for a in ex["actions"]}
    for claim in ex["claims"]:
        require(set(claim["relatedActionIds"]) <= actions.keys(), "Claim action reference")
        if claim["status"] == "user_reported":
            require(any(sources[c["evidenceId"]]["kind"] == "user_note" for c in claim["citations"]), "User report without note provenance")
    for unknown in ex["unknowns"]:
        require(set(unknown["relatedActionIds"]) <= actions.keys(), "Unknown action reference")
        if unknown["priority"] == "blocking":
            require(unknown["kind"] in ("actor", "resource", "payment_condition", "contradiction") and unknown["relatedActionIds"], "Invalid blocking unknown")
    unknowns = {u["id"]: u for u in ex["unknowns"]}
    for question in ex["questions"]:
        require(question["unknownId"] in unknowns and unknowns[question["unknownId"]]["priority"] == "blocking", "Question target")
    require(len(ex["questions"]) <= 2-request["clarificationsUsed"], "Question budget")
    require(response["guidance"] == "clarify_before_action" or not ex["questions"], "Questions in non-clarify output")
    require(set(response["referenceIds"]) <= card_ids and set(response["routeIds"]) <= route_ids, "Response library IDs")
    require(response["provenance"]["libraryVersion"] == library["libraryVersion"], "Library version mismatch")
    require(response["provenance"]["promptVersion"] == "extract-v2.0", "Prompt mismatch")
    require(response["mode"] == "simulation" and response["provenance"]["modelId"] is None, "Authored fixture must remain simulation")
    for action in actions.values():
        mechanism = action["mechanism"]
        compatible = {
            "task_recharge": (action["verb"] in ("pay", "transfer") and action["resource"] == "personal_money"),
            "personal_borrowing": (action["verb"] in ("borrow", "transfer", "pay") and action["resource"] == "personal_borrowing"),
            "credential_control": (action["verb"] in ("share_otp", "share_account_details") and action["resource"] == "account_control"),
            "company_funded_work": action["resource"] == "company_money",
            "payroll_information": action["verb"] == "share_account_details" and action["resource"] == "account_information",
        }
        require(compatible.get(mechanism, True), "Mechanism/resource incompatibility")
        require(action["verb"] != "share_otp" or action["resource"] == "account_control", "OTP resource mismatch")
        require(action["verb"] != "share_otp" or mechanism == "credential_control", "OTP reverse mechanism mismatch")
        require(action["resource"] != "personal_borrowing" or mechanism == "personal_borrowing", "Borrowing reverse mechanism mismatch")
        require(action["resource"] != "account_control" or mechanism == "credential_control", "Account control reverse mechanism mismatch")
        possible = action["verb"] in ("borrow", "transfer", "pay", "share_otp", "share_account_details") and action["polarity"] in ("requested", "uncertain")
        if possible and (action["actor"] == "unknown" or action["resource"] == "unknown" or mechanism == "unclear"):
            require(any(u["priority"] == "blocking" and action["id"] in u["relatedActionIds"] for u in ex["unknowns"]), "Unresolved action lacks blocking unknown")
        if possible and action["actor"] == "applicant" and action["resource"] in ("personal_money", "personal_borrowing", "account_control"):
            require(mechanism != "none", "Personal financial action tagged none")
    # This checks authored fixtures against the plan; it is not an app policy implementation/test.
    dangerous = any(a["actor"] == "applicant" and a["polarity"] == "requested" and a["mechanism"] in
                    ("task_recharge", "personal_borrowing", "credential_control") for a in actions.values())
    if dangerous:
        require(response["guidance"] == "pause_requested_action", "Authored pause priority mismatch")
    return citation_count


fixtures = load("examples/simulation-fixtures.json")
require(fixtures["contractVersion"] == "2.0.0" and len(fixtures["fixtures"]) == 8, "Fixture registry mismatch")
require(len({f["fixtureId"] for f in fixtures["fixtures"]}) == 8, "Duplicate fixture IDs")
total_citations = 0
fixture_requests = []
for fixture in fixtures["fixtures"]:
    request = load("examples/" + fixture["requestFile"])
    response = load("examples/" + fixture["responseFile"])
    require(fixture["sessionInitialization"] in ("new_session", "seeded_demo_stage"), "Missing example-session rule")
    require(fixture["seededClarificationsUsed"] == request["clarificationsUsed"], "Fixture question seed mismatch")
    check_request(request)
    total_citations += check_complete(request, response)
    fixture_requests.append(request)
response_check.validate(load("examples/response-timeout.json"))
transport_check.validate(load("examples/transport-error-invalid-input.json"))
raw = load("examples/provider-extraction-personal-loan.json")
provider_check.validate(raw)
bounded_strings(raw, provider_check.schema)
loan_request = load("examples/request-personal-loan.json")
loan_response = load("examples/response-personal-loan.json")
resolved_raw = copy.deepcopy(raw)
for field in ("actions", "claims"):
    for item in resolved_raw[field]:
        citations = []
        for raw_cite in item["citations"]:
            source = next(e["text"] for e in loan_request["evidence"] if e["id"] == raw_cite["evidenceId"])
            positions = [i for i in range(len(source)) if source.startswith(raw_cite["quote"], i)]
            pos = positions[raw_cite["occurrence"]-1]
            start = units(source[:pos])
            citations.append({"evidenceId":raw_cite["evidenceId"],"quote":raw_cite["quote"],"start":start,"end":start+units(raw_cite["quote"])})
        item["citations"] = citations
require(resolved_raw == loan_response["extraction"], "Raw/canonical fixture semantic or citation drift")

cases = load("evals/student/development-cases.json")["cases"]
require(len(cases) == 18 and len({c["caseId"] for c in cases}) == 18, "Development seed inventory")
for case in cases:
    check_request(case["request"])
    require(case["partition"] == "development" and case["annotationStatus"] == "author_expectation_unreviewed", "Synthetic seed classification")
    require(set(case["sourceIds"]) <= source_ids, "Seed source reference")
base_ids = {c["baseCaseId"] for c in cases}
controls = [c for c in cases if c["benignOrConfusable"]]
require(len(base_ids) == 14 and len(controls) == 10 and len({c["baseCaseId"] for c in controls}) == 6, "Provisional grouping counts")

# Exercise rejection at schema AND documented cross-field checks, without a product endpoint.
rejected = 0


from jsonschema.exceptions import ValidationError


def reject(fn, value):
    global rejected
    try:
        fn(value)
    except (AssertionError, KeyError, ValueError, UnicodeError, ValidationError):
        rejected += 1
        return
    raise AssertionError("Invalid authored mutation unexpectedly accepted")


for field, value in (("contractVersion", "1.0.0"), ("locale", "en"), ("requestId", "x"), ("revision", 0), ("clarificationsUsed", 3), ("mode", "live")):
    bad = copy.deepcopy(loan_request); bad[field] = value
    reject(check_request, bad)
for modifier in ("nine", "duplicate_id", "duplicate_order", "blank", "long", "surrogate", "no_instruction", "total"):
    bad = copy.deepcopy(loan_request)
    if modifier == "nine": bad["evidence"] = bad["evidence"] * 3
    elif modifier == "duplicate_id": bad["evidence"][1]["id"] = bad["evidence"][0]["id"]
    elif modifier == "duplicate_order": bad["evidence"][1]["sequence"] = bad["evidence"][0]["sequence"]
    elif modifier == "blank": bad["evidence"][0]["text"] = "   "
    elif modifier == "long": bad["evidence"][0]["text"] = "x" * 4001
    elif modifier == "surrogate": bad["evidence"][0]["text"] = "\ud800"
    elif modifier == "no_instruction":
        for e in bad["evidence"]: e["kind"] = "advertisement"
    else:
        bad["evidence"] = [{"id":f"E{i}","sequence":i,"kind":"instruction","label":"Synthetic limit","text":"x"*4000} for i in range(1,5)]
    reject(check_request, bad)
for field, value in (("status", "completed"), ("contractVersion", "1.0.0"), ("requestId", "different_request"), ("revision", 2)):
    bad = copy.deepcopy(loan_response); bad[field] = value
    reject(lambda data: check_complete(loan_request, data), bad)
for modifier in ("quote", "offset", "source", "mechanism", "blocking", "library"):
    bad = copy.deepcopy(loan_response)
    if modifier == "quote": bad["extraction"]["actions"][0]["citations"][0]["quote"] = "invented"
    elif modifier == "offset": bad["extraction"]["actions"][0]["citations"][0]["end"] += 1
    elif modifier == "source": bad["extraction"]["actions"][0]["citations"][0]["evidenceId"] = "E8"
    elif modifier == "mechanism": bad["extraction"]["actions"][0]["mechanism"] = "task_recharge"
    elif modifier == "blocking": bad["extraction"]["unknowns"][0]["priority"] = "blocking"
    else: bad["routeIds"] = ["MODEL_INVENTED_ROUTE"]
    reject(lambda data: check_complete(loan_request, data), bad)
for mechanism in ("none", "ordinary_work_expense"):
    bad = copy.deepcopy(loan_response)
    bad["extraction"]["actions"][0]["mechanism"] = mechanism
    reject(lambda data: check_complete(loan_request, data), bad)
for mechanism in ("none", "ordinary_work_expense"):
    bad = copy.deepcopy(loan_response)
    bad["extraction"]["actions"] = [bad["extraction"]["actions"][1]]
    bad["extraction"]["actions"][0]["mechanism"] = mechanism
    bad["extraction"]["comparisons"] = []
    bad["guidance"] = "no_personal_financial_request_identified"
    reject(lambda data: check_complete(loan_request, data), bad)
company_request = load("examples/request-company-en.json")
company_response = load("examples/response-company-en.json")
for mechanism in ("none", "ordinary_work_expense"):
    bad = copy.deepcopy(company_response)
    bad["extraction"]["actions"][2]["mechanism"] = mechanism
    reject(lambda data: check_complete(company_request, data), bad)
bad = load("examples/response-timeout.json"); bad["extraction"] = loan_response["extraction"]
reject(response_check.validate, bad)
bad = load("examples/transport-error-invalid-input.json"); bad["requestId"] = "fake_identity"
reject(transport_check.validate, bad)

manifest = load("docs/project-manifest.json")
require(manifest["versions"]["documentation"] == "2.2" and manifest["versions"]["publicContract"] == "2.0.0", "Baseline version drift")
require(manifest["versions"]["knowledgeLibrary"] == library["libraryVersion"], "Manifest/library drift")
for value in manifest["authoritativeArtifacts"].values():
    for path in value if isinstance(value, list) else [value]:
        require((ROOT / path).is_file(), "Missing authority: " + path)
task_map = load("docs/work-packages.json")
require(task_map["documentationBaseline"] == manifest["versions"]["documentation"], "Task/documentation baseline drift")
require(task_map["contractVersion"] == manifest["versions"]["publicContract"], "Task/public contract drift")
require(task_map["coordinationRevision"] == manifest["coordinationRevision"], "Task/coordination drift")
packages = task_map["packages"]
package_ids = {p["id"] for p in packages}
require(package_ids == {f"WP{i:02}" for i in range(1,16)}, "Package inventory")
roles = set(manifest["roles"])
visited = set(); visiting = set()


def visit(package_id):
    require(package_id not in visiting, "Dependency cycle")
    if package_id in visited: return
    visiting.add(package_id)
    package = next(p for p in packages if p["id"] == package_id)
    require(package["ownerRole"] in roles and package["reviewerRole"] in roles, "Unknown role")
    require(package["ownerRole"] != package["reviewerRole"], "Self-review package")
    for dependency in package["dependencies"]:
        require(dependency in package_ids, "Unknown dependency")
        visit(dependency)
    visiting.remove(package_id); visited.add(package_id)


for package_id in package_ids: visit(package_id)

# Standing approval changes startup, not contracts or observed acceptance.
grant = load("docs/work-packages.json")["startupGrant"]
assignments = load("docs/work-packages.json")["startupAssignments"]
require(grant["id"] == "TEAM-START-2026-10-10", "Standing approval reference")
require({a["ownerRole"] for a in assignments} == roles and len(assignments) == len(roles), "One startup assignment per profession")
require(manifest["coordinationRevision"] == "team-2026-10-11", "Startup coordination drift")
require(manifest["sourceAuthority"]["agreedBaseCommit"] == grant["baseAnchorCommit"], "Startup anchor drift")
for assignment in assignments:
    role = assignment["ownerRole"]
    require(assignment["id"] == "START-" + role and assignment["approvalReference"] == grant["id"], "Startup assignment/grant mismatch")
    require(assignment["authorization"] == "preapproved_existing_scope", "Startup not approved")
    require(set(assignment["authorizedOwnerPackages"]) == {p["id"] for p in packages if p["ownerRole"] == role}, "Startup package ownership drift")
    require(assignment["initialPackage"] in assignment["authorizedOwnerPackages"], "Startup initial package owner")
    require(assignment["firstActions"] and assignment["firstDeliverables"], "Missing startup action/output")
    require(assignment["reservedPublicPaths"] == manifest["fileOwnership"][role], "Standing public reservation drift")
    require(assignment["reservedPrivatePaths"] == manifest["privateWorkingPaths"][role], "Standing private reservation drift")
    require(assignment["issueUrl"] is None or assignment["issueUrl"].startswith("https://github.com/andershua2022/OfferAnchor/issues/"), "Unexpected role task route")
    guide = (ROOT / "resources" / (role + ".md")).read_text(encoding="utf-8-sig")
    require(assignment["id"] in guide and grant["id"] in guide, "Role missing preapproved startup")
    require("<actual shared grant" not in guide and "exclusive grant is missing" not in guide, "Role retained blocking grant placeholder")
for support in grant["supportingWork"]:
    role = support["ownerRole"]
    require(role in roles, "Unknown support owner")
    allowed = manifest["fileOwnership"][role] + manifest["privateWorkingPaths"][role]
    require(all(path in allowed for path in support["paths"]), "Support path outside owner scope")

for path in (ROOT / "evals/student").glob("*.csv"):
    with path.open(encoding="utf-8", newline="") as stream:
        rows = list(csv.reader(stream))
    require(rows and len(rows[0]) == len(set(rows[0])), "Missing or duplicate CSV headers")
    if path.name.endswith("-template.csv"):
        require(len(rows) == 1, "Template has observations")
    require(all(len(row) == len(rows[0]) for row in rows[1:]), "CSV row width: " + path.name)
    definitions = (ROOT / "evals/student/README.md").read_text(encoding="utf-8")
    require(all(name in definitions for name in rows[0]), "Undefined CSV column")

# This verifies local targets/headings; external page availability is a separate research record.
link_count = 0; anchor_count = 0
markdown = list(ROOT.glob("*.md"))
for directory in ("docs", "resources", "examples", "knowledge", "evals/student", "lib/reliability", "tests", "tools", ".github"):
    markdown.extend((ROOT / directory).glob("*.md"))


def heading_slugs(text):
    result = set(); counts = {}
    for heading in re.findall(r"^#{1,6}\s+(.+)$", text, re.M):
        plain = re.sub(r"[`*_]", "", heading).lower()
        slug = re.sub(r"[^\w\s-]", "", plain).replace(" ", "-")
        number = counts.get(slug, 0); counts[slug] = number + 1
        result.add(slug if not number else f"{slug}-{number}")
    result.update(re.findall(r'<a\s+id=["\']([^"\']+)["\']', text))
    return result


source_exceptions = manifest.get("preservedSourceArtifacts", {})
for relative, expected_hash in source_exceptions.items():
    require(hashlib.sha256((ROOT / relative).read_bytes()).hexdigest() == expected_hash, "Preserved source bytes changed: " + relative)

for path in markdown:
    text = path.read_text(encoding="utf-8-sig")
    prose = re.sub(r"```[\s\S]*?```|`[^`]*`|\[[^\]\n]+\]\([^\n]*?\)", "", text)
    require(path.relative_to(ROOT).as_posix() in source_exceptions or not re.search(r"[\u3400-\u9fff]", prose), "Non-English doc prose: " + str(path.relative_to(ROOT)))
    require(not re.search(r"(?<!extract-)\bv2\.0\b|\b(?:extract-v1\.0|draft-0\.1\.0)\b", text), "Stale current version: " + str(path.relative_to(ROOT)))
    for raw_target in re.findall(r"\[[^\]\n]+\]\((<[^>]+>|[^)\n]+)\)", text):
        target = raw_target.strip().strip("<>")
        if re.match(r"^(?:https?://|mailto:|app://|tel:)", target): continue
        file_part, _, anchor = unquote(target).partition("#")
        linked = (path.parent / file_part).resolve() if file_part else path
        require(linked.exists(), "Broken link: " + str(path.relative_to(ROOT)) + " -> " + target)
        link_count += 1
        if anchor and linked.suffix == ".md":
            require(anchor in heading_slugs(linked.read_text(encoding="utf-8-sig")), "Broken anchor: " + target)
            anchor_count += 1

# Clones/worktrees use Git's actual ignore rules; source-only snapshots stay supported.
if (ROOT / ".git").exists():
    inventory = subprocess.run(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        cwd=ROOT, check=True, capture_output=True,
    ).stdout.decode("utf-8").split("\0")
    public = [ROOT / name for name in inventory if name and (ROOT / name).is_file()]
else:
    public = [p for p in ROOT.rglob("*") if p.is_file() and not any(part in (".git", ".local-data", ".playwright-mcp", "node_modules", "__pycache__") for part in p.relative_to(ROOT).parts)]
for path in public:
    relative = path.relative_to(ROOT).as_posix()
    require(path.name.isascii() or relative in source_exceptions, "Non-English filename")
    owners = [role for role, patterns in manifest["fileOwnership"].items()
              if any(fnmatch.fnmatchcase(relative, pattern) for pattern in patterns)]
    require(len(owners) == 1, "Missing/overlapping file owner: " + relative)
application_manifest_present = (ROOT / "package.json").is_file()
# A scaffold does not establish a working app; application checks remain separately owned by CS.
summary = {
    "baseline": "2.2", "contractVersion": "2.0.0", "schemasChecked": len(paths),
    "simulationRequestResponsePairs": len(fixtures["fixtures"]), "canonicalFixtureCitations": total_citations,
    "rawProviderFixture": 1, "boundFailureFixture": 1, "unboundFailureFixture": 1,
    "developmentInputRecords": len(cases), "provisionalDevelopmentBaseFamilies": len(base_ids),
    "controlInputRecords": len(controls), "provisionalControlBaseFamilies": len({c["baseCaseId"] for c in controls}),
    "draftCards": len(card_ids), "draftRoutes": len(route_ids), "localeKeyPairs": len(locale_maps["en-HK"]),
    "invalidArtifactMutationsRejected": rejected, "workPackagesChecked": len(package_ids),
    "startupAssignmentsChecked": len(assignments), "preapprovedOwnerPackages": sum(len(a["authorizedOwnerPackages"]) for a in assignments),
    "dependencyCycles": 0, "blankCsvTemplates": len(list((ROOT / "evals/student").glob("*-template.csv"))),
    "applicationManifestPresent": application_manifest_present,
    "singleOwnerPublicFiles": len(public), "ownershipGapsOrOverlaps": 0,
    "markdownFilesChecked": len(markdown), "localLinksChecked": link_count, "anchorsChecked": anchor_count,
    "brokenLocalLinks": 0, "englishProseAndFilenames": "passed",
    "limits": "Documentation/schema/authored fixture compatibility only. No app/controller/live-model/held-out/student/device/processor effectiveness result."
}
print(json.dumps(summary, indent=2))
