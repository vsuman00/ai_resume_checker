# Test Fixture Catalog

Only synthetic or irreversibly anonymized documents may be committed. Fixtures
must not contain real candidate PII, credentials, or confidential job data.

| Fixture                      | Provenance                                        | Expected use                                         | PII classification |
| ---------------------------- | ------------------------------------------------- | ---------------------------------------------------- | ------------------ |
| `scripts/dummy.pdf`          | Synthetic minimal PDF created for this repository | Browser upload and safe API error paths              | None               |
| `parsing/t051-labeled.json`  | Fully synthetic text labels                       | Parser precision/recall benchmark                    | None               |
| `matching/t052-labeled.json` | Fully synthetic skill/JD labels                   | Matching-quality and deterministic-scoring benchmark | None               |
| `phase5-manifest.json`       | Repository-authored manifest                      | Provenance and permitted-use record                  | None               |

Add each new fixture here with its origin, expected parser/scoring outcome, and
PII classification before using it in automated tests.
