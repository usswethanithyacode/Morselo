const { Sequelize, DataTypes } = require('sequelize')

let sequelize

function getSequelize() {
    if (!sequelize) {
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL is not defined in environment variables.')
        }

        sequelize = new Sequelize(process.env.DATABASE_URL, {
            dialect: 'postgres',
            dialectOptions: {
                ssl: {
                    rejectUnauthorized: false,
                },
            },
            logging: false,
        })
    }
    return sequelize
}

const db = getSequelize()

// 1. Category Model
const Category = db.define(
    'Category',
    {
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
    },
    {
        tableName: 'categories',
        timestamps: false,
    }
)

// 2. Ingredient Model
const Ingredient = db.define(
    'Ingredient',
    {
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
    },
    {
        tableName: 'ingredients',
        timestamps: false,
    }
)

// 3. Relational Associations (PK/FK)
Category.hasMany(Ingredient, { foreignKey: 'category_id' })
Ingredient.belongsTo(Category, { foreignKey: 'category_id' })

async function initDatabase() {
    try {
        // Authenticate database connection
        await db.authenticate()

        // Non-destructive sync to verify schema
        await db.sync()

        // Ensure foreign key index exists for optimal JOIN performance
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_ingredients_category_id ON ingredients(category_id);
        `)

        await seedCatalog()
        console.log('PostgreSQL ingredient catalog initialized with Sequelize ORM.')
        return db
    } catch (error) {
        console.error('Failed to initialize Sequelize PostgreSQL database:', error.message)
        throw error
    }
}

async function seedCatalog() {
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
        const [categoryRecord] = await Category.findOrCreate({
            where: { name: item.category },
            defaults: { name: item.category },
        })

        for (const ingName of item.ingredients) {
            await Ingredient.findOrCreate({
                where: { name: ingName },
                defaults: {
                    name: ingName,
                    category_id: categoryRecord.id,
                },
            })
        }
    }
}

async function getCatalogIngredients(options = {}) {
    const { category, sort } = options

    let orderClause
    if (sort) {
        const normalizedSort = typeof sort === 'string' ? sort.trim().toLowerCase() : ''
        if (normalizedSort === 'asc') {
            orderClause = [['name', 'ASC']]
        } else if (normalizedSort === 'desc') {
            orderClause = [['name', 'DESC']]
        } else {
            throw new Error('Invalid sort parameter.')
        }
    } else {
        orderClause = [
            [{ model: Category }, 'name', 'ASC'],
            ['name', 'ASC'],
        ]
    }

    const includeClause = {
        model: Category,
        attributes: ['name'],
        required: true,
    }

    if (category && typeof category === 'string' && category.trim().length > 0) {
        includeClause.where = {
            name: category.trim(),
        }
    }

    const ingredients = await Ingredient.findAll({
        attributes: ['id', 'name'],
        include: [includeClause],
        order: orderClause,
    })

    return ingredients.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.Category ? item.Category.name : null,
    }))
}

module.exports = {
    sequelize: db,
    Category,
    Ingredient,
    initDatabase,
    getCatalogIngredients,
}
