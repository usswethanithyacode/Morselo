import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [ingredients, setIngredients] = useState([])
  const [newIngredient, setNewIngredient] = useState('')
  const [selectedIngredients, setSelectedIngredients] = useState([])
  const [recipes, setRecipes] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
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

    setRecipes(null)
    setError('')
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
    setRecipes(null)
    setError('')
  }

  async function generateRecipes() {
    if (selectedIngredients.length === 0 || generating) {
      return
    }

    setGenerating(true)
    setRecipes(null)
    setError('')

    try {
      const response = await fetch(
        'http://localhost:5000/api/recipes/generate',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ingredients: selectedIngredients,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Could not generate recipes.')
      }

      setRecipes(data)
    } catch (error) {
      setError(
        error.message || 'Could not connect to Morselo. Is the backend running?'
      )
    } finally {
      setGenerating(false)
    }
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

        {!loading && (
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
          disabled={selectedIngredients.length === 0 || generating}
          onClick={generateRecipes}
          type="button"
        >
          {generating ? 'Generating...' : 'Generate recipes'}
        </button>

        {recipes?.recipe && (
          <section className="recipe-card">
            <p className="eyebrow">A LITTLE KITCHEN INSPIRATION</p>

            <h2>{recipes.recipe.name}</h2>
            <p>{recipes.recipe.description}</p>

            <h3>Ingredients</h3>
            <ul>
              {recipes.recipe.ingredients?.map((ingredient, index) => (
                <li key={index}>{ingredient}</li>
              ))}
            </ul>

            <h3>Cooking steps</h3>
            <ol>
              {recipes.recipe.steps?.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>

            <p>You picked: {selectedIngredients.join(', ')}</p>
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