const { Pool } = require('pg')

let pool

function getPool() {
    if (!pool) {
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL is not defined in environment variables.')
        }

        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false,
            },
        })
    }
    return pool
}

async function initDatabase() {
    const db = getPool()

    try {
        // Verify database connectivity
        await db.query('SELECT 1')

        // Create categories table
        await db.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL UNIQUE
            );
        `)

        // Create ingredients table with foreign key reference to categories
        await db.query(`
            CREATE TABLE IF NOT EXISTS ingredients (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT
            );
        `)

        // Create index on foreign key category_id to optimize JOINs and category filtering
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_ingredients_category_id ON ingredients(category_id);
        `)

        await seedCatalog(db)
        console.log('PostgreSQL ingredient catalog initialized successfully.')
        return db
    } catch (error) {
        console.error('Failed to initialize PostgreSQL database:', error.message)
        throw error
    }
}

async function seedCatalog(db) {
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

    for (const item of seedData) {
        await db.query(
            `INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING;`,
            [item.category]
        )

        const catRes = await db.query(
            `SELECT id FROM categories WHERE name = $1;`,
            [item.category]
        )

        if (catRes.rows.length > 0) {
            const categoryId = catRes.rows[0].id
            for (const ingName of item.ingredients) {
                await db.query(
                    `INSERT INTO ingredients (name, category_id) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING;`,
                    [ingName, categoryId]
                )
            }
        }
    }
}

async function getCatalogIngredients(options = {}) {
    const db = getPool()
    const { category, sort } = options
    const params = []
    let query = `
        SELECT 
            ingredients.id AS id,
            ingredients.name AS name,
            categories.name AS category
        FROM ingredients
        INNER JOIN categories ON ingredients.category_id = categories.id
    `

    if (category && typeof category === 'string' && category.trim().length > 0) {
        params.push(category.trim())
        query += ` WHERE categories.name = $${params.length}`
    }

    if (sort) {
        const normalizedSort = typeof sort === 'string' ? sort.trim().toLowerCase() : ''
        if (normalizedSort === 'asc') {
            query += ` ORDER BY ingredients.name ASC`
        } else if (normalizedSort === 'desc') {
            query += ` ORDER BY ingredients.name DESC`
        } else {
            throw new Error('Invalid sort parameter.')
        }
    } else {
        query += ` ORDER BY categories.name ASC, ingredients.name ASC`
    }

    const result = await db.query(query, params)
    return result.rows
}

module.exports = {
    initDatabase,
    getCatalogIngredients,
    getPool,
}
