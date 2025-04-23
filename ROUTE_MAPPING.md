# Route File Mapping

This document provides a mapping between the old and new route file structure to help with the transition.

## Old to New Route File Mapping

| Old Route File | New Route File | Notes |
|----------------|---------------|-------|
| `visualization.js` | `visualizations.js` | Merged into a single file with clear sections |
| `visualizations.js` | `visualizations.js` | Now contains all visualization-related functionality |
| `pdf.js` | `pdf-legacy.js` | Original implementation preserved for backward compatibility |
| `pdf-steps.js` | `pdf.js` | Step-based implementation is now the primary one |
| `appraisal.js` | Removed | Routes were already moved to other files |
| `description.js` | `description.js` | Unchanged |
| `utility.js` | `utility.js` | Unchanged |
| `report.js` | `report.js` | Unchanged |
| `html.js` | `html.js` | Unchanged |

## Route Path Changes

All routes have been reorganized under a clearer API structure:

| Old Route Path | New Route Path | Notes |
|----------------|---------------|-------|
| `/generate-visualizations` | `/api/visualizations/generate-visualizations` | Moved to domain-specific path |
| `/regenerate-statistics-and-visualizations` | `/api/visualizations/regenerate-statistics-and-visualizations` | Moved to domain-specific path |
| `/enhance-description` | `/api/description/enhance-description` | Moved to domain-specific path |
| `/generate-pdf` | `/api/pdf/generate-pdf` | Now uses step-based implementation |
| `/api/pdf/generate-pdf-steps` | `/api/pdf/generate-pdf-steps` | Unchanged |
| (Various utility routes) | `/api/utility/...` | Moved to domain-specific paths |
| (Various report routes) | `/api/report/...` | Moved to domain-specific paths |

## Legacy Compatibility

For backward compatibility, the following legacy routes are still supported:

- Direct routes from the report router (`/` prefix)
- Direct routes from the utility router (`/` prefix)

However, new client implementations should use the structured API paths. 