# Multiple Schemas Example

This example demonstrates how to generate Mermaid diagrams from multiple Zod schemas at once.

## Basic Example

<!-- SCHEMA: multiple-schemas START -->
```typescript
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
```
<!-- SCHEMA: multiple-schemas END -->

## Generated ER Diagram

<!-- DIAGRAM: multiple-schemas-er START -->
```mermaid
erDiagram
    User {
        string id "uuid"
        string name
        string email "email"
        number age "positive, max: 120"
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
<!-- DIAGRAM: multiple-schemas-er END -->

## Class Diagram Example

<!-- DIAGRAM: multiple-schemas-class START -->
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
    class User {
    }
    class Product {
    }
    Order --> User : customerId (ref)
    Order --> Product : productId (ref)
```
<!-- DIAGRAM: multiple-schemas-class END -->

## Flowchart Example

<!-- DIAGRAM: multiple-schemas-flowchart START -->
```mermaid
flowchart TD
    User["User"]
    Product["Product"]
    Order["Order"]
    User["User"]
    Product["Product"]
    User_id["id: string"]
    User --> User_id["id: string"]
    User_name["name: string"]
    User --> User_name["name: string"]
    User_email["email: string"]
    User --> User_email["email: string"]
    User_age["age: number"]
    User --> User_age["age: number"]
    Product_id["id: string"]
    Product --> Product_id["id: string"]
    Product_name["name: string"]
    Product --> Product_name["name: string"]
    Product_price["price: number"]
    Product --> Product_price["price: number"]
    Product_category["category: string"]
    Product --> Product_category["category: string"]
    Product_inStock["inStock: boolean"]
    Product --> Product_inStock["inStock: boolean"]
    Order_id["id: string"]
    Order --> Order_id["id: string"]
    Order_customerId["customerId: string"]
    Order --> Order_customerId["customerId: string"]
    Order_customerId["customerId: string"] -.-> User
    Order_productId["productId: string"]
    Order --> Order_productId["productId: string"]
    Order_productId["productId: string"] -.-> Product
    Order_quantity["quantity: number"]
    Order --> Order_quantity["quantity: number"]
    Order_orderDate["orderDate: date"]
    Order --> Order_orderDate["orderDate: date"]
    Order_status["status: string"]
    Order --> Order_status["status: string"]
```
<!-- DIAGRAM: multiple-schemas-flowchart END -->

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