# Input Format

The CLI accepts JSON files with one of these top-level arrays:

- `capabilities`
- `permissions`
- `tools`

Each item can include:

- `id` or `name`
- `category` or `type`
- `action`, `verb`, or `operation`
- `target`, `resource`, `scope`, or `description`
- `approval` or `approvalRequirement`

Unknown fields are retained in the raw parsed capability for downstream review.
