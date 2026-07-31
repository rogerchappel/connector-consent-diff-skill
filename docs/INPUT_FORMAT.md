# Input Format

The CLI accepts a JSON object with one of these top-level arrays:

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
Each array item must be a JSON object. A missing supported key, a non-array
collection, or a non-object item is a validation error; the CLI prints the
invalid key or indexed path and exits with status 1.

Evidence paths retain the source collection name, such as `permissions[0]` or
`tools[2]`. Changed entries in Markdown show both the before and after values
and evidence paths.

When `id` and `name` are absent, the parser derives an ID from the category,
action, and target. IDs do not have to be unique: repeated entries with the same
explicit or derived ID are preserved and compared in their manifest order.
