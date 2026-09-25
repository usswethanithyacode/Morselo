const express = require('express')
const cors = require('cors')

const app = express()
const PORT = 5000

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send('Morselo backend is running!')
})

app.get('/api/ingredients', (req, res) => {
    const ingredients = ['Eggs', 'Tomato', 'Onion', 'Rice', 'Potato', 'Cheese']
    res.json(ingredients)
})

app.post('/api/recipes/generate', (req, res) => {
    const { ingredients } = req.body

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({
            error: 'Please provide at least one ingredient.',
        })
    }

    res.status(200).json({
        message: 'Ingredients received successfully!',
        ingredients: ingredients,
        recipe: {
            name: 'Your Morselo recipe idea',
            description: `A simple dish made with ${ingredients.join(', ')}.`,
        },
    })
})

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`)
})