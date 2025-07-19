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
        number age
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
    User --> Profile : profile
    Profile --> Preferences : preferences
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
        number price
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
    Directory --> Directory : children
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

**Note:** The library automatically uses the schema description (set with `.describe()`) as the entity name. If no description is provided, it will use the `entityName` option or default to 'Schema'.
