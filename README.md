# Zod Mermaid

[![CI](https://github.com/kothar/zod-mermaid/actions/workflows/ci.yml/badge.svg)](https://github.com/kothar/zod-mermaid/actions/workflows/ci.yml)

A TypeScript library that generates Mermaid diagrams from Zod schemas. Create beautiful Entity-Relationship, Class, and Flowchart diagrams from your Zod schema definitions.

## Features

- **Multiple Diagram Types**: Generate ER, Class, and Flowchart diagrams
- **Nested Object Support**: Automatically creates separate entities for nested objects
- **Discriminated Union Support**: Handles complex union types with separate entities for each variant
- **Self-Referential Types**: Handles recursive schemas with lazy types
- **ID References**: Create relationships between entities using ID references with proper cardinality
- **Validation Display**: Shows field constraints and validation rules
- **Zod v4 Types**: Collections, unions, intersections, wrappers, template literals, files, and primitives
- **Safe Names**: Unique Mermaid identifiers with escaped labels and annotations
- **Custom Entity Names**: Specify custom names for top-level entities
- **Optional Field Handling**: Properly represents optional fields and relationships

## AI-Generated Code

This repository was primarily generated using AI (Claude Sonnet). 
Human review was applied to ensure correctness and relevance.
Contributions welcome!

## Installation

```bash
npm install zod-mermaid
```

## Quick Start

```typescript
import { z } from 'zod';
import { generateMermaidDiagram, idRef } from 'zod-mermaid';

const UserSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(100),
  email: z.email(),
  age: z.number().min(0).max(120),
  profile: z.object({
    bio: z.string().optional(),
    avatar: z.url().optional(),
  }),
});

// Generate different diagram types
const erDiagram = generateMermaidDiagram(UserSchema, { 
  diagramType: 'er', 
  entityName: 'User' 
});

const classDiagram = generateMermaidDiagram(UserSchema, { 
  diagramType: 'class', 
  entityName: 'User' 
});

const flowchartDiagram = generateMermaidDiagram(UserSchema, { 
  diagramType: 'flowchart', 
  entityName: 'User' 
});
```

### Multiple Schemas

You can also generate diagrams from multiple schemas at once by passing an array:

```typescript
const UserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
}).describe('User');

const ProductSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  price: z.number().positive(),
  category: z.enum(['electronics', 'clothing', 'books']),
}).describe('Product');

const OrderSchema = z.object({
  id: z.uuid(),
  customerId: idRef(UserSchema),
  productId: idRef(ProductSchema),
  quantity: z.number().positive(),
  orderDate: z.date(),
}).describe('Order');

// Generate diagram from multiple schemas
const diagram = generateMermaidDiagram([UserSchema, ProductSchema, OrderSchema], { 
  diagramType: 'er' 
});
```

This will generate a single diagram containing all entities and their relationships from all the provided schemas.

## Diagram Types

### Entity-Relationship Diagrams

Shows entities, their attributes, and relationships with validation constraints.

<!-- SCHEMA: product START -->
```typescript
const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().positive(),
  category: z.enum(['electronics', 'clothing', 'books']),
  metadata: z.record(z.string(), z.unknown()),
}).describe('Product');

const diagram = generateMermaidDiagram(ProductSchema, { 
  diagramType: 'er', 
  entityName: 'Product' 
});
```
<!-- SCHEMA: product END -->

<!-- DIAGRAM: product-er START -->
**Output:**
```mermaid
erDiagram
    Product {
        string id
        string name
        number price "positive"
        string category "enum: electronics, clothing, books"
        Record metadata "&lt;string, unknown&gt;"
    }
```
<!-- DIAGRAM: product-er END -->

### Class Diagrams

Displays classes with their properties and associations.

```typescript
const diagram = generateMermaidDiagram(UserSchema, { 
  diagramType: 'class', 
  entityName: 'User' 
});
```

<!-- DIAGRAM: user-class START -->
**Output:**
```mermaid
classDiagram
    class User {
        +id: string
        +name: string
        +email: string
        +age: number
        +profile: Profile
    }
    class Profile {
        +bio: string
        +avatar: string
    }
    User *-- Profile : profile
```
<!-- DIAGRAM: user-class END -->

### Flowchart Diagrams

Shows hierarchical structure with field details and entity connections.

```typescript
const diagram = generateMermaidDiagram(UserSchema, { 
  diagramType: 'flowchart', 
  entityName: 'User' 
});
```

<!-- DIAGRAM: user-flowchart START -->
**Output:**
```mermaid
flowchart TD
    User["User"]
    User_id["id: string"]
    User --> User_id
    User_name["name: string"]
    User --> User_name
    User_email["email: string"]
    User --> User_email
    User_age["age: number"]
    User --> User_age
    User_profile["profile: Profile"]
    User --> User_profile
    User_profile --> Profile
    Profile["Profile"]
    Profile_bio["bio: string"]
    Profile --> Profile_bio
    Profile_avatar["avatar: string"]
    Profile --> Profile_avatar
```
<!-- DIAGRAM: user-flowchart END -->

## Advanced Features

### Self-Referential Schemas

Handle recursive data structures like directory listings:

<!-- SCHEMA: directory START -->
```typescript
const DirectorySchema = z.object({
  name: z.string(),
  path: z.string(),
  isDirectory: z.boolean(),
  children: z.array(z.lazy(() => DirectorySchema)).optional(),
});

const diagram = generateMermaidDiagram(DirectorySchema, { 
  diagramType: 'er', 
  entityName: 'Directory' 
});
```
<!-- SCHEMA: directory END -->

<!-- DIAGRAM: directory-er START -->
**Output:**
```mermaid
erDiagram
    Directory {
        string name
        string path
        boolean isDirectory
        Directory[] children
    }
    Directory ||--o{ Directory : "children"
```
<!-- DIAGRAM: directory-er END -->

### Nested Object Relationships

Automatically creates separate entities for nested objects:

<!-- SCHEMA: nested-user START -->
```typescript
const UserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  profile: z.object({
    bio: z.string(),
    preferences: z.object({
      theme: z.enum(['light', 'dark']),
      notifications: z.boolean(),
    }),
  }),
});
```
<!-- SCHEMA: nested-user END -->

<!-- DIAGRAM: nested-user-er START -->
**Output:**
```mermaid
erDiagram
    User {
        string id "uuid"
        string name
        Profile profile
    }
    Profile {
        string bio
        Preferences preferences
    }
    Preferences {
        string theme "enum: light, dark"
        boolean notifications
    }
    User ||--|| Profile : "profile"
    Profile ||--|| Preferences : "preferences"
```
<!-- DIAGRAM: nested-user-er END -->

### Discriminated Unions

Handle complex event systems and API responses with discriminated unions:

<!-- SCHEMA: event START -->
```typescript
const ProductEventPayloadSchema = z.discriminatedUnion('eventType', [
  z.object({
    eventType: z.literal('addProduct'),
    id: z.uuid(),
    name: z.string(),
    description: z.string(),
    location: z.string(),
  }).describe('AddProductEvent'),
  z.object({
    eventType: z.literal('removeProduct'),
    id: z.uuid(),
  }).describe('RemoveProductEvent'),
  z.object({
    eventType: z.literal('updateProduct'),
    id: z.uuid(),
    name: z.string(),
    description: z.string(),
    location: z.string(),
  }).describe('UpdateProductEvent'),
]).describe('ProductEventPayload');

const EventSchema = z.object({
  id: z.string(),
  type: z.literal('com.example.event.product'),
  date: z.date(),
  data: ProductEventPayloadSchema,
}).describe('Event');
```
<!-- SCHEMA: event END -->

<!-- DIAGRAM: event-er START -->
**ER Diagram Output:**
```mermaid
erDiagram
    Event {
        string id
        string type "literal: com.example.event.product"
        date date
        ProductEventPayload data "ProductEventPayload"
    }
    ProductEventPayload {
        string eventType "enum: addProduct, removeProduct, updateProduct"
    }
    AddProductEvent {
        string id "uuid"
        string name
        string description
        string location
    }
    RemoveProductEvent {
        string id "uuid"
    }
    UpdateProductEvent {
        string id "uuid"
        string name
        string description
        string location
    }
    Event ||--|| ProductEventPayload : "data"
    ProductEventPayload ||--|| AddProductEvent : "addProduct"
    ProductEventPayload ||--|| RemoveProductEvent : "removeProduct"
    ProductEventPayload ||--|| UpdateProductEvent : "updateProduct"
```
<!-- DIAGRAM: event-er END -->

<!-- DIAGRAM: event-class START -->
**Class Diagram Output:**
```mermaid
classDiagram
    class Event {
        +id: string
        +type: string
        +date: date
        +data: ProductEventPayload
    }
    class ProductEventPayload {
        +eventType: string
    }
    class AddProductEvent {
        +id: string
        +name: string
        +description: string
        +location: string
    }
    class RemoveProductEvent {
        +id: string
    }
    class UpdateProductEvent {
        +id: string
        +name: string
        +description: string
        +location: string
    }
    Event *-- ProductEventPayload : data
    ProductEventPayload <|-- AddProductEvent : addProduct
    ProductEventPayload <|-- RemoveProductEvent : removeProduct
    ProductEventPayload <|-- UpdateProductEvent : updateProduct
```
<!-- DIAGRAM: event-class END -->

**Note:** Use `.describe()` or `.meta({title})` on your discriminated union and its members to provide meaningful entity names in the diagrams. The library automatically creates separate entities for each union member using their descriptions and shows the relationships between them with the discriminator field values as edge labels.

### ID References

For cases where you want to reference other entities by ID without embedding their full structure, use the `idRef()` function. The function takes a Zod schema as an argument and extracts the ID field type and validation:

<!-- SCHEMA: order START -->
```typescript
const CustomerSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
}).describe('Customer');

const OrderSchema = z.object({
  id: z.uuid(),
  customerId: idRef(CustomerSchema), // References Customer entity
  productIds: z.array(idRef(ProductSchema)), // References multiple Product entities
  quantity: z.number().positive(),
  orderDate: z.date(),
}).describe('Order');
```
<!-- SCHEMA: order END -->

<!-- DIAGRAM: order-er START -->
**ER Diagram Output:**
```mermaid
erDiagram
    Order {
        string id "uuid"
        string customerId "ref: Customer, uuid"
        string[] productIds "ref: Product"
        number quantity "positive"
        date orderDate
    }
    Customer {
    }
    Product {
    }
    Order }o--|| Customer : "customerId"
    Order }o--o{ Product : "productIds"
```
<!-- DIAGRAM: order-er END -->

<!-- DIAGRAM: order-class START -->
**Class Diagram Output:**
```mermaid
classDiagram
    class Order {
        +id: string
        +customerId: string
        +productIds: string[]
        +quantity: number
        +orderDate: date
    }
    class Customer {
    }
    class Product {
    }
    Order --> Customer : customerId (ref)
    Order --> Product : productIds (ref)
```
<!-- DIAGRAM: order-class END -->

This generates relationships to placeholder entities and preserves the referenced ID field type (including numeric IDs) with the referenced entity in the validation column. The relationship style differentiates ID references from embedded relationships.

**Relationship Cardinality:**
- **Single ID references** (`idRef(Schema)`) use many-to-one relationships (`}o--||`)
- **Array ID references** (`z.array(idRef(Schema))`) use many-to-many relationships (`}o--o{`)
- **Optional or nullable single ID references** use many-to-zero-or-one relationships (`}o--o|`)

**Function Signature:**
```typescript
idRef<T extends z.ZodObject<Record<string, z.ZodTypeAny>>>(
  schema: T,
  idFieldName?: string, // Default: 'id'
  entityName?: string   // Default: schema.description
): z.ZodTypeAny
```

The function validates that the provided schema is an object and contains the specified ID field. It extracts the ID field's type and validation rules to create a properly typed reference.

**Note:** For embedded relationships, class diagrams use UML composition notation (`*--`) to indicate that the contained object is part of the containing object's lifecycle.

**Example - Embedded vs Reference Relationships:**

```mermaid
classDiagram
    class User {
        +id: string
        +name: string
        +profile: Profile
        +customerId: string
    }
    class Profile {
        +bio: string
        +preferences: Preferences
    }
    class Preferences {
        +theme: string
        +notifications: boolean
    }
    class Customer {
        +id: string
        +name: string
    }
    
    User *-- Profile : profile
    Profile *-- Preferences : preferences
    User --> Customer : customerId (ref)
```

**Relationship Styles:**
- **ER Diagrams**: 
  - `||--||`: Required embedded objects; `||--o|`: optional/nullable objects; `||--o{`: collections
  - `}o--||`: Single ID reference relationships (many-to-one)
  - `}o--o{`: Array ID references; `}o--o|`: optional/nullable single ID references
- **Class Diagrams**: 
  - `*--`: Embedded relationships (UML composition with diamond)
  - `--> : fieldName (ref)`: ID reference relationships

## Configuration Options

### Function Signature

```typescript
function generateMermaidDiagram(
  schema: z.ZodTypeAny | z.ZodTypeAny[],
  options?: MermaidOptions
): string
```

The function accepts either a single Zod schema or an array of schemas, along with optional configuration options.

### Options Interface

```typescript
interface MermaidOptions {
  diagramType?: 'er' | 'class' | 'flowchart';
  entityName?: string;
  includeValidation?: boolean;
  includeOptional?: boolean;
  metadataRegistry?: z.core.$ZodRegistry<z.core.GlobalMeta>;
}
```

- **`diagramType`**: Choose between 'er', 'class', or 'flowchart'
- **`entityName`**: Custom name for the top-level entity
- **`includeValidation`**: Show validation rules in ER attribute comments (default `true`). Type details and original field names remain visible when disabled.
- **`includeOptional`**: Include optional fields (default `true`); set to `false` to omit them and their otherwise unused nested entities
- **`metadataRegistry`**: Use a custom Zod metadata registry instead of `z.globalRegistry`.

## Supported types and naming

Requires Zod v4. Generated syntax is tested with Mermaid 11.12+.

| Schema | Diagram representation |
| --- | --- |
| Strings, numbers, booleans, dates, bigint, symbol | Corresponding primitive type |
| `null`, `undefined`, `void`, `any`, `unknown`, `never`, `nan`, `file` | Distinct named types |
| Enums, `keyof`, literals (including multiple values) | Value types with ER value annotations |
| Arrays, tuples with rest, records, maps, sets, promises | Readable compound types; ER comments carry complex type details |
| Objects, object arrays, lazy object recursion | Shared entities and relationships |
| Unions and intersections | Joined types with relationships to nested objects |
| Discriminated unions | A base entity with subtype relationships |
| Optional, nullable, default, prefault, catch, readonly, nonoptional | Unwrapped type; optional/nullable relationship handling |
| Template literals | `string` |
| Preprocessing and pipes | Explicit output schema |
| Arbitrary transforms and custom schemas | `unknown`, because their result type cannot be inferred at runtime |

A scalar or collection at the root is represented by an entity with a `value` field.
Inspection does not run parsing callbacks, refinements, transforms, or default/catch factories.
Recursive collections without an object entity use `unknown` at the recursive boundary.
Relationships describe schema structure, rather than every runtime constraint on a union or collection.

Entity labels use `entityName` metadata, then `title`, then `description`, then a field-derived
name or the `entityName` option. `getEntityName()` returns this label without stripping spaces.
The renderer assigns identifiers containing letters, digits, and underscores, prefixes unsafe
or reserved names, and adds numeric suffixes on collisions. Reusing the same object schema
reuses its entity; distinct schemas with the same label receive distinct identifiers.
ID references resolve by label, so give their target schemas distinct names.

ER attribute names have [stricter syntax than entity labels](https://mermaid.js.org/syntax/entityRelationshipDiagram.html#attributes).
Invalid attribute names are normalized; their original names are retained in ER comments.
Class properties use normalized names, and flowchart labels retain original field names.
Quotes, newlines, and Mermaid syntax in labels are escaped before rendering.

String lengths/formats/regexes, numeric bounds/multiples, collection sizes, literal values,
and enum values appear as ER annotations. Arbitrary refinement functions are not interpreted.
See the [Zod API reference](https://zod.dev/api) for the underlying schema semantics.

## Examples

See the [examples/mermaid-examples.md](examples/mermaid-examples.md) file for comprehensive examples of all diagram types and features.

## Development

### Setup

```bash
npm install
npm run build
npm test
```

### Available Scripts

- `npm run build` - Build the project
- `npm run test` - Run tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run regenerate:readme` - Regenerate diagrams in README.md
- `npm run regenerate:examples` - Regenerate diagrams in examples/mermaid-examples.md
- `npm run regenerate:all` - Regenerate all diagrams in README and examples

### Regenerating Diagrams

The diagrams in this README and in the examples folder are automatically generated from Zod schemas. If you make changes to the diagram generation logic, you can regenerate all diagrams by running:

```bash
npm run regenerate:all
```

This ensures that all documentation stays in sync with the actual output of the library

## License

MIT 