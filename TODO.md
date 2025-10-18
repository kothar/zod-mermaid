## TODO: Align ERD generation with Zod v4 and expand feature coverage

### High-priority fixes (correctness and stability)
- **Replace brittle `.def` string/type checks**: Use Zod v4 classes (`instanceof`) and safe access to `._def` where needed. Eliminate assumptions like `schema.def.type === 'object'` and constructor-name checks.
- **Centralize unwrapping**: Implement a single `unwrapAll` utility to peel `ZodOptional`, `ZodDefault`, `ZodNullable`, `ZodEffects` (to inner `.schema`), and resolve `ZodLazy` using its getter with a cycle guard. Return flags for `isOptional` and `isNullable`.
- **Correct array/record access**: Use `ZodArray._def.type` for element type; `ZodRecord._def.keyType/valueType` for records.
- **Fix discriminated unions**: Use `z.ZodDiscriminatedUnion`. Extract discriminator key and values from `ZodLiteral._def.value` or enum values; stop reading `.values[0]` or internal shapes directly.
- **Fix enums**: `ZodEnum._def.values` (string[]); `ZodNativeEnum` via `Object.values(nativeEnum)`.
- **Effects/preprocess/transform**: Handle `ZodEffects` by peeling to `_def.schema` until reaching a base schema. Preserve validations when possible.

### Validation extraction (map Zod v4 checks)
- **Strings (`ZodString`)**: Iterate `(schema as any)._def.checks` and map:
  - `min` → `min: <value>`
  - `max` → `max: <value>`
  - `email`, `uuid`, `url` → same label
  - `regex` → `regex`
- **Numbers (`ZodNumber`)**: Map checks into readable labels:
  - `int`, `finite`, `positive`, `nonnegative`, `negative`, `nonpositive`
  - `min`/`max` with `inclusive` nuance (e.g., `min: 3` vs `> 3` if exclusive)
- **Literals (`ZodLiteral`)**: Emit `literal: <value>`
- **Enums**: Emit `enum: a, b, c`
- **Nullable**: Add `nullable` to validations when field is nullable.

### Type coverage and rendering (TypeScript-like strings)
- Add readable rendering for:
  - `bigint`, `symbol`, `null`, `undefined`, `any`, `unknown`, `never`
  - `tuple` (e.g., `Tuple<string, number>`)
  - `map` → `Map<K, V>`
  - `set` → `Set<T>`
  - `function` → `Function`
  - `promise` → `Promise<T>`
  - `intersection` → `A & B`
  - `union (non-discriminated)` → `A | B`
  - `keyof` → `keyof T`

### Entities and relationships
- **Arrays of objects**: When a field is `ZodArray<ZodObject>`, parse the element object into its own entity and generate a one-to-many relationship.
- **Embedded objects**: For direct object fields, generate composition-like relationships in ER/class diagrams.
- **ID references**: Keep `string` type but include `ref: Entity` validation. Generate relationships:
  - Single ID → many-to-one from holder to referenced entity.
  - Array of IDs → one-to-many (not many-to-many unless a join entity exists).
- **Self-references**: Support arrays or direct fields referencing the same entity (e.g., `parent`, `children`).

### Mermaid ERD cardinality mapping (standardize)
- Use consistent markers:
  - one-to-one (required both sides): `||--||`
  - zero-or-one to one: `o|--||`
  - one-to-many: `||--|{`
  - zero-or-many: `||--o{` (or `o|--o{` if the left side is optional)
- Apply to both embedded object relations and ID references. For arrays on the right side, prefer `|{` or `o{`.

### Naming, uniqueness, and descriptions
- **Entity naming** (priority): `schema.description` → `schema._def.description`/`meta.name` → derived from field path → fallback `Entity` with index suffix for uniqueness.
- **Avoid collisions** across multiple top-level schemas by uniquifying names.
- **Descriptions**: Include entity and field descriptions (escaped) in diagrams. If ERD syntax lacks native description lines, append to validation strings.

### Styling support
- Apply `options.styling` by emitting Mermaid `classDef` and `style` lines for entities. Consider defaults and per-entity overrides in the future.

### Traversal, recursion, and deduplication
- Maintain a `visitedSchemas` WeakSet (or signature map) to prevent infinite recursion and duplicate entities, especially with `ZodLazy` and self-referential structures.
- Ensure each parsed object schema yields exactly one entity; reuse by name/signature when referenced multiple times.

### Error handling and fallbacks
- Use custom errors extending `ZodMermaidError` with context. Prefer soft warnings and graceful fallbacks (render type as `unknown` + note) over throwing for unsupported constructs.

### Internal utilities to add/refine
- `unwrapAll(schema)` returns `{ schema, isOptional, isNullable }` (and optionally `effectsSeen`).
- `getReadableType(schema, fieldName, entityName)` using `instanceof` checks and unwrapped schema.
- `extractValidations(schema)` that delegates to per-type helpers (string/number/enum/literal/etc.).
- `ensureUniqueEntityName(candidate, takenNames)`.

### Test coverage to add (Jest)
- Arrays of objects emit one-to-many edges in ERD and composition in class diagrams.
- Array of ID references → one-to-many edges; single ID → many-to-one.
- Discriminated unions: correct discriminator key, option entities exclude discriminator field, proper subtype edges with labels.
- Validations: string (min/max/email/uuid/url/regex) and number (min/max inclusive, int, positive) show up in ERD when `includeValidation` is on.
- Lazy self-references do not infinite-loop; entity naming is stable.
- Additional types (map/set/tuple/intersection/bigint) render to readable strings.
- Optional vs nullable: left-side cardinality reflects optional; `nullable` appears in validation list.
- Styling lines are emitted when `options.styling` is provided.
- Multiple top-level schemas do not collide in entity names.

### Migration checklist
- [ ] Replace all `.def` string comparisons with `instanceof` checks.
- [ ] Implement `unwrapAll` and refactor `isFieldOptional`, `getFieldType`, and `getFieldValidation` to use it.
- [ ] Rewrite validation extraction to iterate Zod v4 checks.
- [ ] Refactor array/object/record handling to use `._def` shapes.
- [ ] Rework discriminated union parsing to use `ZodDiscriminatedUnion` APIs.
- [ ] Normalize ERD cardinality generation with the standardized mapping.
- [ ] Introduce entity name deduplication and description propagation.
- [ ] Add cycle guard and entity dedup in traversal.
- [ ] Wire styling output into ERD/class/flowchart generators.
- [ ] Add/adjust tests per the list above and ensure 80%+ coverage.

### Notes and tiny reference snippets

Unwrap helper sketch:

```ts
function unwrapAll(schema: z.ZodTypeAny, seen = new Set()): {
  schema: z.ZodTypeAny;
  isOptional: boolean;
  isNullable: boolean;
} {
  let s = schema;
  let isOptional = false;
  let isNullable = false;
  for (;;) {
    if (s instanceof z.ZodOptional || s instanceof z.ZodDefault) {
      isOptional = true;
      s = (s as any)._def.innerType;
      continue;
    }
    if (s instanceof z.ZodNullable) {
      isNullable = true;
      s = (s as any)._def.innerType;
      continue;
    }
    if (s instanceof z.ZodEffects) {
      s = (s as any)._def.schema;
      continue;
    }
    if (s instanceof z.ZodLazy) {
      const next = (s as any)._def.getter();
      if (seen.has(next)) break;
      seen.add(next);
      s = next;
      continue;
    }
    break;
  }
  return { schema: s, isOptional, isNullable };
}
```

String validation extraction sketch:

```ts
function getStringValidations(str: z.ZodString): string[] {
  const out: string[] = [];
  for (const check of (str as any)._def.checks ?? []) {
    if (check.kind === 'min') out.push(`min: ${check.value}`);
    if (check.kind === 'max') out.push(`max: ${check.value}`);
    if (check.kind === 'email') out.push('email');
    if (check.kind === 'uuid') out.push('uuid');
    if (check.kind === 'url') out.push('url');
    if (check.kind === 'regex') out.push('regex');
  }
  return out;
}
```


