require('dotenv').config()

const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const { GoogleGenerativeAI } = require('@google/generative-ai')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const Recipe = require('./models/Recipe')
const User = require('./models/User')
const { initDatabase, getCatalogIngredients, addCategoryWithIngredients } = require('./db')
const { authenticateToken, requireRole } = require('./middleware/auth')

const app = express()
const PORT = 5000

app.use(cors())
app.use(express.json())

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

app.get('/', (req, res) => {
    res.send('Morselo backend is running!')
})

// --- Authentication Endpoints (JWT + Password Hashing + RBAC) ---

app.post('/api/auth/register', async (req, res) => {
    if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ error: 'Invalid request body.' })
    }

    const { email, username, password } = req.body
    const cleanEmail = (email || '').trim().toLowerCase()
    const cleanUsername = (username || (cleanEmail ? cleanEmail.split('@')[0] : '')).trim()

    if (!cleanEmail || !password || typeof password !== 'string' || password.trim().length === 0) {
        return res.status(400).json({
            error: 'Please provide both an email and a password.',
        })
    }

    if (password.length < 6) {
        return res.status(400).json({
            error: 'Password must be at least 6 characters long.',
        })
    }

    try {
        const existingUser = await User.findOne({ email: cleanEmail })
        if (existingUser) {
            return res.status(409).json({
                error: 'A user with this email already exists.',
            })
        }

        // Generate salt and hash the plaintext password using bcrypt (work factor 10)
        const saltRounds = 10
        const passwordHash = await bcrypt.hash(password, saltRounds)

        // Store user document with hashed password and default "user" role
        // Ignore any body.role to prevent privilege escalation
        const newUser = await User.create({
            email: cleanEmail,
            username: cleanUsername,
            passwordHash,
            role: 'user',
        })

        const secret = process.env.JWT_SECRET || 'morselo_super_secret_jwt_key_2026'
        const payload = {
            id: newUser._id.toString(),
            email: newUser.email,
            username: newUser.username,
            role: newUser.role || 'user',
        }

        const token = jwt.sign(payload, secret, { expiresIn: '1h' })

        return res.status(201).json({
            message: 'User registered successfully',
            token,
            user: payload,
        })
    } catch (err) {
        console.error('Error during user registration:', err.message)
        return res.status(500).json({ error: 'Internal server error during registration.' })
    }
})

app.post('/api/auth/login', async (req, res) => {
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

    try {
        const cleanIdentity = identity.toLowerCase()
        const user = await User.findOne({
            $or: [{ email: cleanIdentity }, { username: identity }],
        })

        if (!user) {
            return res.status(401).json({
                error: 'Invalid email/username or password.',
            })
        }

        // Verify submitted plaintext password against stored cryptographic hash
        const isMatch = await bcrypt.compare(password, user.passwordHash)
        if (!isMatch) {
            return res.status(401).json({
                error: 'Invalid email/username or password.',
            })
        }

        const userRole = user.role || 'user'
        const secret = process.env.JWT_SECRET || 'morselo_super_secret_jwt_key_2026'
        const payload = {
            id: user._id.toString(),
            email: user.email,
            username: user.username,
            role: userRole,
        }

        const token = jwt.sign(payload, secret, { expiresIn: '1h' })

        return res.status(200).json({
            message: 'Authentication successful',
            token,
            user: payload,
        })
    } catch (err) {
        console.error('Error during user login:', err.message)
        return res.status(500).json({ error: 'Internal server error during login.' })
    }
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

app.post('/api/ingredients/batch', authenticateToken, requireRole('admin'), async (req, res) => {
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

// --- MongoDB Aggregation Pipeline: Recipe Ingredient Analytics ---
app.get('/api/recipes/stats', async (req, res) => {
    try {
        const pipeline = [
            // Stage 1: Match documents having a non-empty ingredients array
            {
                $match: {
                    ingredients: { $exists: true, $type: 'array', $ne: [] },
                },
            },
            // Stage 2: Deconstruct ingredients array into individual documents
            {
                $unwind: '$ingredients',
            },
            // Stage 3: Filter for non-empty string entries
            {
                $match: {
                    ingredients: { $type: 'string', $regex: /\S/ },
                },
            },
            // Stage 4: Group by trimmed ingredient name and count occurrences
            {
                $group: {
                    _id: { $trim: { input: '$ingredients' } },
                    recipeCount: { $sum: 1 },
                },
            },
            // Stage 5: Sort by frequency descending, then ingredient name alphabetically
            {
                $sort: {
                    recipeCount: -1,
                    _id: 1,
                },
            },
            // Stage 6: Project clean output fields
            {
                $project: {
                    _id: 0,
                    ingredient: '$_id',
                    recipeCount: 1,
                },
            },
        ]

        // Optional query parameter ?limit=N
        if (req.query.limit) {
            const parsedLimit = parseInt(req.query.limit, 10)
            if (!isNaN(parsedLimit) && parsedLimit > 0) {
                pipeline.push({ $limit: parsedLimit })
            }
        }

        const stats = await Recipe.aggregate(pipeline)
        return res.status(200).json(stats)
    } catch (error) {
        console.error('Error calculating recipe statistics via aggregation:', error)
        return res.status(500).json({
            error: 'Could not calculate recipe statistics. Please try again.',
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

        // Clean up references from any User document to prevent orphaned ObjectIds
        await User.updateMany(
            { savedRecipes: id },
            { $pull: { savedRecipes: id } }
        )

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

// --- User Referenced Saved Recipes Endpoints (MongoDB Referencing & Populate) ---

app.get('/api/users/saved-recipes', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('savedRecipes')
        if (!user) {
            return res.status(404).json({ error: 'User not found.' })
        }
        // Filter out any null elements in case a referenced document was removed
        const validRecipes = (user.savedRecipes || []).filter(Boolean)
        return res.status(200).json(validRecipes)
    } catch (error) {
        console.error('Error fetching user saved recipes:', error)
        return res.status(500).json({ error: 'Could not fetch saved recipes.' })
    }
})

app.post('/api/users/saved-recipes/:recipeId', authenticateToken, async (req, res) => {
    const { recipeId } = req.params

    if (!mongoose.Types.ObjectId.isValid(recipeId)) {
        return res.status(400).json({ error: 'Invalid recipe ID format.' })
    }

    try {
        const recipe = await Recipe.findById(recipeId)
        if (!recipe) {
            return res.status(404).json({ error: 'Recipe not found.' })
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $addToSet: { savedRecipes: recipe._id } },
            { new: true }
        ).populate('savedRecipes')

        return res.status(200).json({
            message: 'Recipe added to saved recipes successfully.',
            savedRecipes: (updatedUser.savedRecipes || []).filter(Boolean),
        })
    } catch (error) {
        console.error('Error saving recipe reference:', error)
        return res.status(500).json({ error: 'Could not save recipe reference.' })
    }
})

app.delete('/api/users/saved-recipes/:recipeId', authenticateToken, async (req, res) => {
    const { recipeId } = req.params

    if (!mongoose.Types.ObjectId.isValid(recipeId)) {
        return res.status(400).json({ error: 'Invalid recipe ID format.' })
    }

    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $pull: { savedRecipes: recipeId } },
            { new: true }
        ).populate('savedRecipes')

        return res.status(200).json({
            message: 'Recipe removed from saved recipes successfully.',
            savedRecipes: (updatedUser.savedRecipes || []).filter(Boolean),
        })
    } catch (error) {
        console.error('Error removing recipe reference:', error)
        return res.status(500).json({ error: 'Could not remove recipe reference.' })
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