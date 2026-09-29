const path = require('path')
const Database = require('better-sqlite3')

const dbPath = path.join(__dirname, 'morselo.db')
let db

function initDatabase() {
    try {
        db = new Database(dbPath)
        db.pragma('foreign_keys = ON')

        // Create categories table
        db.exec(`
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE
            );
        `)

        // Create ingredients table with foreign key reference to categories
        db.exec(`
            CREATE TABLE IF NOT EXISTS ingredients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                category_id INTEGER NOT NULL,
                FOREIGN KEY (category_id) REFERENCES categories(id)
            );
        `)

        seedCatalog()
        console.log('SQLite ingredient catalog initialized successfully.')
        return db
    } catch (error) {
        console.error('Failed to initialize SQLite database:', error.message)
        throw error
    }
}

function seedCatalog() {
    const seedData = [
        {
            category: 'Dairy & Eggs',
            ingredients: ['Eggs', 'Cheese'],
        },
        {
            category: 'Vegetables',
            ingredients: ['Tomato', 'Onion', 'Potato'],
        },
        {
            category: 'Pantry & Grains',
            ingredients: ['Rice'],
        },
    ]

    const insertCategory = db.prepare(`
        INSERT OR IGNORE INTO categories (name) VALUES (?)
    `)

    const getCategoryId = db.prepare(`
        SELECT id FROM categories WHERE name = ?
    `)

    const insertIngredient = db.prepare(`
        INSERT OR IGNORE INTO ingredients (name, category_id) VALUES (?, ?)
    `)

    const seedTransaction = db.transaction(() => {
        for (const item of seedData) {
            insertCategory.run(item.category)
            const catRow = getCategoryId.get(item.category)
            if (catRow && catRow.id) {
                for (const ingName of item.ingredients) {
                    insertIngredient.run(ingName, catRow.id)
                }
            }
        }
    })

    seedTransaction()
}

function getCatalogIngredients() {
    if (!db) {
        throw new Error('Database is not initialized.')
    }

    // Demonstrates relational INNER JOIN query between ingredients and categories
    const query = `
        SELECT 
            ingredients.id AS id,
            ingredients.name AS name,
            categories.name AS category
        FROM ingredients
        INNER JOIN categories ON ingredients.category_id = categories.id
        ORDER BY categories.name ASC, ingredients.name ASC
    `

    const stmt = db.prepare(query)
    return stmt.all()
}

module.exports = {
    initDatabase,
    getCatalogIngredients,
    getDb: () => db,
}
