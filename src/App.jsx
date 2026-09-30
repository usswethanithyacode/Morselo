import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './App.css'

function App() {
  const [catalog, setCatalog] = useState([])
  const [activeCategory, setActiveCategory] = useState('All')
  const [newIngredient, setNewIngredient] = useState('')
  const [selectedIngredients, setSelectedIngredients] = useState([])
  const [recipes, setRecipes] = useState(null)
  const [savedRecipes, setSavedRecipes] = useState(() => {
    const saved = localStorage.getItem('morseloSavedRecipes')
    return saved ? JSON.parse(saved) : []
  })
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [ingredientError, setIngredientError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    async function fetchCatalog() {
      try {
        const response = await fetch('http://localhost:5000/api/ingredients/catalog')

        if (!response.ok) {
          throw new Error('Could not load ingredients.')
        }

        const data = await response.json()
        setCatalog(data)
      } catch (err) {
        setError('Unable to load ingredients. Please make sure the backend server is running and try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchCatalog()
  }, [])

  function toggleIngredient(ingredientName) {
    if (selectedIngredients.includes(ingredientName)) {
      setSelectedIngredients(
        selectedIngredients.filter((item) => item !== ingredientName)
      )
    } else {
      setSelectedIngredients([...selectedIngredients, ingredientName])
    }

    setRecipes(null)
    setError('')
    setSaveMessage('')
  }

  function addIngredient() {
    const cleanedIngredient = newIngredient.trim()

    if (cleanedIngredient === '') {
      setIngredientError('Please enter an ingredient.')
      return
    }

    const alreadyExists = catalog.some(
      (item) => item.name.toLowerCase() === cleanedIngredient.toLowerCase()
    )

    if (alreadyExists) {
      setIngredientError('That ingredient is already added.')
      return
    }

    const newEntry = {
      id: Date.now(),
      name: cleanedIngredient,
      category: 'Custom',
    }

    setCatalog([...catalog, newEntry])
    setSelectedIngredients([...selectedIngredients, cleanedIngredient])
    setNewIngredient('')
    setIngredientError('')
    setRecipes(null)
    setError('')
    setSaveMessage('')
  }

  async function generateRecipes() {
    if (selectedIngredients.length === 0 || generating) {
      return
    }

    setGenerating(true)
    setRecipes(null)
    setError('')
    setSaveMessage('')

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
    } catch (err) {
      setError(
        'Unable to generate a recipe right now. Please try again in a moment.'
      )
    } finally {
      setGenerating(false)
    }
  }

  async function saveRecipe() {
    if (!recipes?.recipe) {
      return
    }

    const alreadySaved = savedRecipes.some(
      (item) => item.name?.toLowerCase() === recipes.recipe.name?.toLowerCase()
    )

    if (alreadySaved) {
      setSaveMessage('This recipe is already saved!')
      return
    }

    try {
      const response = await fetch('http://localhost:5000/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recipes.recipe),
      })

      if (!response.ok) {
        throw new Error('Could not save recipe to server.')
      }

      const savedData = await response.json()
      const updatedSavedRecipes = [...savedRecipes, savedData]

      setSavedRecipes(updatedSavedRecipes)
      localStorage.setItem(
        'morseloSavedRecipes',
        JSON.stringify(updatedSavedRecipes)
      )
      setSaveMessage('Recipe saved to your collection!')
    } catch (err) {
      const updatedSavedRecipes = [...savedRecipes, recipes.recipe]

      setSavedRecipes(updatedSavedRecipes)
      localStorage.setItem(
        'morseloSavedRecipes',
        JSON.stringify(updatedSavedRecipes)
      )
      setSaveMessage('Recipe saved to your collection!')
    }
  }

  const recipeIsSaved = savedRecipes.some(
    (item) => item.name?.toLowerCase() === recipes?.recipe?.name?.toLowerCase()
  )

  const categories = ['All', ...new Set(catalog.map((i) => i.category).filter(Boolean))]
  const displayedIngredients =
    activeCategory === 'All'
      ? catalog
      : catalog.filter((i) => i.category === activeCategory)

  return (
    <main>
      <header className="topbar">
        <span className="brand">Morselo</span>
        <span className="tagline">A little inspiration for your kitchen</span>
        <Link to="/saved" className="saved-link">
          Saved recipes
        </Link>
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

        {error && (
          <div className="error-banner" role="alert">
            <span className="error-icon" aria-hidden="true">⚠️</span>
            <p className="error-text">{error}</p>
          </div>
        )}

        {loading && (
          <div className="loading-state">
            <p>Loading ingredients from catalog...</p>
          </div>
        )}

        {!loading && catalog.length === 0 && (
          <p className="empty-fallback">
            {error
              ? 'No ingredients could be loaded. You can still add your own ingredients below.'
              : 'No ingredients available yet. Add your own ingredients below to get started.'}
          </p>
        )}

        {!loading && catalog.length > 0 && categories.length > 1 && (
          <div className="category-filter-bar" aria-label="Filter by category">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={activeCategory === cat ? 'category-pill active' : 'category-pill'}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {!loading && displayedIngredients.length > 0 && (
          <div className="ingredient-list">
            {displayedIngredients.map((item) => (
              <button
                key={item.id || item.name}
                className={
                  selectedIngredients.includes(item.name)
                    ? 'ingredient selected'
                    : 'ingredient'
                }
                onClick={() => toggleIngredient(item.name)}
                type="button"
              >
                <span className="ingredient-name">{item.name}</span>
                {item.category && item.category !== 'Custom' && (
                  <span className="ingredient-category-tag">{item.category}</span>
                )}
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
            onChange={(event) => {
              setNewIngredient(event.target.value)
              if (ingredientError) {
                setIngredientError('')
              }
            }}
            placeholder="Add an ingredient..."
            aria-describedby={ingredientError ? 'ingredient-error' : undefined}
            aria-invalid={ingredientError ? 'true' : 'false'}
          />
          <button type="submit">Add</button>
        </form>

        {ingredientError && (
          <p id="ingredient-error" className="validation-error" role="alert">
            {ingredientError}
          </p>
        )}

        <button
          className="generate-button"
          disabled={selectedIngredients.length === 0 || generating}
          onClick={generateRecipes}
          type="button"
        >
          {generating ? 'Generating...' : 'Generate recipes'}
        </button>

        {generating && (
          <section className="recipe-card recipe-loading-card" aria-live="polite">
            <div className="generating-indicator">
              <div className="generating-spinner" aria-hidden="true"></div>
              <p className="generating-text">Finding the perfect recipe for you...</p>
            </div>
          </section>
        )}

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

            <button
              className="generate-button"
              onClick={saveRecipe}
              type="button"
              disabled={recipeIsSaved}
            >
              {recipeIsSaved ? 'Saved!' : 'Save recipe'}
            </button>

            {saveMessage && <p role="status">{saveMessage}</p>}
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