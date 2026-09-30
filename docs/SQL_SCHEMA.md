# Morselo SQL Relational Database Architecture & ORM Design

This document describes the relational database design for Morselo's Ingredient Catalog using **PostgreSQL** (hosted on **Neon**) with the **Sequelize ORM** (`sequelize` / `pg`).

---

## 1. Overview & Separation of Concerns

- **PostgreSQL (Neon)**: Stores normalized, relational catalog data (ingredients categorized under taxonomy buckets). Managed via **Sequelize ORM** with SSL enabled.
- **MongoDB Atlas**: Stores flexible recipe documents (name, description, ingredients list, cooking steps, timestamps) via **Mongoose**.

---

## 2. Relational Schema Design

The catalog is modeled around two normalized relational tables with explicit Primary Key (PK) and Foreign Key (FK) constraints:

```sql
-- 1. Categories Table (Parent)
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- 2. Ingredients Table (Child)
CREATE TABLE IF NOT EXISTS ingredients (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT
);

-- 3. Foreign Key Index on Child Table
CREATE INDEX IF NOT EXISTS idx_ingredients_category_id ON ingredients(category_id);
```

### Table Relationships & Keys
- **`categories` Table**:
  - `id`: `SERIAL PRIMARY KEY` (Primary Key). Uniquely identifies each category.
  - `name`: `TEXT NOT NULL UNIQUE`. Category name (e.g., "Dairy & Eggs", "Vegetables", "Pantry & Grains").
- **`ingredients` Table**:
  - `id`: `SERIAL PRIMARY KEY` (Primary Key). Uniquely identifies each ingredient.
  - `name`: `TEXT NOT NULL UNIQUE`. Name of the ingredient (e.g., "Eggs", "Cheese", "Tomato").
  - `category_id`: `INTEGER NOT NULL REFERENCES categories(id)` (Foreign Key). Enforces relational integrity so that every ingredient must belong to a valid category.

---

## 3. ORM Usage — Sequelize

Morselo utilizes the **Sequelize ORM** (`sequelize` v6) to define relational models, manage associations, and execute relational `INNER JOIN` queries.

### Model Definitions & Associations ([server/db.js](file:///c:/Users/usswe/OneDrive/Desktop/Morselo/server/db.js))

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

### ORM Eager Loading (`INNER JOIN`) Query

The `getCatalogIngredients()` function uses Sequelize's `findAll` with eager loading (`include: [Category]`):

```javascript
const ingredients = await Ingredient.findAll({
    attributes: ['id', 'name'],
    include: [{
        model: Category,
        attributes: ['name'],
        required: true, // Forces INNER JOIN
        where: category ? { name: category } : undefined, // Parameterized filtering
    }],
    order: sort
        ? [['name', sort.toUpperCase()]]
        : [[{ model: Category }, 'name', 'ASC'], ['name', 'ASC']],
})
```

---

## 4. SQL Transactions (ACID Guarantees)

Morselo implements **Sequelize Managed Transactions** to ensure multi-step database writes adhere to **ACID** (Atomicity, Consistency, Isolation, Durability) guarantees.

### 1. What is a Transaction in Morselo?
When adding a new category and its associated ingredients (e.g., importing a whole category batch), multiple rows must be written across both the `categories` and `ingredients` tables. A transaction guarantees that:
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
When all operations inside the `sequelize.transaction(...)` callback resolve successfully without errors, Sequelize automatically issues a `COMMIT` command to PostgreSQL:
```sql
START TRANSACTION;
SELECT ... FROM "categories" ...;
INSERT INTO "categories" ...;
INSERT INTO "ingredients" ...;
COMMIT;
```
All rows become permanently visible and consistent.

### 4. How Rollback Works
If any step inside the callback fails (such as an invalid data type, constraint violation, or thrown error), Sequelize automatically catches the exception and issues a `ROLLBACK` command to PostgreSQL:
```sql
START TRANSACTION;
INSERT INTO "categories" ...;
-- Error encountered on ingredient insertion
ROLLBACK;
```
The database is completely restored to its state prior to the transaction, guaranteeing that neither the category nor any partial ingredients are persisted.

---

## 5. Relational Indexing & Query Optimization

- **Foreign Key Index (`idx_ingredients_category_id`)**: Accelerates foreign key lookups when joining `ingredients` with `categories` and filtering by category name.
- Non-destructive startup synchronization ensures indexes and tables exist without altering existing data.

---

## 6. Seed Data & Idempotence

The initialization routine seeds standard categories and ingredients idempotently inside a managed transaction using `findOrCreate`:

| Category | Ingredients |
| :--- | :--- |
| **Dairy & Eggs** | Eggs, Cheese |
| **Vegetables** | Tomato, Onion, Potato |
| **Pantry & Grains** | Rice |

---

## 7. Query Parameters & API Examples

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

5. **Batch Transaction Endpoint**
   - **Request**: `POST /api/ingredients/batch`
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
