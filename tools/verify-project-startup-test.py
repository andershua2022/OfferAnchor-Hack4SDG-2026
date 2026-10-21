"""Regression checks for the shared verifier during teammate development."""
from pathlib import Path
import csv
import json
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
TEMP_ROOT = ROOT / ".local-data" / "verification-tests"


class StartupVerifierTests(unittest.TestCase):
    def setUp(self):
        TEMP_ROOT.mkdir(parents=True, exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(prefix="startup-", dir=TEMP_ROOT)
        self.root = Path(self.temp.name).resolve()
        assert self.root.is_relative_to(TEMP_ROOT.resolve())
        files = subprocess.check_output(
            ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
            cwd=ROOT,
        ).decode("utf-8").split("\0")
        for name in filter(None, files):
            if (ROOT / name).is_file():
                target = self.root / name
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(ROOT / name, target)
        subprocess.run(["git", "init", "--quiet"], cwd=self.root, check=True)
        subprocess.run(["git", "add", "--", "."], cwd=self.root, check=True, capture_output=True)

    def tearDown(self):
        # This test created the entire temporary target under its private parent.
        assert self.root.is_relative_to(TEMP_ROOT.resolve())
        self.temp.cleanup()

    def write(self, relative, content):
        target = self.root / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content.encode("utf-8"))

    def verify(self):
        return subprocess.run(
            ["python", "-B", "-X", "utf8", "tools/verify-project.py", "."],
            cwd=self.root, capture_output=True, text=True, encoding="utf-8",
        )

    def test_scaffold_and_ignored_artifacts_do_not_become_public_source(self):
        self.write("package.json", '{"name":"fictional-verifier-scaffold","private":true}\n')
        for name in (".next/BUILD_ID", ".next/server/app/page.js", "node_modules/fake/index.js",
                     "tsconfig.tsbuildinfo", ".env.local", "playwright-report/index.html",
                     "data/private/student-scores/fictional.txt", "data/raw/fictional.txt",
                     ".local-data/nonsecret-fixture.txt"):
            self.write(name, "fictional verifier test artifact; no credential or participant\n")
        result = self.verify()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(json.loads(result.stdout)["applicationManifestPresent"])

    def test_populated_development_csv_is_allowed_separately_from_blank_templates(self):
        template = self.root / "evals/student/annotation-template.csv"
        with template.open(encoding="utf-8", newline="") as stream:
            header = next(csv.reader(stream))
        with (self.root / "evals/student/development-annotations.csv").open("w", encoding="utf-8", newline="") as stream:
            writer = csv.writer(stream)
            writer.writerow(header)
            writer.writerow(["fictional-authored-test-row"] + [""] * (len(header) - 1))
        result = self.verify()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)["blankCsvTemplates"], 4)

    def test_unowned_new_public_source_is_still_rejected(self):
        self.write("unowned-startup-file.txt", "fictional unowned source\n")
        result = self.verify()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Missing/overlapping file owner", result.stderr)

    def test_populating_a_blank_template_is_still_rejected(self):
        template = self.root / "evals/student/annotation-template.csv"
        with template.open(encoding="utf-8", newline="") as stream:
            header = next(csv.reader(stream))
        with template.open("a", encoding="utf-8", newline="") as stream:
            csv.writer(stream).writerow([""] * len(header))
        result = self.verify()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Template has observations", result.stderr)

    def test_malformed_development_csv_row_is_rejected(self):
        header = (self.root / "evals/student/annotation-template.csv").read_text(encoding="utf-8").splitlines()[0]
        self.write("evals/student/development-annotations.csv", header + "\nonly-one-cell\n")
        result = self.verify()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("CSV row width", result.stderr)


if __name__ == "__main__":
    unittest.main()
