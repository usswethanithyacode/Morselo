# Morselo SQL Relational Database Architecture

This document describes the relational database design for Morselo's Ingredient Catalog using **SQLite** with `better-sqlite3`.

---

## 1. Overview & Separation of Concerns

- **SQLite Database (`morselo.db`)**: Stores normalized, relational catalog data (ingredients categorized under taxonomy buckets). Excluded from version control via `.gitignore`.
- **MongoDB Atlas**: Stores flexible recipe documents (name, description, ingredients list, cooking steps, timestamps).

---

## 2. Relational Schema Design

The catalog uses two normalized relational tables with explicit Primary Key (PK) and Foreign Key (FK) constraints:

```sql
-- 1. Categories Table (Parent)
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

-- 2. Ingredients Table (Child)
CREATE TABLE IF NOT EXISTS ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    category_id INTEGER NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);
```

### Table Relationships & Keys
- **`categories` Table**:
  - `id`: `INTEGER PRIMARY KEY AUTOINCREMENT` (Primary Key). Uniquely identifies each ingredient category.
  - `name`: `TEXT NOT NULL UNIQUE`. Category name (e.g., "Dairy & Eggs", "Vegetables", "Pantry & Grains").
- **`ingredients` Table**:
  - `id`: `INTEGER PRIMARY KEY AUTOINCREMENT` (Primary Key). Uniquely identifies each ingredient.
  - `name`: `TEXT NOT NULL UNIQUE`. Name of the ingredient (e.g., "Eggs", "Cheese", "Tomato").
  - `category_id`: `INTEGER NOT NULL` (Foreign Key). References `categories(id)`. Ensures referential integrity.

### Foreign Key Enforcement
SQLite requires foreign keys to be explicitly enabled per connection. During database initialization in `server/db.js`, foreign key enforcement is turned on:
```sql
PRAGMA foreign_keys = ON;
```

---

## 3. Seed Data & Idempotence

The initialization routine seeds standard categories and ingredients idempotently using `INSERT OR IGNORE`:

| Category | Ingredients |
| :--- | :--- |
| **Dairy & Eggs** | Eggs, Cheese |
| **Vegetables** | Tomato, Onion, Potato |
| **Pantry & Grains** | Rice |

Because `name` fields are `UNIQUE` and queries use `INSERT OR IGNORE`, restarting the server or re-running initialization will not duplicate data.

---

## 4. Relational SQL JOIN Query

The `GET /api/ingredients` endpoint queries SQLite using an `INNER JOIN` to fetch ingredients combined with their corresponding category names, sorted alphabetically by category and then ingredient:

```sql
SELECT 
    ingredients.id AS id,
    ingredients.name AS name,
    categories.name AS category
FROM ingredients
INNER JOIN categories ON ingredients.category_id = categories.id
ORDER BY categories.name ASC, ingredients.name ASC;
```

### Query Result Example:
| id | name | category |
| :--- | :--- | :--- |
| 2 | Cheese | Dairy & Eggs |
| 1 | Eggs | Dairy & Eggs |
| 6 | Rice | Pantry & Grains |
| 4 | Onion | Vegetables |
| 5 | Potato | Vegetables |
| 3 | Tomato | Vegetables |

The backend extracts the ingredient names from the JOIN result (`rows.map(r => r.name)`) to supply the array format expected by the frontend:
```json
[
  "Cheese",
  "Eggs",
  "Rice",
  "Onion",
  "Potato",
  "Tomato"
]
```
