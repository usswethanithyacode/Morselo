# Morselo SQL Relational Database Architecture

This document describes the relational database design for Morselo's Ingredient Catalog using **PostgreSQL** (hosted on **Neon**) with the `pg` driver.

---

## 1. Overview & Separation of Concerns

- **PostgreSQL (Neon)**: Stores normalized, relational catalog data (ingredients categorized under taxonomy buckets). Configured via `DATABASE_URL` with SSL enabled.
- **MongoDB Atlas**: Stores flexible recipe documents (name, description, ingredients list, cooking steps, timestamps).

---

## 2. Relational Schema Design

The catalog uses two normalized relational tables with explicit Primary Key (PK) and Foreign Key (FK) constraints:

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

## 3. Relational Indexing & Query Optimization

### Why `idx_ingredients_category_id` was Added
1. **Foreign Key Indexing**: PostgreSQL automatically creates unique b-tree indexes for `PRIMARY KEY` and `UNIQUE` constraints (e.g., `categories_pkey`, `categories_name_key`, and `ingredients_name_key`), but **foreign keys are not automatically indexed**.
2. **Accelerating JOIN and Filter Operations**: When filtering by category (e.g., `WHERE categories.name = $1`), PostgreSQL looks up the category row using its unique index on `name`, then performs a foreign key lookup on `ingredients.category_id`. With `idx_ingredients_category_id`, PostgreSQL performs an indexed index scan (`Bitmap Index Scan on idx_ingredients_category_id`) rather than scanning all rows in `ingredients`.

---

## 4. Seed Data & Idempotence

The initialization routine seeds standard categories and ingredients idempotently using PostgreSQL `ON CONFLICT (name) DO NOTHING`:

| Category | Ingredients |
| :--- | :--- |
| **Dairy & Eggs** | Eggs, Cheese |
| **Vegetables** | Tomato, Onion, Potato |
| **Pantry & Grains** | Rice |

Because `name` fields are `UNIQUE` and queries use `ON CONFLICT (name) DO NOTHING`, restarting the server or running initialization multiple times will never duplicate data.

---

## 5. Relational SQL JOIN Query

The `GET /api/ingredients` endpoint queries PostgreSQL using an `INNER JOIN` to fetch ingredients combined with their corresponding category names.

### Base Query (Default)
```sql
SELECT 
    ingredients.id AS id,
    ingredients.name AS name,
    categories.name AS category
FROM ingredients
INNER JOIN categories ON ingredients.category_id = categories.id
ORDER BY categories.name ASC, ingredients.name ASC;
```

### Query with Category Filter (Parameterized)
When `category` is supplied (e.g. `?category=Vegetables`), a parameterized `WHERE` clause is applied using PostgreSQL `$1` placeholders to prevent SQL injection:
```sql
SELECT 
    ingredients.id AS id,
    ingredients.name AS name,
    categories.name AS category
FROM ingredients
INNER JOIN categories ON ingredients.category_id = categories.id
WHERE categories.name = $1
ORDER BY categories.name ASC, ingredients.name ASC;
```

### Query with Name Sorting
When `sort` is supplied (`asc` or `desc`, validated against an allowlist):
```sql
SELECT 
    ingredients.id AS id,
    ingredients.name AS name,
    categories.name AS category
FROM ingredients
INNER JOIN categories ON ingredients.category_id = categories.id
ORDER BY ingredients.name ASC; -- or DESC
```

---

## 6. Query Parameters & API Examples

The `GET /api/ingredients` endpoint accepts two optional query parameters:

| Parameter | Allowed Values | Description |
| :--- | :--- | :--- |
| `category` | String (e.g. `Vegetables`, `Dairy & Eggs`) | Filters ingredients by category name using parameterized SQL (`$1`). |
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

5. **Invalid Sort Parameter**
   - **Request**: `GET /api/ingredients?sort=invalid`
   - **Response Status**: `400 Bad Request`
   - **Response Body**:
     ```json
     {
       "error": "Invalid sort parameter. Allowed values are \"asc\" or \"desc\"."
     }
     ```

6. **Unknown Category**
   - **Request**: `GET /api/ingredients?category=DoesNotExist`
   - **Response**:
     ```json
     []
     ```
