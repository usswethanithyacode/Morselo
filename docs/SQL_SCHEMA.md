# Morselo SQL Relational Database Architecture, ORM & JOIN Design

This document describes the relational database design for Morselo's Ingredient Catalog using **PostgreSQL** (hosted on **Neon**) with the **Sequelize ORM** (`sequelize` / `pg`).

---

## 1. Overview & Separation of Concerns

- **PostgreSQL (Neon)**: Stores normalized, relational catalog data (ingredients categorized under taxonomy buckets). Managed via **Sequelize ORM** with SSL enabled.
- **MongoDB Atlas**: Stores flexible recipe documents (name, description, ingredients list, cooking steps, timestamps) via **Mongoose**.

---

## 2. Relational Schema Design

The catalog is modeled around two normalized relational tables with explicit Primary Key (PK) and Foreign Key (FK) constraints:

```sql
-- 1. Categories Table (Parent Table)
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- 2. Ingredients Table (Child Table)
CREATE TABLE IF NOT EXISTS ingredients (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT
);

-- 3. Foreign Key Index on Child Table for Fast JOIN Lookup
CREATE INDEX IF NOT EXISTS idx_ingredients_category_id ON ingredients(category_id);
```

### Table Relationships & Keys
- **`categories` Table (Parent)**:
  - `id`: `SERIAL PRIMARY KEY` (Primary Key). Uniquely identifies each category.
  - `name`: `TEXT NOT NULL UNIQUE`. Category name (e.g., "Dairy & Eggs", "Vegetables", "Pantry & Grains").
- **`ingredients` Table (Child)**:
  - `id`: `SERIAL PRIMARY KEY` (Primary Key). Uniquely identifies each ingredient.
  - `name`: `TEXT NOT NULL UNIQUE`. Name of the ingredient (e.g., "Eggs", "Cheese", "Tomato").
  - `category_id`: `INTEGER NOT NULL REFERENCES categories(id)` (Foreign Key). Enforces relational integrity so that every ingredient is bound to a valid parent category.

---

## 3. SQL JOINs (PostgreSQL)

### 1. Two Related Tables
- **Parent Table**: `categories` (taxonomy bucket)
- **Child Table**: `ingredients` (individual culinary ingredients)

### 2. Primary Key / Foreign Key Relationship
- **Primary Key**: `categories.id`
- **Foreign Key**: `ingredients.category_id` (references `categories.id`)

### 3. Why the JOIN is Needed
In a normalized relational database (3NF), category metadata is decoupled from ingredient records to prevent duplicate data, update anomalies, and inconsistencies. When retrieving catalog items for recipe generation or category filtering, Morselo must query both tables simultaneously to match each ingredient with its category name in a single efficient query.

### 4. JOIN Type Used: `INNER JOIN`
Morselo utilizes an **`INNER JOIN`** because every active ingredient in the catalog must belong to an existing category. Only rows where `ingredients.category_id` strictly matches `categories.id` are returned.

### 5. Explicit PostgreSQL Parameterized SQL INNER JOIN Query
In [`server/db.js`](file:///c:/Users/usswe/OneDrive/Desktop/Morselo/server/db.js):
```sql
SELECT
    i.id,
    i.name,
    c.name AS category
FROM ingredients i
INNER JOIN categories c ON i.category_id = c.id
WHERE c.name = :category
ORDER BY c.name ASC, i.name ASC;
```

### 6. Implementation & Execution
In [`server/db.js`](file:///c:/Users/usswe/OneDrive/Desktop/Morselo/server/db.js) via `getJoinedIngredientCatalog`:
```javascript
async function getJoinedIngredientCatalog(options = {}) {
    const { category, sort } = options;
    const replacements = {};
    let whereClause = '';

    if (category && typeof category === 'string' && category.trim().length > 0) {
        whereClause = 'WHERE c.name = :category';
        replacements.category = category.trim();
    }

    let orderClause = 'ORDER BY c.name ASC, i.name ASC';
    if (sort) {
        const normalizedSort = typeof sort === 'string' ? sort.trim().toLowerCase() : '';
        if (normalizedSort === 'asc') {
            orderClause = 'ORDER BY i.name ASC';
        } else if (normalizedSort === 'desc') {
            orderClause = 'ORDER BY i.name DESC';
        } else {
            throw new Error('Invalid sort parameter.');
        }
    }

    const sql = `
        SELECT
            i.id,
            i.name,
            c.name AS category
        FROM ingredients i
        INNER JOIN categories c ON i.category_id = c.id
        ${whereClause}
        ${orderClause};
    `;

    const results = await db.query(sql, {
        replacements,
        type: Sequelize.QueryTypes.SELECT,
    });

    return results;
}
```

### 7. User-Facing Frontend Integration & Endpoints Demonstrating the JOIN
- **`GET /api/ingredients/catalog`**: Returns joined catalog objects `{ id, name, category }` directly to the client.
- **Frontend UI ([`src/App.jsx`](file:///c:/Users/usswe/OneDrive/Desktop/Morselo/src/App.jsx))**:
  - Consumes `GET /api/ingredients/catalog` upon page loading.
  - Dynamically renders category filter buttons ("All", "Dairy & Eggs", "Vegetables", etc.) based on distinct joined categories.
  - Renders category pill badges on every ingredient button, visually displaying the relational link between the `ingredients` and `categories` tables.
- **`GET /api/ingredients`**: Backward-compatible array of ingredient name strings.

---

## 4. ORM Usage — Sequelize Models & Schema Mapping

Morselo utilizes the **Sequelize ORM** (`sequelize` v6) to define relational models, manage associations, and execute relational queries without manual string concatenation.

### Model Definitions ([server/db.js](file:///c:/Users/usswe/OneDrive/Desktop/Morselo/server/db.js))

```javascript
const { Sequelize, DataTypes } = require('sequelize')

// 1. Category Model
const Category = sequelize.define('Category', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
    },
}, {
    tableName: 'categories',
    timestamps: false,
})

// 2. Ingredient Model
const Ingredient = sequelize.define('Ingredient', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
    },
    category_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Category,
            key: 'id',
        },
    },
}, {
    tableName: 'ingredients',
    timestamps: false,
})

// 3. Relational Associations (PK/FK)
Category.hasMany(Ingredient, { foreignKey: 'category_id' })
Ingredient.belongsTo(Category, { foreignKey: 'category_id' })
```

---

## 5. SQL Transactions (ACID Guarantees)

Morselo implements **Sequelize Managed Transactions** to ensure multi-step database writes adhere to **ACID** (Atomicity, Consistency, Isolation, Durability) guarantees.

### 1. What is a Transaction in Morselo?
When adding a new category and its associated ingredients (e.g., importing a category batch), multiple rows must be written across both the `categories` and `ingredients` tables. A transaction guarantees that:
- **All changes succeed together**, OR
- **All changes fail together** (preventing partial writes or empty orphaned categories).

### 2. Implementation: `addCategoryWithIngredients`

```javascript
async function addCategoryWithIngredients({ category, ingredients }) {
    return await sequelize.transaction(async (t) => {
        // Step 1: Create or find the parent Category within the transaction
        const [catRecord] = await Category.findOrCreate({
            where: { name: category.trim() },
            defaults: { name: category.trim() },
            transaction: t,
        })

        // Step 2: Insert child ingredients bound to category_id within the same transaction
        const createdIngredients = []
        for (const ingName of ingredients) {
            const [ingRecord] = await Ingredient.findOrCreate({
                where: { name: ingName.trim() },
                defaults: {
                    name: ingName.trim(),
                    category_id: catRecord.id,
                },
                transaction: t,
            })
            createdIngredients.push(ingRecord)
        }

        return {
            category: catRecord.name,
            categoryId: catRecord.id,
            ingredients: createdIngredients.map((ing) => ing.name),
        }
    })
}
```

### 3. How Commit Works
When all operations inside `sequelize.transaction(...)` resolve successfully without errors, Sequelize issues a `COMMIT` command to PostgreSQL, making the changes permanent.

### 4. How Rollback Works
If any step inside the callback fails (such as an invalid data type or constraint violation), Sequelize automatically catches the exception and issues a `ROLLBACK` command to PostgreSQL, leaving the database unchanged.

---

## 6. Relational Indexing & Query Optimization

- **Foreign Key Index (`idx_ingredients_category_id`)**: Accelerates foreign key lookups when performing `INNER JOIN` operations between `ingredients` and `categories`.
- Non-destructive startup synchronization ensures indexes and tables exist without altering existing catalog data.

---

## 7. Seed Data & Idempotence

The initialization routine seeds standard categories and ingredients idempotently inside a managed transaction using `findOrCreate`:

| Category | Ingredients |
| :--- | :--- |
| **Dairy & Eggs** | Eggs, Cheese |
| **Vegetables** | Tomato, Onion, Potato |
| **Pantry & Grains** | Rice |

---

## 8. Query Parameters & API Examples

The `GET /api/ingredients` endpoint accepts two optional query parameters:

| Parameter | Allowed Values | Description |
| :--- | :--- | :--- |
| `category` | String (e.g. `Vegetables`, `Dairy & Eggs`) | Filters ingredients by category name using parameterized ORM query. |
| `sort` | `asc`, `desc` (case-insensitive) | Sorts ingredients alphabetically by name. Invalid values return `400 Bad Request`. |

### Example Requests & Responses

1. **Default (No parameters)**
   - **Request**: `GET /api/ingredients`
   - **Response**:
     ```json
     ["Cheese", "Eggs", "Rice", "Onion", "Potato", "Tomato"]
     ```

2. **Category Filter**
   - **Request**: `GET /api/ingredients?category=Vegetables`
   - **Response**:
     ```json
     ["Onion", "Potato", "Tomato"]
     ```

3. **Ascending Sort by Name**
   - **Request**: `GET /api/ingredients?sort=asc`
   - **Response**:
     ```json
     ["Cheese", "Eggs", "Onion", "Potato", "Rice", "Tomato"]
     ```

4. **Descending Sort with Category Filter**
   - **Request**: `GET /api/ingredients?category=Vegetables&sort=desc`
   - **Response**:
     ```json
     ["Tomato", "Potato", "Onion"]
     ```

5. **Batch Transaction Endpoint (Admin Protected)**
   - **Request**: `POST /api/ingredients/batch` (`Authorization: Bearer <admin_token>`)
   - **Body**:
     ```json
     {
       "category": "Herbs & Spices",
       "ingredients": ["Basil", "Oregano", "Thyme"]
     }
     ```
   - **Response**:
     ```json
     {
       "message": "Category and ingredients added atomically via transaction.",
       "result": {
         "category": "Herbs & Spices",
         "categoryId": 4,
         "ingredients": ["Basil", "Oregano", "Thyme"]
       }
     }
     ```

---

## 9. Database Normalization (1NF, 2NF, 3NF)

### 9.1 Overview & Normalization Strategy
**Database Normalization** is the structural process of organizing relational database tables to reduce data redundancy, eliminate modification anomalies (update, insertion, deletion), and enforce data integrity.

Morselo's PostgreSQL ingredient catalog is modeled in **Third Normal Form (3NF)**:

```
┌──────────────────────────────────────────────────────────────┐
│                    Normalized 3NF Schema                     │
└──────────────────────────────┬───────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               │                               │
    ┌──────────▼──────────┐         ┌──────────▼──────────┐
    │     categories      │         │     ingredients     │
    ├─────────────────────┤         ├─────────────────────┤
    │ id (PK, SERIAL)     │◄───┐    │ id (PK, SERIAL)     │
    │ name (TEXT, UNIQUE) │    └───┼│ category_id (FK)    │
    └─────────────────────┘         │ name (TEXT, UNIQUE) │
                                    └─────────────────────┘
```

---

### 9.2 First Normal Form (1NF)

A relation is in **1NF** if and only if all attributes contain only **atomic (indivisible) scalar values**, each row is uniquely identifiable via a **Primary Key**, and there are **no repeating groups**.

#### How Morselo Satisfies 1NF:
1. **Scalar Column Types**: Every column (`id`, `name`, `category_id`) stores atomic scalar types (`INTEGER`, `TEXT`). No comma-separated strings or nested JSON arrays are stored in PostgreSQL table cells.
2. **Explicit Primary Keys**:
   - `categories.id`: `SERIAL PRIMARY KEY` (Unique integer identifier for each category).
   - `ingredients.id`: `SERIAL PRIMARY KEY` (Unique integer identifier for each ingredient).
3. **No Repeating Column Groups**: Attributes are not structured as repeating columns (e.g., `ingredient_1`, `ingredient_2`, `ingredient_3`). Each ingredient is an independent row.

---

### 9.3 Second Normal Form (2NF)

A relation is in **2NF** if and only if it is in **1NF** and **every non-key attribute is fully functionally dependent on the entire primary key** (i.e., no partial key dependencies).

#### How Morselo Satisfies 2NF:
1. **Single-Column Primary Keys**: Both `categories` and `ingredients` utilize single-column surrogate primary keys (`id`).
2. **Elimination of Partial Dependencies**: Partial functional dependencies can only occur when a table has a composite (multi-column) primary key. Because Morselo's tables use single-column primary keys:
   - In `categories`: `id` $\rightarrow$ `name`
   - In `ingredients`: `id` $\rightarrow$ `name`, `id` $\rightarrow$ `category_id`
   Every non-key attribute depends on the *entire* primary key.

---

### 9.4 Third Normal Form (3NF)

A relation is in **3NF** if and only if it is in **2NF** and **no non-key attribute is transitively dependent on the primary key** (i.e., no non-key attribute depends on another non-key attribute: $X \rightarrow Y \rightarrow Z$).

#### How Morselo Satisfies 3NF:
1. **No Transitive Dependencies**: In the `ingredients` table, the category name is **not stored**. Instead, `ingredients` stores only the foreign key reference `category_id` $\rightarrow$ `categories.id`.
2. **Category Isolation**: All category-specific attributes (such as category `name`) reside exclusively in the parent `categories` table.
3. **Functional Dependency Mappings**:
   - `categories`: `id` $\rightarrow$ `name`
   - `ingredients`: `id` $\rightarrow$ `name`, `id` $\rightarrow$ `category_id`
   - Transitive dependency `ingredients.id -> category_id -> category_name` is eliminated within the `ingredients` table.

---

### 9.5 Comparison: Denormalized Schema vs. Morselo 3NF Schema

If Morselo used an unnormalized / denormalized flat table:
`ingredients_flat(id, ingredient_name, category_name)`

| Anomaly Type | Denormalized (0NF / Flat) Issue | Morselo 3NF Solution |
|---|---|---|
| **Update Anomaly** | Renaming "Dairy & Eggs" to "Dairy & Poultry" requires updating hundreds of ingredient rows. If one row fails, data becomes inconsistent. | Category name is updated in **exactly one row** in `categories`. All referencing ingredients instantly reflect the update via JOIN. |
| **Insertion Anomaly** | A new category (e.g., "Seafood") cannot be registered without creating a dummy or NULL ingredient row. | New categories are inserted cleanly into `categories` independently of ingredients. |
| **Deletion Anomaly** | Deleting the last ingredient in "Pantry & Grains" (e.g., "Rice") inadvertently deletes the entire category from the system. | Ingredients can be deleted from `ingredients` while preserving the parent category record in `categories`. |
| **Storage Redundancy** | Category strings (e.g., "Vegetables") are duplicated across thousands of rows. | Category string is stored **once**; child rows store lightweight 4-byte `INTEGER` foreign keys. |

---

### 9.6 Live Database Verification (`information_schema` Metadata)

Querying PostgreSQL system catalogs on the live database confirms:

```sql
-- 1. Primary Key Verification
SELECT tc.table_name, kcu.column_name, tc.constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('categories', 'ingredients')
  AND tc.constraint_type = 'PRIMARY KEY';
```
**Result**:
- `categories`: PK on `id` (`categories_pkey`)
- `ingredients`: PK on `id` (`ingredients_pkey`)

```sql
-- 2. Foreign Key Relationship Verification
SELECT tc.table_name AS child_table, kcu.column_name AS fk_column,
       ccu.table_name AS parent_table, ccu.column_name AS pk_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'ingredients';
```
**Result**:
- `ingredients.category_id` strictly references `categories.id` (`ingredients_category_id_fkey`).
- `ingredients` contains **0 redundant category name columns**.
- All columns have atomic scalar data types (`INTEGER`, `TEXT`).
