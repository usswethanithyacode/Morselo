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

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`)
})