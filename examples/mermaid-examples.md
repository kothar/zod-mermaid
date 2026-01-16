# Zod Mermaid Examples

This document contains example Mermaid diagrams generated from Zod schemas using the zod-mermaid library.

## User Schema Examples

<!-- SCHEMA: user START -->
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
<!-- SCHEMA: user END -->

### Entity-Relationship Diagram
<!-- DIAGRAM: user-er START -->
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
<!-- DIAGRAM: user-er END -->

### Class Diagram
<!-- DIAGRAM: user-class START -->
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
<!-- DIAGRAM: user-class END -->

### Flowchart Diagram
<!-- DIAGRAM: user-flowchart START -->
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
<!-- DIAGRAM: user-flowchart END -->

## Product Schema Example

<!-- SCHEMA: product START -->
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
<!-- SCHEMA: product END -->

### Entity-Relationship Diagram
<!-- DIAGRAM: product-er START -->
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
<!-- DIAGRAM: product-er END -->

## Directory Schema Example (Self-Referential)

<!-- SCHEMA: directory START -->
```typescript
const DirectorySchema: z.ZodType<any> = z.object({
  name: z.string(),
  path: z.string(),
  isDirectory: z.boolean(),
  size: z.number().optional(),
  modifiedAt: z.date(),
  children: z.array(z.lazy(() => DirectorySchema)).optional(),
}).describe('Directory');
```
<!-- SCHEMA: directory END -->

### Entity-Relationship Diagram
<!-- DIAGRAM: directory-er START -->
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
<!-- DIAGRAM: directory-er END -->

### Class Diagram
<!-- DIAGRAM: directory-class START -->
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
<!-- DIAGRAM: directory-class END -->

### Flowchart Diagram
<!-- DIAGRAM: directory-flowchart START -->
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
<!-- DIAGRAM: directory-flowchart END -->

## API Response Schema Example (Discriminated Union)

<!-- SCHEMA: api-response START -->
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
  }).describe('Success'),
  z.object({
    status: z.literal('error'),
    message: z.string(),
    code: z.number(),
    details: z.object({
      field: z.string().optional(),
      reason: z.string(),
    }).optional(),
  }).describe('Error'),
]).describe('ApiResponse');
```
<!-- SCHEMA: api-response END -->

### Entity-Relationship Diagram
<!-- DIAGRAM: api-response-er START -->
```mermaid
erDiagram
    ApiResponse {
        string status "enum: success, error"
    }
    Success {
        Data data
        date timestamp
    }
    Data {
        string id
        string name
        string email "email"
    }
    Error {
        string message
        number code
        Details details
    }
    Success ||--|| Data : "data"
    ApiResponse ||--|| Success : "success"
    ApiResponse ||--|| Error : "error"
```
<!-- DIAGRAM: api-response-er END -->

### Class Diagram
<!-- DIAGRAM: api-response-class START -->
```mermaid
classDiagram
    class ApiResponse {
        +status: string
    }
    class Success {
        +data: Data
        +timestamp: date
    }
    class Data {
        +id: string
        +name: string
        +email: string
    }
    class Error {
        +message: string
        +code: number
        +details: Details
    }
    Success *-- Data : data
    ApiResponse <|-- Success : success
    ApiResponse <|-- Error : error
```
<!-- DIAGRAM: api-response-class END -->

### Flowchart Diagram
<!-- DIAGRAM: api-response-flowchart START -->
```mermaid
flowchart TD
    ApiResponse["ApiResponse"]
    Success["Success"]
    Data["Data"]
    Error["Error"]
    ApiResponse_status["status: string"]
    ApiResponse --> ApiResponse_status["status: string"]
    Success_data["data: Data"]
    Success --> Success_data["data: Data"]
    Success_data["data: Data"] --> Data
    Success_timestamp["timestamp: date"]
    Success --> Success_timestamp["timestamp: date"]
    Data_id["id: string"]
    Data --> Data_id["id: string"]
    Data_name["name: string"]
    Data --> Data_name["name: string"]
    Data_email["email: string"]
    Data --> Data_email["email: string"]
    Error_message["message: string"]
    Error --> Error_message["message: string"]
    Error_code["code: number"]
    Error --> Error_code["code: number"]
    Error_details["details: Details"]
    Error --> Error_details["details: Details"]
    ApiResponse -.-> Success
    ApiResponse -.-> Error
```
<!-- DIAGRAM: api-response-flowchart END -->

## Event Schema Example

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
}).meta({ title: 'Event', description: 'Event entity via registry meta' });
```
<!-- SCHEMA: event END -->

### Entity-Relationship Diagram
<!-- DIAGRAM: event-er START -->
```mermaid
erDiagram
    Event {
        string id
        string type "literal: com.example.event.product"
        date date
        ProductEventPayload data
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

### Class Diagram
<!-- DIAGRAM: event-class START -->
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

### Flowchart Diagram
<!-- DIAGRAM: event-flowchart START -->
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
    Event_data["data: ProductEventPayload"]
    Event --> Event_data["data: ProductEventPayload"]
    Event_data["data: ProductEventPayload"] --> ProductEventPayload
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
<!-- DIAGRAM: event-flowchart END -->

## Additional Types Example

<!-- SCHEMA: additional-types START -->
```typescript
const AdditionalTypesSchema = z.object({
  big: z.bigint(),
  sym: z.symbol(),
  nul: z.null(),
  und: z.undefined(),
  tup: z.tuple([z.string(), z.number(), z.boolean()]),
  map: z.map(z.string(), z.number()),
  set: z.set(z.string()),
  prom: z.promise(z.number()),
  rec: z.record(z.string(), z.number()),
  inter: z.string().and(z.number()),
  union: z.union([z.string(), z.number()]),
  key: z.keyof(z.object({ foo: z.string(), bar: z.number() })),
}).describe('AdditionalTypes');
```
<!-- SCHEMA: additional-types END -->

### Entity-Relationship Diagram
<!-- DIAGRAM: additional-types-er START -->
```mermaid
erDiagram
    AdditionalTypes {
        bigint big
        symbol sym
        null nul
        undefined und
        Tuple tup "[string, number, boolean]"
        Map map "&lt;string, number&gt;"
        Set set "&lt;string&gt;"
        Promise prom "&lt;number&gt;"
        Record rec "&lt;string, number&gt;"
        intersection inter "string &amp; number"
        union union "string | number"
        string key "enum: foo, bar"
    }
```
<!-- DIAGRAM: additional-types-er END -->

### Class Diagram
<!-- DIAGRAM: additional-types-class START -->
```mermaid
classDiagram
    class AdditionalTypes {
        +big: bigint
        +sym: symbol
        +nul: null
        +und: undefined
        +tup: [string, number, boolean]
        +map: Map<string, number>
        +set: Set<string>
        +prom: Promise<number>
        +rec: Record<string, number>
        +inter: string & number
        +union: string | number
        +key: string
    }
```
<!-- DIAGRAM: additional-types-class END -->

### Flowchart Diagram
<!-- DIAGRAM: additional-types-flowchart START -->
```mermaid
flowchart TD
    AdditionalTypes["AdditionalTypes"]
    AdditionalTypes_big["big: bigint"]
    AdditionalTypes --> AdditionalTypes_big["big: bigint"]
    AdditionalTypes_sym["sym: symbol"]
    AdditionalTypes --> AdditionalTypes_sym["sym: symbol"]
    AdditionalTypes_nul["nul: null"]
    AdditionalTypes --> AdditionalTypes_nul["nul: null"]
    AdditionalTypes_und["und: undefined"]
    AdditionalTypes --> AdditionalTypes_und["und: undefined"]
    AdditionalTypes_tup["tup: [string, number, boolean]"]
    AdditionalTypes --> AdditionalTypes_tup["tup: [string, number, boolean]"]
    AdditionalTypes_map["map: Map<string, number>"]
    AdditionalTypes --> AdditionalTypes_map["map: Map<string, number>"]
    AdditionalTypes_set["set: Set<string>"]
    AdditionalTypes --> AdditionalTypes_set["set: Set<string>"]
    AdditionalTypes_prom["prom: Promise<number>"]
    AdditionalTypes --> AdditionalTypes_prom["prom: Promise<number>"]
    AdditionalTypes_rec["rec: Record<string, number>"]
    AdditionalTypes --> AdditionalTypes_rec["rec: Record<string, number>"]
    AdditionalTypes_inter["inter: string & number"]
    AdditionalTypes --> AdditionalTypes_inter["inter: string & number"]
    AdditionalTypes_union["union: string | number"]
    AdditionalTypes --> AdditionalTypes_union["union: string | number"]
    AdditionalTypes_key["key: string"]
    AdditionalTypes --> AdditionalTypes_key["key: string"]
```
<!-- DIAGRAM: additional-types-flowchart END -->

## ID Reference Schema Example

<!-- SCHEMA: id-ref START -->
```typescript
const CustomerSchema = z.object({
  id: z.uuid(),
}).describe('Customer');

const ProductRefSchema = z.object({
  id: z.uuid(),
}).describe('Product');

const OrderSchema = z.object({
  id: z.uuid(),
  customerId: idRef(CustomerSchema),
  productIds: z.array(idRef(ProductRefSchema)),
  quantity: z.number().positive(),
  orderDate: z.date(),
  status: z.enum(['pending', 'shipped', 'delivered']),
}).describe('Order');
```
<!-- SCHEMA: id-ref END -->

### Entity-Relationship Diagram
<!-- DIAGRAM: id-ref-er START -->
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
<!-- DIAGRAM: id-ref-er END -->

### Class Diagram
<!-- DIAGRAM: id-ref-class START -->
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
<!-- DIAGRAM: id-ref-class END -->

### Flowchart Diagram
<!-- DIAGRAM: id-ref-flowchart START -->
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
<!-- DIAGRAM: id-ref-flowchart END -->

## Usage

To generate your own diagrams:

```typescript
import { z } from 'zod';
import { generateMermaidDiagram } from 'zod-mermaid';

// Use .describe() to provide entity names
const mySchema = z.object({
  // Your schema definition
}).describe('MyEntity');

const diagram = generateMermaidDiagram(mySchema, {
  diagramType: 'er', // 'er' | 'class' | 'flowchart'
  includeValidation: true,
  includeOptional: true,
});
```

**Note:** The library automatically uses the schema title (set with `.meta({title})` 
or description (set with `.describe()`) as the entity name. If no title or description 
is provided, it will use the `entityName` option or default to 'Schema'.
