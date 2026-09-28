require('dotenv').config()

const express = require('express')
const cors = require('cors')
const { GoogleGenerativeAI } = require('@google/generative-ai')

const app = express()
const PORT = 5000

app.use(cors())
app.use(express.json())

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

app.get('/', (req, res) => {
    res.send('Morselo backend is running!')
})

app.get('/api/ingredients', (req, res) => {
    const ingredients = ['Eggs', 'Tomato', 'Onion', 'Rice', 'Potato', 'Cheese']
    res.json(ingredients)
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

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`)
})