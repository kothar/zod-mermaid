# Multiple Schemas Example

This example demonstrates how to generate Mermaid diagrams from multiple Zod schemas at once.

## Basic Example

```typescript
import { z } from 'zod';
import { generateMermaidDiagram, idRef } from 'zod-mermaid';

// Define multiple schemas
const UserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  age: z.number().min(0).max(120),
}).describe('User');

const ProductSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  price: z.number().positive(),
  category: z.enum(['electronics', 'clothing', 'books']),
  inStock: z.boolean(),
}).describe('Product');

const OrderSchema = z.object({
  id: z.uuid(),
  customerId: idRef(UserSchema),
  productId: idRef(ProductSchema),
  quantity: z.number().positive(),
  orderDate: z.date(),
  status: z.enum(['pending', 'shipped', 'delivered']),
}).describe('Order');

// Generate diagram from multiple schemas
const diagram = generateMermaidDiagram([UserSchema, ProductSchema, OrderSchema], {
  diagramType: 'er',
});
```

## Generated ER Diagram

```mermaid
erDiagram
    User {
        string id "uuid"
        string name
        string email "email"
        number age "min: 0, max: 120"
    }
    Product {
        string id "uuid"
        string name
        number price "positive"
        string category "enum: electronics, clothing, books"
        boolean inStock
    }
    Order {
        string id "uuid"
        string customerId "ref: User, uuid"
        string productId "ref: Product, uuid"
        number quantity "positive"
        date orderDate
        string status "enum: pending, shipped, delivered"
    }
    Order }o--|| User : "customerId"
    Order }o--|| Product : "productId"
```

## Class Diagram Example

```typescript
const classDiagram = generateMermaidDiagram([UserSchema, ProductSchema, OrderSchema], {
  diagramType: 'class',
});
```

```mermaid
classDiagram
    class User {
        +id: string
        +name: string
        +email: string
        +age: number
    }
    class Product {
        +id: string
        +name: string
        +price: number
        +category: string
        +inStock: boolean
    }
    class Order {
        +id: string
        +customerId: string
        +productId: string
        +quantity: number
        +orderDate: date
        +status: string
    }
    Order --> User : customerId (ref)
    Order --> Product : productId (ref)
```

## Flowchart Example

```typescript
const flowchartDiagram = generateMermaidDiagram([UserSchema, ProductSchema, OrderSchema], {
  diagramType: 'flowchart',
});
```

```mermaid
flowchart TD
    User["User"]
    Product["Product"]
    Order["Order"]
    User_id["id: string"]
    User --> User_id
    User_name["name: string"]
    User --> User_name
    User_email["email: string"]
    User --> User_email
    User_age["age: number"]
    User --> User_age
    Product_id["id: string"]
    Product --> Product_id
    Product_name["name: string"]
    Product --> Product_name
    Product_price["price: number"]
    Product --> Product_price
    Product_category["category: string"]
    Product --> Product_category
    Product_inStock["inStock: boolean"]
    Product --> Product_inStock
    Order_id["id: string"]
    Order --> Order_id
    Order_customerId["customerId: string"]
    Order --> Order_customerId
    Order_customerId -.-> User
    Order_productId["productId: string"]
    Order --> Order_productId
    Order_productId -.-> Product
    Order_quantity["quantity: number"]
    Order --> Order_quantity
    Order_orderDate["orderDate: date"]
    Order --> Order_orderDate
    Order_status["status: string"]
    Order --> Order_status
```

## Benefits of Multiple Schemas

1. **Single Diagram**: Generate one comprehensive diagram showing all entities and their relationships
2. **Cross-Schema Relationships**: Show relationships between entities defined in different schemas
3. **Consistent Styling**: All entities use the same diagram styling and options
4. **Reduced Complexity**: No need to manually combine diagrams or manage multiple files

## Usage Patterns

### Single Schema (Backward Compatible)
```typescript
const diagram = generateMermaidDiagram(UserSchema, { diagramType: 'er' });
```

### Multiple Schemas
```typescript
const diagram = generateMermaidDiagram([UserSchema, ProductSchema], { diagramType: 'er' });
```

### Empty Array
```typescript
const diagram = generateMermaidDiagram([], { diagramType: 'er' });
// Returns: "erDiagram"
```

## Suggested usage

1. **Use Descriptive Names**: Use `.describe()` or `.meta({title})` on your schemas to provide meaningful entity names
2. **Group Related Schemas**: Pass schemas that are related or part of the same domain together
3. **Consider Diagram Size**: Very large diagrams with many entities may become hard to read
4. **Use ID References**: Use `idRef()` to create relationships between schemas without embedding full structures 