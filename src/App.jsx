import { useState } from 'react'
import './App.css'

function App() {
  const [ingredients, setIngredients] = useState([
    'Eggs',
    'Tomato',
    'Onion',
    'Rice',
    'Potato',
    'Cheese',
  ])

  const [newIngredient, setNewIngredient] = useState('')
  const [selectedIngredients, setSelectedIngredients] = useState([])

  function toggleIngredient(ingredient) {
    if (selectedIngredients.includes(ingredient)) {
      setSelectedIngredients(
        selectedIngredients.filter((item) => item !== ingredient)
      )
    } else {
      setSelectedIngredients([...selectedIngredients, ingredient])
    }
  }
  function addIngredient() {
    const cleanedIngredient = newIngredient.trim()

    if (cleanedIngredient === '') {
      return
    }

    const alreadyExists = ingredients.some(
      (item) => item.toLowerCase() === cleanedIngredient.toLowerCase()
    )

    if (alreadyExists) {
      return
    }

    setIngredients([...ingredients, cleanedIngredient])
    setSelectedIngredients([...selectedIngredients, cleanedIngredient])
    setNewIngredient('')
  }
  return (
    <main>
      <header className="topbar">
        <span className="brand">Morselo</span>
        <span className="tagline">A little inspiration for your kitchen</span>
      </header>

      <section className="welcome">
        <p className="eyebrow">YOUR LITTLE RECIPE CORNER</p>
        <h1>What’s in your kitchen?</h1>
        <p className="intro">
          Pick the ingredients you have. Let’s find something lovely to make.
        </p>
      </section>

      <section className="ingredient-section">
        <h2>Choose your ingredients</h2>

        <div className="ingredient-list">
          {ingredients.map((ingredient) => (
            <button
              key={ingredient}
              className={
                selectedIngredients.includes(ingredient)
                  ? 'ingredient selected'
                  : 'ingredient'
              }
              onClick={() => toggleIngredient(ingredient)}
            >
              {ingredient}
            </button>
          ))}
        </div>
        <form
          className="add-ingredient-form"
          onSubmit={(event) => {
            event.preventDefault()
            addIngredient()
          }}
        >
          <input
            type="text"
            value={newIngredient}
            onChange={(event) => setNewIngredient(event.target.value)}
            placeholder="Add an ingredient..."
          />

          <button type="submit">Add</button>
        </form>

        <p className="selection-count">
          {selectedIngredients.length === 0
            ? 'No ingredients selected yet'
            : `${selectedIngredients.length} ingredient(s) selected`}
        </p>
      </section>
    </main>
  )
}

export default App