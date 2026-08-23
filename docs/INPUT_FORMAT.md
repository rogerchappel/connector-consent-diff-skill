# Input Format

The CLI accepts a JSON object with exactly one of these top-level arrays:

- `capabilities`
- `permissions`
- `tools`

These collection keys are mutually exclusive. A manifest containing two or
more of them is rejected, even when the extra collections are empty. The error
names every conflicting key so the producer can select the intended format.

Each item can include:

- `id` or `name`
- `category` or `type`
- `action`, `verb`, or `operation`
- `target`, `resource`, `scope`, or `description`
- `approval`, `approvalRequirement`, or `requiresApproval`

Every present identity, category, action, and target field must be a non-empty
string after trimming whitespace. Blank, whitespace-only, and non-string values
are rejected instead of being replaced by a generated ID,
inferred category, default action or target, or unspecified approval.

Approval fields accept non-empty strings. The `requiresApproval` alias also
accepts a boolean: `true` is normalized to `approval: "required"`, while
`false` is normalized to `approval: "not required"`. This preserves an explicit
no-approval requirement instead of treating it as missing or ambiguous.

For directional risk classification, the case-insensitive strings `required`,
`true`, `yes`, and `always` are treated as requiring approval. The strings
`not required`, `false`, `no`, `never`, and `none` are treated as not requiring
approval. Changing from the first group to the second is high risk; changing in
the opposite direction remains low risk. Other non-empty strings are preserved
for display but are not interpreted directionally.

When an item contains multiple approval aliases, all must have the same
normalized meaning. Redundant equivalents such as `approval: "required"` and
`requiresApproval: true` are accepted. Conflicts such as `approval: "required"`
and `requiresApproval: false` are rejected with the conflicting field path.

Unknown fields are retained in the raw parsed capability for downstream review.

## Category normalization

An explicit `category` or `type` is normalized only when its complete value matches a supported category, ignoring case. The supported values are `filesystem`, `network`, `messaging`, `browser`, `shell`, `database`, and `secrets`; `file-system`, `file_system`, and `file system` are accepted compound spellings of `filesystem`. Other values become `unknown`, so words such as `shellfish`, `databaseProxy`, and `networking` are not silently reclassified.

When no category is supplied, the parser infers one from `action` and `target` using complete lowercase alphanumeric tokens separated by punctuation or whitespace. For example, `run shell-command` infers `shell` and `read file-system` infers `filesystem`, while `inspect shellfish` remains `unknown`.
Each array item must be a JSON object. A missing supported key, multiple
supported keys, a non-array collection, or a non-object item is a validation
error; the CLI prints the conflicting keys, invalid key, or indexed path and
exits with status 1 without emitting a diff. Field validation errors
identify the exact collection index and field, such as `tools[1].action`, and
the CLI does not emit a diff.

Evidence paths retain the source collection name, such as `permissions[0]` or
`tools[2]`. Changed entries in Markdown show both the before and after values
and evidence paths.

Markdown reports escape field values before placing them in headings and list
items. Markdown punctuation is backslash-escaped, and control characters are
shown with visible escapes such as `\n`, `\r`, `\t`, or `\u0000`. A manifest
value therefore remains within its labeled report field instead of creating a
new heading, list item, or summary-like line. JSON reports are unchanged and
preserve the original parsed strings as JSON data.

When `id` and `name` are absent, the parser derives an ID from the category,
action, and target. IDs do not have to be unique: repeated entries with the same
explicit or derived ID are preserved. Within each repeated-ID group, identical
capabilities are matched by category, action, target, and approval regardless of
manifest order. Any remaining unmatched entries are paired in manifest order so
real changes retain their before and after evidence paths; surplus entries are
reported as additions or removals.
