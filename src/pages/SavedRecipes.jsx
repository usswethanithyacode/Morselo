import { useState } from 'react'
import { Link } from 'react-router-dom'

function SavedRecipes() {
    const [savedRecipes] = useState(() => {
        const saved = localStorage.getItem('morseloSavedRecipes')
        return saved ? JSON.parse(saved) : []
    })

    return (
        <main>
            <header className="topbar">
                <span className="brand">Morselo</span>
                <span className="tagline">A little inspiration for your kitchen</span>
                <Link to="/" className="saved-link">
                    Back to recipes
                </Link>
            </header>

            <section className="welcome">
                <p className="eyebrow">YOUR LITTLE RECIPE COLLECTION</p>
                <h1>Saved recipes</h1>
                <p className="intro">
                    Your favourite kitchen ideas will live here.
                </p>
            </section>

            <section className="ingredient-section">
                {savedRecipes.length === 0 ? (
                    <p>No saved recipes yet. Generate a recipe and save it here!</p>
                ) : (
                    savedRecipes.map((recipe, index) => (
                        <article className="recipe-card" key={`${recipe.name}-${index}`}>
                            <h2>{recipe.name}</h2>
                            <p>{recipe.description}</p>

                            <h3>Ingredients</h3>
                            <ul>
                                {recipe.ingredients?.map((ingredient, ingredientIndex) => (
                                    <li key={ingredientIndex}>{ingredient}</li>
                                ))}
                            </ul>

                            <h3>Cooking steps</h3>
                            <ol>
                                {recipe.steps?.map((step, stepIndex) => (
                                    <li key={stepIndex}>{step}</li>
                                ))}
                            </ol>
                        </article>
                    ))
                )}
            </section>
        </main>
    )
}

export default SavedRecipes