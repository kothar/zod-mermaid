## Quick Wins Completed ✅

### Recent Improvements (Latest Session)
- [x] Fixed all linting errors (9 errors, 3 warnings → 0)
- [x] Enhanced public API exports (SchemaEntity, SchemaField, getEntityName)
- [x] Comprehensive JSDoc for internal helper functions
- [x] Removed unused styling feature from API
- [x] Established GitHub Actions CI/CD workflow with multi-version testing

---

## TODO: Align ERD generation with Zod v4 and expand feature coverage

### Quick-Win Future Improvements (Prioritized)

#### Low-Effort Improvements (1-2 hours each)
- [ ] **Enhanced Validations**: Map all Zod v4 validation types to readable labels, add `nullable` indicator in validations, support regex validation rendering
- [ ] **Performance Optimization**: Add entity name deduplication, implement cycle guard for recursive schemas, cache expensive schema introspections

#### Medium-Effort Improvements (2-4 hours each)
- [ ] **Refactor Schema Parsing**: Replace `.def.type` string checks with `instanceof` checks, implement centralized `unwrapAll` utility, better handling of Zod v4 features
- [ ] **Expand Type Coverage**: Support `bigint`, `symbol`, `null`, `undefined`, `tuple`, `map`, `set`, `promise`, intersection and non-discriminated unions

#### High-Effort Improvements (4+ hours each)
- [ ] **Feature Completeness**: Array of objects → one-to-many relationships, styling support with Mermaid `classDef`, multiple schema relationship inference, description propagation to diagrams

---

## Items Already Implemented ✅

### High-priority fixes (correctness and stability)
- [x] **Styling support**: Styling options were removed from API. Not implemented in diagram generation. If needed in future, can be added with Mermaid `classDef` and `style` lines.
- [x] **Access pattern**: Using `.def.type` consistently (not `._def`) - matches Zod v4 public API
- [x] **Unwrapping**: Using proper `.unwrap()` methods on ZodOptional, ZodNullable, ZodDefault, ZodLazy schemas
- [x] **Effects/pipe handling**: ZodEffects with 'pipe' type properly handled - accesses `.out` property for output schema
- [x] **Error handling**: Custom error classes (SchemaParseError, DiagramGenerationError) properly extend ZodMermaidError

### Type coverage and rendering (TypeScript-like strings)
- [x] **Basic types**: `string`, `number`, `boolean`, `date` - fully supported
- [x] **Array types**: `T[]` syntax - fully supported with recursive handling
- [x] **Record types**: `Record<K, V>` syntax - fully supported
- [x] **Object types**: Nested object handling with entity generation
- [x] **Enum types**: Handled with proper rendering
- [x] **Literal types**: Type inference from literal values
- [x] **Union types**: Discriminated unions fully supported; non-discriminated returns union string (e.g., `string | number`)
- [x] **Lazy types**: Self-referential schemas resolved correctly
- [x] **Additional types**: `bigint`, `symbol`, `null`, `undefined`, `tuple`, `map`, `set`, `promise`, `intersection` - fully supported
- [ ] **Missing types**: `keyof` (not yet implemented)

### Validation extraction (map Zod v4 checks)
- [x] **String validations**: `min`, `max`, `email`, `uuid`, `url` - implemented
- [x] **Number validations**: `min`, `max`, `positive` - implemented via minValue/maxValue properties
- [x] **Literal validations**: Emitted as `literal: <value>`
- [x] **Enum validations**: Emitted as `enum: a, b, c`
- [x] **ID reference validation**: Shows as `ref: EntityName` in diagrams
- [ ] **Missing**: regex validation labels, number type variants (int, finite, nonnegative, negative, nonpositive), nullable indicator in validation list

### Entities and relationships
- [x] **Embedded objects**: Direct object fields generate composition-like relationships
- [x] **ID references**: Keep string type with `ref: Entity` validation, generate appropriate relationships
- [x] **Self-references**: Arrays referencing same entity type handled
- [x] **Discriminated unions**: Full support with proper subtype relationships
- [ ] **Missing**: Arrays of objects → one-to-many (currently treats as array type, not separate entity)

### Mermaid ERD cardinality mapping
- [x] **One-to-one**: `||--||` for required relationships
- [x] **Zero-or-many**: `||--o{` for optional relationships
- [x] **ID reference cardinality**: Proper `}o--||` for single, `}o--o{` for array
- [x] **Self-referential**: Correct cardinality applied
- [ ] **Complete standardization**: Verify all edge cases use consistent markers

### Naming, uniqueness, and descriptions
- [x] **Entity naming**: Priority chain - schema.description → field-derived names
- [x] **Descriptions on objects**: Using descriptions in field type names
- [ ] **Avoid collisions**: Minimal logic for multiple top-level schemas (not uniquified with suffixes)
- [ ] **Description propagation**: Field descriptions exist in SchemaField type but are not extracted from schemas or displayed in diagrams

### Traversal, recursion, and deduplication
- [x] **Lazy handling**: `try/catch` prevents infinite loops
- [x] **Basic recursion**: Schema traversal works correctly
- [ ] **WeakSet deduplication**: No visitedSchemas tracking (relies on Zod's lazy resolution)
- [ ] **Duplicate entity prevention**: No signature-based deduplication across multiple schema definitions

### Error handling and fallbacks
- [x] **Custom error classes**: ZodMermaidError base class with specialized subclasses
- [x] **Graceful parsing**: Unsupported types return 'unknown' instead of throwing
- [ ] **Soft warnings**: No logging for unsupported constructs (silent fallback)

### Internal utilities to add/refine
- [ ] `unwrapAll(schema)` utility - not implemented, unwrapping done inline
- [ ] `getReadableType(schema, fieldName, entityName)` - not implemented, type resolution mixed into getFieldType
- [ ] `extractValidations(schema)` - not extracted, validation logic inline in getFieldValidation
- [ ] `ensureUniqueEntityName(candidate, takenNames)` - not implemented

---

## Reference Implementation Snippets

These code examples from the original TODO are preserved for future implementation of refactored utilities.

### Unwrap helper (for future `unwrapAll` utility refactoring)

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

### String validation extraction (for future `extractValidations` helper)

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

## Test Coverage to Add (Jest)

- [ ] Arrays of objects emit one-to-many edges in ERD and composition in class diagrams
- [x] Array of ID references → one-to-many edges; single ID → many-to-one (implemented with `}o--o{` and `}o--||` cardinality)
- [x] Discriminated unions: correct discriminator key, option entities exclude discriminator field, proper subtype edges (fully implemented)
- [x] Validations render correctly for string (min/max/email/uuid/url) and number types (min/max/positive) - regex validation not yet extracted
- [x] Lazy self-references don't infinite-loop; entity naming remains stable (handled with try/catch)
- [x] Additional types (map/set/tuple/intersection/bigint/symbol/null/undefined/promise) render to readable strings (all implemented)
- [x] Optional vs nullable: cardinality reflects optional (implemented with `||--o{` for optional relationships)
- [ ] Optional vs nullable: `nullable` indicator not yet shown in validation list
- [ ] Multiple top-level schemas don't collide in entity names


