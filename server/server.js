require('dotenv').config()

const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const { GoogleGenerativeAI } = require('@google/generative-ai')
const jwt = require('jsonwebtoken')
const Recipe = require('./models/Recipe')
const { initDatabase, getCatalogIngredients, addCategoryWithIngredients } = require('./db')
const authenticateToken = require('./middleware/auth')

const app = express()
const PORT = 5000

app.use(cors())
app.use(express.json())

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

app.get('/', (req, res) => {
    res.send('Morselo backend is running!')
})

// --- Authentication Endpoints (JWT) ---

app.post('/api/auth/login', (req, res) => {
    if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ error: 'Invalid request body.' })
    }

    const { email, username, password } = req.body
    const identity = (email || username || '').trim()

    if (!identity || !password || typeof password !== 'string' || password.trim().length === 0) {
        return res.status(400).json({
            error: 'Please provide both an email/username and a password.',
        })
    }

    const secret = process.env.JWT_SECRET || 'morselo_super_secret_jwt_key_2026'
    const payload = {
        id: 'user_' + Buffer.from(identity).toString('hex').slice(0, 8),
        email: identity.includes('@') ? identity : `${identity}@morselo.local`,
        username: identity.includes('@') ? identity.split('@')[0] : identity,
    }

    const token = jwt.sign(payload, secret, { expiresIn: '1h' })

    return res.status(200).json({
        message: 'Authentication successful',
        token,
        user: payload,
    })
})

app.get('/api/auth/me', authenticateToken, (req, res) => {
    return res.status(200).json({
        message: 'Authenticated user profile retrieved successfully',
        user: req.user,
    })
})

// --- Catalog & Recipe Endpoints ---

app.get('/api/ingredients', async (req, res) => {
    const { category, sort } = req.query

    if (sort !== undefined) {
        const normalizedSort = typeof sort === 'string' ? sort.trim().toLowerCase() : ''
        if (normalizedSort !== 'asc' && normalizedSort !== 'desc') {
            return res.status(400).json({
                error: 'Invalid sort parameter. Allowed values are "asc" or "desc".',
            })
        }
    }

    try {
        const catalogRows = await getCatalogIngredients({
            category: typeof category === 'string' ? category : undefined,
            sort: typeof sort === 'string' ? sort.trim().toLowerCase() : undefined,
        })
        const ingredients = catalogRows.map((row) => row.name)
        return res.status(200).json(ingredients)
    } catch (error) {
        console.error('Error fetching ingredient catalog:', error.message)
        return res.status(500).json({
            error: 'Could not fetch ingredients. Please try again.',
        })
    }
})

app.post('/api/ingredients/batch', authenticateToken, async (req, res) => {
    if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ error: 'Invalid request body.' })
    }

    const { category, ingredients } = req.body

    try {
        const result = await addCategoryWithIngredients({ category, ingredients })
        return res.status(201).json({
            message: 'Category and ingredients added atomically via transaction.',
            result,
        })
    } catch (error) {
        return res.status(400).json({
            error: error.message || 'Failed to process transaction.',
        })
    }
})

app.get('/api/recipes', async (req, res) => {
    try {
        const recipes = await Recipe.find().sort({ createdAt: -1 })
        return res.status(200).json(recipes)
    } catch (error) {
        console.error('Error fetching recipes:', error)
        return res.status(500).json({
            error: 'Could not fetch saved recipes. Please try again.',
        })
    }
})

app.post('/api/recipes', async (req, res) => {
    if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({
            error: 'Invalid request body.',
        })
    }

    const { name, description, ingredients, steps } = req.body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
            error: 'Recipe name must be a non-empty text string.',
        })
    }

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({
            error: 'Please provide at least one ingredient.',
        })
    }

    const hasInvalidIngredient = ingredients.some(
        (item) => typeof item !== 'string' || item.trim().length === 0
    )

    if (hasInvalidIngredient) {
        return res.status(400).json({
            error: 'Each ingredient must be a non-empty text string.',
        })
    }

    if (!Array.isArray(steps) || steps.length === 0) {
        return res.status(400).json({
            error: 'Please provide at least one cooking step.',
        })
    }

    const hasInvalidStep = steps.some(
        (item) => typeof item !== 'string' || item.trim().length === 0
    )

    if (hasInvalidStep) {
        return res.status(400).json({
            error: 'Each step must be a non-empty text string.',
        })
    }

    try {
        const newRecipe = new Recipe({
            name: name.trim(),
            description: typeof description === 'string' ? description.trim() : '',
            ingredients: ingredients.map((item) => item.trim()),
            steps: steps.map((item) => item.trim()),
        })

        const savedRecipe = await newRecipe.save()
        return res.status(201).json(savedRecipe)
    } catch (error) {
        console.error('Error saving recipe:', error)
        return res.status(500).json({
            error: 'Could not save the recipe. Please try again.',
        })
    }
})

app.put('/api/recipes/:id', async (req, res) => {
    const { id } = req.params

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            error: 'Invalid recipe ID format.',
        })
    }

    if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({
            error: 'Invalid request body.',
        })
    }

    const { name, description, ingredients, steps } = req.body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
            error: 'Recipe name must be a non-empty text string.',
        })
    }

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({
            error: 'Please provide at least one ingredient.',
        })
    }

    const hasInvalidIngredient = ingredients.some(
        (item) => typeof item !== 'string' || item.trim().length === 0
    )

    if (hasInvalidIngredient) {
        return res.status(400).json({
            error: 'Each ingredient must be a non-empty text string.',
        })
    }

    if (!Array.isArray(steps) || steps.length === 0) {
        return res.status(400).json({
            error: 'Please provide at least one cooking step.',
        })
    }

    const hasInvalidStep = steps.some(
        (item) => typeof item !== 'string' || item.trim().length === 0
    )

    if (hasInvalidStep) {
        return res.status(400).json({
            error: 'Each step must be a non-empty text string.',
        })
    }

    try {
        const updatedRecipe = await Recipe.findByIdAndUpdate(
            id,
            {
                name: name.trim(),
                description: typeof description === 'string' ? description.trim() : '',
                ingredients: ingredients.map((item) => item.trim()),
                steps: steps.map((item) => item.trim()),
            },
            { new: true, runValidators: true }
        )

        if (!updatedRecipe) {
            return res.status(404).json({
                error: 'Recipe not found.',
            })
        }

        return res.status(200).json(updatedRecipe)
    } catch (error) {
        console.error('Error updating recipe:', error)
        return res.status(500).json({
            error: 'Could not update the recipe. Please try again.',
        })
    }
})

app.delete('/api/recipes/:id', async (req, res) => {
    const { id } = req.params

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            error: 'Invalid recipe ID format.',
        })
    }

    try {
        const deletedRecipe = await Recipe.findByIdAndDelete(id)

        if (!deletedRecipe) {
            return res.status(404).json({
                error: 'Recipe not found.',
            })
        }

        return res.status(200).json({
            message: 'Recipe deleted successfully.',
            recipe: deletedRecipe,
        })
    } catch (error) {
        console.error('Error deleting recipe:', error)
        return res.status(500).json({
            error: 'Could not delete the recipe. Please try again.',
        })
    }
})

app.post('/api/recipes/generate', async (req, res) => {
    if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({
            error: 'Invalid request body.',
        })
    }

    const { ingredients } = req.body

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({
            error: 'Please provide at least one ingredient.',
        })
    }

    const hasInvalidIngredient = ingredients.some(
        (item) => typeof item !== 'string' || item.trim().length === 0
    )

    if (hasInvalidIngredient) {
        return res.status(400).json({
            error: 'Each ingredient must be a non-empty text string.',
        })
    }

    const cleanedIngredients = ingredients.map((item) => item.trim())

    if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
            error: 'The AI service is not configured on the server.',
        })
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

        const prompt = `
You are Morselo, a friendly recipe assistant.
Create one simple recipe using these available ingredients: ${cleanedIngredients.join(', ')}.

Return only valid JSON in this exact format:
{
  "name": "Recipe name",
  "description": "One-sentence description",
  "ingredients": ["ingredient with amount"],
  "steps": ["Step 1", "Step 2", "Step 3"]
}

You may include basic pantry staples like salt, pepper, and oil.
Do not use ingredients from the list as if the user has them unless they were provided.
`

        const result = await model.generateContent(prompt)
        const responseText = result.response.text()
        const cleanedText = responseText.replace(/```json|```/g, '').trim()
        const recipe = JSON.parse(cleanedText)

        return res.status(200).json({ recipe })
    } catch (error) {
        console.error('Recipe generation error:', error)
        return res.status(500).json({
            error: 'Could not generate a recipe right now. Please try again.',
        })
    }
})

async function startServer() {
    try {
        await initDatabase()
    } catch (error) {
        console.error('PostgreSQL initialization error:', error.message)
    }

    if (!process.env.MONGODB_URI) {
        console.error('Error: MONGODB_URI is not defined in the environment variables.')
        return
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI)
        console.log('Connected to MongoDB Atlas successfully.')

        app.listen(PORT, () => {
            console.log(`Server is running at http://localhost:${PORT}`)
        })
    } catch (error) {
        const safeMessage = (error.message || '').replace(/mongodb(\+srv)?:\/\/[^@]+@/gi, 'mongodb+srv://[credentials-hidden]@')
        console.error(`MongoDB connection error [${error.name || 'Error'}]: ${safeMessage}`)
    }
}

startServer()