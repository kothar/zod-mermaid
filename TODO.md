# Project status

## Completed

- Template-literal pattern annotations.
- Safe Mermaid identifiers, collision handling, aliases, and annotation escaping.
- Required Mermaid parser checks for generated diagrams and all documented examples.
- Shared schema traversal with cycle detection and lazy-resolution caching.
- Object-array relationships and correct optional/nullable single-reference cardinality.
- Numeric and wrapped ID references, with placeholder deduplication.
- `includeOptional` filtering and custom metadata registries.
- Zod v4 primitives, collections, unions, intersections, template literals, files, and wrappers.
- Actual Zod v4 validation checks, including zero bounds and exclusive bounds.
- File minimum/maximum size annotations (in bytes), including zero bounds and MIME constraints.
- Separate typed schema parsing and diagram rendering; no production `any` casts.
- Consistent formatting and lint configuration.
- Function argument and return signatures (`Function<Arguments, Return>`).
- Original class property names displayed in escaped class notes.
- Nested discriminated unions retain intermediate unions and all leaf variants.
- ID references resolve by schema identity, including identically labelled targets.
- Per-target ER/class cardinalities for unions, tuples, nested collections, and ID references.
- Reproducible wide-schema, shared-graph, label-collision, and recursive-depth benchmarks.
- Real-browser SVG checks for ER/class/flowchart layout, escaping, recursion, unions, and refs.

Arbitrary transforms and custom refinements cannot be inferred through static inspection;
the generator intentionally does not execute user parsing callbacks.
