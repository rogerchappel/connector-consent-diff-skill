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
- `approval`, `approvalRequirement`, or `requiresApproval`

Approval fields accept non-empty strings. The `requiresApproval` alias also
accepts a boolean: `true` is normalized to `approval: "required"`, while
`false` is normalized to `approval: "not required"`. This preserves an explicit
no-approval requirement instead of treating it as missing or ambiguous.

Unknown fields are retained in the raw parsed capability for downstream review.
Each array item must be a JSON object. A missing supported key, a non-array
collection, or a non-object item is a validation error; the CLI prints the
invalid key or indexed path and exits with status 1.

Evidence paths retain the source collection name, such as `permissions[0]` or
`tools[2]`. Changed entries in Markdown show both the before and after values
and evidence paths.

When `id` and `name` are absent, the parser derives an ID from the category,
action, and target. IDs do not have to be unique: repeated entries with the same
explicit or derived ID are preserved. Within each repeated-ID group, identical
capabilities are matched by category, action, target, and approval regardless of
manifest order. Any remaining unmatched entries are paired in manifest order so
real changes retain their before and after evidence paths; surplus entries are
reported as additions or removals.
