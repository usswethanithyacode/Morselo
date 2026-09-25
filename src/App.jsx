import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [ingredients, setIngredients] = useState([])
  const [newIngredient, setNewIngredient] = useState('')
  const [selectedIngredients, setSelectedIngredients] = useState([])
  const [showRecipes, setShowRecipes] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchIngredients() {
      try {
        const response = await fetch('http://localhost:5000/api/ingredients')

        if (!response.ok) {
          throw new Error('Could not load ingredients.')
        }

        const data = await response.json()
        setIngredients(data)
      } catch (error) {
        setError('Could not connect to Morselo. Is the backend running?')
      } finally {
        setLoading(false)
      }
    }

    fetchIngredients()
  }, [])

  function toggleIngredient(ingredient) {
    if (selectedIngredients.includes(ingredient)) {
      setSelectedIngredients(
        selectedIngredients.filter((item) => item !== ingredient)
      )
    } else {
      setSelectedIngredients([...selectedIngredients, ingredient])
    }

    setShowRecipes(false)
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
    setShowRecipes(false)
  }

  function generateRecipes() {
    setShowRecipes(true)
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

        {loading && <p>Loading ingredients...</p>}

        {error && <p role="alert">{error}</p>}

        {!loading && !error && (
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
                type="button"
              >
                {ingredient}
              </button>
            ))}
          </div>
        )}

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

        <button
          className="generate-button"
          disabled={selectedIngredients.length === 0}
          onClick={generateRecipes}
          type="button"
        >
          Generate recipes
        </button>

        {showRecipes && (
          <section className="recipe-card">
            <p className="eyebrow">A LITTLE KITCHEN INSPIRATION</p>
            <h2>Your ingredient mix</h2>
            <p>You picked: {selectedIngredients.join(', ')}</p>
            <p>
              Morselo will use these ingredients to find recipe ideas.
            </p>
          </section>
        )}

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