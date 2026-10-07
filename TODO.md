# Project status

## Completed

- Safe Mermaid identifiers, collision handling, aliases, and annotation escaping.
- Required Mermaid parser checks for generated diagrams and all documented examples.
- Shared schema traversal with cycle detection and lazy-resolution caching.
- Object-array relationships and correct optional/nullable single-reference cardinality.
- Numeric and wrapped ID references, with placeholder deduplication.
- `includeOptional` filtering and custom metadata registries.
- Zod v4 primitives, collections, unions, intersections, template literals, files, and wrappers.
- Actual Zod v4 validation checks, including zero bounds and exclusive bounds.
- File minimum/maximum size annotations (in bytes), including zero bounds.
- Separate typed schema parsing and diagram rendering; no production `any` casts.
- Consistent formatting and lint configuration.

## Follow-up opportunities

- Render template-literal patterns in addition to their string type.
- Render function argument and return types.
- Render file MIME-type constraints; file size bounds are already supported.
- Support nested discriminated-union variants.
- Per-target cardinalities for mixed unions and nested collections.
- Resolve ID references by schema identity, including identically labelled targets.
- Preserve original class property names through Mermaid-compatible display annotations.
- Add SVG/browser rendering checks alongside parser tests.
- Benchmark very large schemas and deeply nested recursive collections.

Arbitrary transforms and custom refinements cannot be inferred through static inspection;
the generator intentionally does not execute user parsing callbacks.
