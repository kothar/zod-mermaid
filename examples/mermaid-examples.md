# Zod Mermaid Examples

This document contains example Mermaid diagrams generated from Zod schemas using the zod-mermaid library.

## User Schema Examples

### Entity-Relationship Diagram
```mermaid
erDiagram
    User {
        string id "uuid"
        string name "min: 1, max: 100"
        string email "email"
        number age "positive, max: 120"
        boolean isActive
        date createdAt
        Profile profile
    }
    Profile {
        string bio
        string avatar "url"
        Preferences preferences
    }
    Preferences {
        string theme "enum: light, dark"
        boolean notifications
    }
    User ||--|| Profile : "profile"
    Profile ||--|| Preferences : "preferences"
```

### Class Diagram
```mermaid
classDiagram
    class User {
        +id: string
        +name: string
        +email: string
        +age: number
        +isActive: boolean
        +createdAt: date
        +profile: Profile
    }
    class Profile {
        +bio: string
        +avatar: string
        +preferences: Preferences
    }
    class Preferences {
        +theme: string
        +notifications: boolean
    }
    User *-- Profile : profile
    Profile *-- Preferences : preferences
```

### Flowchart Diagram
```mermaid
flowchart TD
    User["User"]
    Profile["Profile"]
    Preferences["Preferences"]
    User_id["id: string"]
    User --> User_id["id: string"]
    User_name["name: string"]
    User --> User_name["name: string"]
    User_email["email: string"]
    User --> User_email["email: string"]
    User_age["age: number"]
    User --> User_age["age: number"]
    User_isActive["isActive: boolean"]
    User --> User_isActive["isActive: boolean"]
    User_createdAt["createdAt: date"]
    User --> User_createdAt["createdAt: date"]
    User_profile["profile: Profile"]
    User --> User_profile["profile: Profile"]
    User_profile["profile: Profile"] --> Profile
    Profile_bio["bio: string"]
    Profile --> Profile_bio["bio: string"]
    Profile_avatar["avatar: string"]
    Profile --> Profile_avatar["avatar: string"]
    Profile_preferences["preferences: Preferences"]
    Profile --> Profile_preferences["preferences: Preferences"]
    Profile_preferences["preferences: Preferences"] --> Preferences
    Preferences_theme["theme: string"]
    Preferences --> Preferences_theme["theme: string"]
    Preferences_notifications["notifications: boolean"]
    Preferences --> Preferences_notifications["notifications: boolean"]
```

## Product Schema Example

### Entity-Relationship Diagram
```mermaid
erDiagram
    Product {
        string id
        string name
        number price "positive"
        string category "enum: electronics, clothing, books"
        boolean inStock
        string[] tags
        Record metadata "&lt;string, unknown&gt;"
    }
```

## Directory Schema Example (Self-Referential)

### Entity-Relationship Diagram
```mermaid
erDiagram
    Directory {
        string name
        string path
        boolean isDirectory
        number size
        date modifiedAt
        Directory[] children
    }
    Directory ||--o{ Directory : "children"
```

### Class Diagram
```mermaid
classDiagram
    class Directory {
        +name: string
        +path: string
        +isDirectory: boolean
        +size: number
        +modifiedAt: date
        +children: Directory[]
    }
    Directory *-- Directory : children
```

### Flowchart Diagram
```mermaid
flowchart TD
    Directory["Directory"]
    Directory_name["name: string"]
    Directory --> Directory_name["name: string"]
    Directory_path["path: string"]
    Directory --> Directory_path["path: string"]
    Directory_isDirectory["isDirectory: boolean"]
    Directory --> Directory_isDirectory["isDirectory: boolean"]
    Directory_size["size: number"]
    Directory --> Directory_size["size: number"]
    Directory_modifiedAt["modifiedAt: date"]
    Directory --> Directory_modifiedAt["modifiedAt: date"]
    Directory_children["children: Directory[]"]
    Directory --> Directory_children["children: Directory[]"]
    Directory_children["children: Directory[]"] --> Directory
```

## API Response Schema Example (Discriminated Union)

### Entity-Relationship Diagram
```mermaid
erDiagram
    ApiResponse {
        string status "enum: success, error"
    }
    ApiResponse_Success {
        Data data
        date timestamp
    }
    Data {
        string id
        string name
        string email "email"
    }
    ApiResponse_Error {
        string message
        number code
        Details details
    }
    ApiResponse_Success ||--|| Data : "data"
    ApiResponse ||--|| ApiResponse_Success : "success"
    ApiResponse ||--|| ApiResponse_Error : "error"
```

### Class Diagram
```mermaid
classDiagram
    class ApiResponse {
        +status: string
    }
    class ApiResponse_Success {
        +data: Data
        +timestamp: date
    }
    class Data {
        +id: string
        +name: string
        +email: string
    }
    class ApiResponse_Error {
        +message: string
        +code: number
        +details: Details
    }
    ApiResponse_Success *-- Data : data
    ApiResponse <|-- ApiResponse_Success : success
    ApiResponse <|-- ApiResponse_Error : error
```

### Flowchart Diagram
```mermaid
flowchart TD
    ApiResponse["ApiResponse"]
    ApiResponse_Success["ApiResponse_Success"]
    Data["Data"]
    ApiResponse_Error["ApiResponse_Error"]
    ApiResponse_status["status: string"]
    ApiResponse --> ApiResponse_status["status: string"]
    ApiResponse_Success_data["data: Data"]
    ApiResponse_Success --> ApiResponse_Success_data["data: Data"]
    ApiResponse_Success_data["data: Data"] --> Data
    ApiResponse_Success_timestamp["timestamp: date"]
    ApiResponse_Success --> ApiResponse_Success_timestamp["timestamp: date"]
    Data_id["id: string"]
    Data --> Data_id["id: string"]
    Data_name["name: string"]
    Data --> Data_name["name: string"]
    Data_email["email: string"]
    Data --> Data_email["email: string"]
    ApiResponse_Error_message["message: string"]
    ApiResponse_Error --> ApiResponse_Error_message["message: string"]
    ApiResponse_Error_code["code: number"]
    ApiResponse_Error --> ApiResponse_Error_code["code: number"]
    ApiResponse_Error_details["details: Details"]
    ApiResponse_Error --> ApiResponse_Error_details["details: Details"]
    ApiResponse -.-> ApiResponse_Success
    ApiResponse -.-> ApiResponse_Error
```

## Event Schema Example

### Entity-Relationship Diagram
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

### Class Diagram
```mermaid
classDiagram
    class Event {
        +id: string
        +type: string
        +date: date
        +data: ProductEventPayload // ProductEventPayload
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

### Flowchart Diagram
```mermaid
flowchart TD
    Event["Event"]
    ProductEventPayload["ProductEventPayload"]
    AddProductEvent["AddProductEvent"]
    RemoveProductEvent["RemoveProductEvent"]
    UpdateProductEvent["UpdateProductEvent"]
    Event_id["id: string"]
    Event --> Event_id["id: string"]
    Event_type["type: string"]
    Event --> Event_type["type: string"]
    Event_date["date: date"]
    Event --> Event_date["date: date"]
    Event_data["data: ProductEventPayload\nProductEventPayload"]
    Event --> Event_data["data: ProductEventPayload\nProductEventPayload"]
    Event_data["data: ProductEventPayload\nProductEventPayload"] --> ProductEventPayload
    ProductEventPayload_eventType["eventType: string"]
    ProductEventPayload --> ProductEventPayload_eventType["eventType: string"]
    AddProductEvent_id["id: string"]
    AddProductEvent --> AddProductEvent_id["id: string"]
    AddProductEvent_name["name: string"]
    AddProductEvent --> AddProductEvent_name["name: string"]
    AddProductEvent_description["description: string"]
    AddProductEvent --> AddProductEvent_description["description: string"]
    AddProductEvent_location["location: string"]
    AddProductEvent --> AddProductEvent_location["location: string"]
    RemoveProductEvent_id["id: string"]
    RemoveProductEvent --> RemoveProductEvent_id["id: string"]
    UpdateProductEvent_id["id: string"]
    UpdateProductEvent --> UpdateProductEvent_id["id: string"]
    UpdateProductEvent_name["name: string"]
    UpdateProductEvent --> UpdateProductEvent_name["name: string"]
    UpdateProductEvent_description["description: string"]
    UpdateProductEvent --> UpdateProductEvent_description["description: string"]
    UpdateProductEvent_location["location: string"]
    UpdateProductEvent --> UpdateProductEvent_location["location: string"]
    ProductEventPayload -.-> AddProductEvent
    ProductEventPayload -.-> RemoveProductEvent
    ProductEventPayload -.-> UpdateProductEvent
```

## ID Reference Schema Example

### Entity-Relationship Diagram
```mermaid
erDiagram
    Order {
        string id "uuid"
        string customerId "ref: Customer, uuid"
        string[] productIds "ref: Product, uuid"
        number quantity "positive"
        date orderDate
        string status "enum: pending, shipped, delivered"
    }
    Order }o--|| Customer : "customerId"
    Order }o--o{ Product : "productIds"
```

### Class Diagram
```mermaid
classDiagram
    class Order {
        +id: string
        +customerId: string
        +productIds: string[]
        +quantity: number
        +orderDate: date
        +status: string
    }
    class Customer {
    }
    class Product {
    }
    Order --> Customer : customerId (ref)
    Order --> Product : productIds (ref)
```

### Flowchart Diagram
```mermaid
flowchart TD
    Order["Order"]
    Customer["Customer"]
    Product["Product"]
    Order_id["id: string"]
    Order --> Order_id["id: string"]
    Order_customerId["customerId: string"]
    Order --> Order_customerId["customerId: string"]
    Order_customerId["customerId: string"] -.-> Customer
    Order_productIds["productIds: string[]"]
    Order --> Order_productIds["productIds: string[]"]
    Order_productIds["productIds: string[]"] -.-> Product
    Order_quantity["quantity: number"]
    Order --> Order_quantity["quantity: number"]
    Order_orderDate["orderDate: date"]
    Order --> Order_orderDate["orderDate: date"]
    Order_status["status: string"]
    Order --> Order_status["status: string"]
```

## Schema Definitions

### User Schema
```typescript
const UserSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(100),
  email: z.email(),
  age: z.number().min(0).max(120),
  isActive: z.boolean(),
  createdAt: z.date(),
  profile: z.object({
    bio: z.string().optional(),
    avatar: z.url().optional(),
    preferences: z.object({
      theme: z.enum(['light', 'dark']).default('light'),
      notifications: z.boolean().default(true),
    }),
  }),
}).describe('User');
```

### Product Schema
```typescript
const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().positive(),
  category: z.enum(['electronics', 'clothing', 'books']),
  inStock: z.boolean(),
  tags: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()),
}).describe('Product');
```

### Directory Schema
```typescript
const DirectorySchema = z.object({
  name: z.string(),
  path: z.string(),
  isDirectory: z.boolean(),
  size: z.number().optional(),
  modifiedAt: z.date(),
  children: z.array(z.lazy(() => DirectorySchema)).optional(),
}).describe('Directory');
```

### API Response Schema (Discriminated Union)
```typescript
const ApiResponseSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('success'),
    data: z.object({
      id: z.string(),
      name: z.string(),
      email: z.email(),
    }),
    timestamp: z.date(),
  }).describe('ApiResponse_Success'),
  z.object({
    status: z.literal('error'),
    message: z.string(),
    code: z.number(),
    details: z.object({
      field: z.string().optional(),
      reason: z.string(),
    }).optional(),
  }).describe('ApiResponse_Error'),
]).describe('ApiResponse');
```

### Event Schema
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
}).meta({ title: 'Event', description: 'Event entity via registry meta' });
```

### ID Reference Schema
```typescript
const CustomerSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
}).describe('Customer');

const ProductSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  price: z.number().positive(),
  category: z.enum(['electronics', 'clothing', 'books']),
}).describe('Product');

const OrderSchema = z.object({
  id: z.uuid(),
  customerId: idRef(CustomerSchema),
  productId: idRef(ProductSchema),
  quantity: z.number().positive(),
  orderDate: z.date(),
  status: z.enum(['pending', 'shipped', 'delivered']),
}).describe('Order');
```

**Note:** The `idRef()` function creates string fields that reference other entities by ID. This allows you to show relationships without embedding the full entity structure. The library automatically generates placeholder entities and relationships for referenced entities.

## Usage

To generate your own diagrams:

```typescript
import { z } from 'zod';
import { generateMermaidDiagram } from 'zod-mermaid';

// Three ways to provide names/descriptions:
// 1) Entity name via registry meta: .meta({ title: '...' })
// 2) Fallback name via entityName option
// 3) Description via registry meta: .meta({ description: '...' })
const mySchema = z.object({
  // Your schema definition
}).meta({ title: 'MyEntity', description: 'Example entity using registry meta' });

const diagram = generateMermaidDiagram(mySchema, {
  diagramType: 'er', // 'er' | 'class' | 'flowchart'
  includeValidation: true,
  includeOptional: true,
});
```

**Note:** Entity identification precedence now is: meta.title (registry) > meta.description (registry) > `entityName` option fallback. The `.describe()` helper sets the Zod description and may also be mirrored into meta by your registry implementation, but the generator reads from the registry.
