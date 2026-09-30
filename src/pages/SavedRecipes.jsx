import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

function SavedRecipes() {
    const [recipes, setRecipes] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const [deletingId, setDeletingId] = useState(null)
    const [copiedId, setCopiedId] = useState(null)
    const [copyingId, setCopyingId] = useState(null)

    // Edit state
    const [editingId, setEditingId] = useState(null)
    const [editFormData, setEditFormData] = useState(null)
    const [editError, setEditError] = useState('')
    const [savingEdit, setSavingEdit] = useState(false)

    // --- JavaScript Event Loop Implementation: Copy Saved Recipe ---
    // Demonstrates:
    // 1. Synchronous Execution (Call Stack): Validates recipe data, formats recipe text, sets immediate loading state
    // 2. Promise / Microtask Queue: navigator.clipboard.writeText Promise resolution in microtask queue
    // 3. Macrotask Queue (Timer Task): setTimeout timer callback queued to clear copied confirmation
    async function copySavedRecipe(recipe) {
        if (!recipe) return

        // 1. Synchronous Execution (Call Stack)
        const formatted = `🍽️ ${recipe.name}\n\n${recipe.description || ''}\n\nIngredients:\n${(recipe.ingredients || []).map((i) => `- ${i}`).join('\n')}\n\nCooking Steps:\n${(recipe.steps || []).map((s, idx) => `${idx + 1}. ${s}`).join('\n')}`
        setCopyingId(recipe._id)

        // 2. Microtask Queue (Promise resolution)
        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(formatted)
            } else {
                await Promise.resolve()
            }
            setCopiedId(recipe._id)
        } catch {
            setCopiedId(null)
            return
        } finally {
            setCopyingId(null)
        }

        // 3. Macrotask Queue (Timer phase callback)
        setTimeout(() => {
            setCopiedId(null)
        }, 2500)
    }

    useEffect(() => {
        async function fetchSavedRecipes() {
            try {
                setLoading(true)
                setError('')
                const response = await fetch('http://localhost:5000/api/recipes')

                if (!response.ok) {
                    throw new Error('Could not load saved recipes.')
                }

                const data = await response.json()
                setRecipes(data)
            } catch (err) {
                setError('Unable to load saved recipes. Please make sure the backend is running and try again.')
            } finally {
                setLoading(false)
            }
        }

        fetchSavedRecipes()
    }, [])

    async function deleteRecipe(id) {
        if (!id || deletingId || savingEdit) return

        setDeletingId(id)
        setError('')
        setSuccessMessage('')

        try {
            const response = await fetch(`http://localhost:5000/api/recipes/${id}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                throw new Error('Could not delete recipe.')
            }

            setRecipes((prev) => prev.filter((recipe) => recipe._id !== id))
            setSuccessMessage('Recipe deleted successfully.')
            setTimeout(() => setSuccessMessage(''), 3500)
        } catch (err) {
            setError('Unable to delete this recipe right now. Please try again.')
        } finally {
            setDeletingId(null)
        }
    }

    function startEditing(recipe) {
        setEditingId(recipe._id)
        setEditFormData({
            name: recipe.name || '',
            description: recipe.description || '',
            ingredients: Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0
                ? [...recipe.ingredients]
                : [''],
            steps: Array.isArray(recipe.steps) && recipe.steps.length > 0
                ? [...recipe.steps]
                : [''],
        })
        setEditError('')
        setSuccessMessage('')
    }

    function cancelEditing() {
        setEditingId(null)
        setEditFormData(null)
        setEditError('')
    }

    function handleFieldChange(field, value) {
        setEditFormData((prev) => ({
            ...prev,
            [field]: value,
        }))
        if (editError) setEditError('')
    }

    function handleIngredientChange(index, value) {
        setEditFormData((prev) => {
            const updated = [...prev.ingredients]
            updated[index] = value
            return { ...prev, ingredients: updated }
        })
        if (editError) setEditError('')
    }

    function addIngredientField() {
        setEditFormData((prev) => ({
            ...prev,
            ingredients: [...prev.ingredients, ''],
        }))
    }

    function removeIngredientField(index) {
        setEditFormData((prev) => {
            const updated = prev.ingredients.filter((_, i) => i !== index)
            return {
                ...prev,
                ingredients: updated.length > 0 ? updated : [''],
            }
        })
    }

    function handleStepChange(index, value) {
        setEditFormData((prev) => {
            const updated = [...prev.steps]
            updated[index] = value
            return { ...prev, steps: updated }
        })
        if (editError) setEditError('')
    }

    function addStepField() {
        setEditFormData((prev) => ({
            ...prev,
            steps: [...prev.steps, ''],
        }))
    }

    function removeStepField(index) {
        setEditFormData((prev) => {
            const updated = prev.steps.filter((_, i) => i !== index)
            return {
                ...prev,
                steps: updated.length > 0 ? updated : [''],
            }
        })
    }

    async function handleSaveEdit(e) {
        e.preventDefault()

        if (!editFormData || !editingId) return

        const trimmedName = editFormData.name.trim()
        if (!trimmedName) {
            setEditError('Recipe name cannot be empty.')
            return
        }

        const cleanedIngredients = editFormData.ingredients
            .map((item) => item.trim())
            .filter((item) => item.length > 0)

        if (cleanedIngredients.length === 0) {
            setEditError('At least one non-empty ingredient is required.')
            return
        }

        const cleanedSteps = editFormData.steps
            .map((item) => item.trim())
            .filter((item) => item.length > 0)

        if (cleanedSteps.length === 0) {
            setEditError('At least one non-empty cooking step is required.')
            return
        }

        setSavingEdit(true)
        setEditError('')

        try {
            const response = await fetch(`http://localhost:5000/api/recipes/${editingId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: trimmedName,
                    description: editFormData.description.trim(),
                    ingredients: cleanedIngredients,
                    steps: cleanedSteps,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update recipe.')
            }

            // Update recipe in local state
            setRecipes((prev) =>
                prev.map((recipe) => (recipe._id === editingId ? data : recipe))
            )

            setEditingId(null)
            setEditFormData(null)
            setSuccessMessage(`"${data.name}" updated successfully!`)
            setTimeout(() => setSuccessMessage(''), 4000)
        } catch (err) {
            setEditError(err.message || 'Unable to update recipe. Please try again.')
        } finally {
            setSavingEdit(false)
        }
    }

    return (
        <main>
            <header className="topbar">
                <span className="brand">Morselo</span>
                <span className="tagline">A little inspiration for your kitchen</span>
                <Link to="/" className="saved-link">
                    ← Back to recipes
                </Link>
            </header>

            <section className="welcome">
                <p className="eyebrow">YOUR LITTLE RECIPE COLLECTION</p>
                <h1>Saved recipes</h1>
                <p className="intro">
                    Your favourite kitchen ideas saved from your recipe creations.
                </p>
            </section>

            <section className="ingredient-section">
                <h2>Your saved collection</h2>

                {successMessage && (
                    <div className="success-banner" role="status">
                        <span className="success-icon" aria-hidden="true">✓</span>
                        <p className="success-text">{successMessage}</p>
                    </div>
                )}

                {error && (
                    <div className="error-banner" role="alert">
                        <span className="error-icon" aria-hidden="true">⚠️</span>
                        <p className="error-text">{error}</p>
                    </div>
                )}

                {loading && (
                    <div className="loading-state">
                        <p>Loading your saved recipes...</p>
                    </div>
                )}

                {!loading && !error && recipes.length === 0 && (
                    <p className="empty-fallback">
                        No saved recipes yet. Go back to the recipe generator to create and save some recipes!
                    </p>
                )}

                {!loading && !error && recipes.length > 0 && (
                    <div className="saved-recipes-list">
                        {recipes.map((recipe, index) => {
                            const isEditing = editingId === recipe._id

                            return (
                                <article className="recipe-card" key={recipe._id || index}>
                                    {isEditing ? (
                                        <form className="edit-recipe-form" onSubmit={handleSaveEdit}>
                                            <p className="eyebrow">EDITING RECIPE</p>

                                            {editError && (
                                                <div className="error-banner" role="alert">
                                                    <span className="error-icon" aria-hidden="true">⚠️</span>
                                                    <p className="error-text">{editError}</p>
                                                </div>
                                            )}

                                            <div className="form-group">
                                                <label htmlFor={`edit-name-${recipe._id}`}>Recipe Name</label>
                                                <input
                                                    id={`edit-name-${recipe._id}`}
                                                    type="text"
                                                    value={editFormData.name}
                                                    onChange={(e) => handleFieldChange('name', e.target.value)}
                                                    placeholder="Enter recipe name..."
                                                    required
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label htmlFor={`edit-desc-${recipe._id}`}>Description</label>
                                                <textarea
                                                    id={`edit-desc-${recipe._id}`}
                                                    rows="2"
                                                    value={editFormData.description}
                                                    onChange={(e) => handleFieldChange('description', e.target.value)}
                                                    placeholder="A brief description of this dish..."
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label>Ingredients</label>
                                                <div className="dynamic-list">
                                                    {editFormData.ingredients.map((ingredient, ingIdx) => (
                                                        <div className="dynamic-list-row" key={ingIdx}>
                                                            <input
                                                                type="text"
                                                                value={ingredient}
                                                                onChange={(e) => handleIngredientChange(ingIdx, e.target.value)}
                                                                placeholder={`Ingredient ${ingIdx + 1}`}
                                                                aria-label={`Ingredient ${ingIdx + 1}`}
                                                            />
                                                            {editFormData.ingredients.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    className="remove-item-btn"
                                                                    onClick={() => removeIngredientField(ingIdx)}
                                                                    aria-label={`Remove ingredient ${ingIdx + 1}`}
                                                                    title="Remove ingredient"
                                                                >
                                                                    ✕
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                    <button
                                                        type="button"
                                                        className="add-item-btn"
                                                        onClick={addIngredientField}
                                                    >
                                                        + Add ingredient
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="form-group">
                                                <label>Cooking Steps</label>
                                                <div className="dynamic-list">
                                                    {editFormData.steps.map((step, stepIdx) => (
                                                        <div className="dynamic-list-row" key={stepIdx}>
                                                            <input
                                                                type="text"
                                                                value={step}
                                                                onChange={(e) => handleStepChange(stepIdx, e.target.value)}
                                                                placeholder={`Step ${stepIdx + 1}`}
                                                                aria-label={`Step ${stepIdx + 1}`}
                                                            />
                                                            {editFormData.steps.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    className="remove-item-btn"
                                                                    onClick={() => removeStepField(stepIdx)}
                                                                    aria-label={`Remove step ${stepIdx + 1}`}
                                                                    title="Remove step"
                                                                >
                                                                    ✕
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                    <button
                                                        type="button"
                                                        className="add-item-btn"
                                                        onClick={addStepField}
                                                    >
                                                        + Add step
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="edit-actions">
                                                <button
                                                    type="submit"
                                                    className="save-button"
                                                    disabled={savingEdit}
                                                >
                                                    {savingEdit ? 'Saving…' : 'Save changes'}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="cancel-button"
                                                    onClick={cancelEditing}
                                                    disabled={savingEdit}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
                                    ) : (
                                        <>
                                            <div className="recipe-card-header">
                                                <div>
                                                    <p className="eyebrow">SAVED RECIPE</p>
                                                    <h2>{recipe.name}</h2>
                                                </div>
                                                <div className="card-actions">
                                                    <button
                                                        type="button"
                                                        className="copy-button"
                                                        onClick={() => copySavedRecipe(recipe)}
                                                        disabled={copyingId === recipe._id || deletingId === recipe._id || savingEdit}
                                                        aria-label={`Copy ${recipe.name}`}
                                                    >
                                                        {copiedId === recipe._id ? '✓ Copied!' : copyingId === recipe._id ? 'Copying...' : 'Copy'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="edit-button"
                                                        onClick={() => startEditing(recipe)}
                                                        disabled={deletingId === recipe._id || savingEdit}
                                                        aria-label={`Edit ${recipe.name}`}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="delete-button"
                                                        onClick={() => deleteRecipe(recipe._id)}
                                                        disabled={deletingId === recipe._id || savingEdit}
                                                        aria-label={`Delete ${recipe.name}`}
                                                    >
                                                        {deletingId === recipe._id ? 'Deleting...' : 'Delete'}
                                                    </button>
                                                </div>
                                            </div>

                                            {recipe.description && <p>{recipe.description}</p>}

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
                                        </>
                                    )}
                                </article>
                            )
                        })}
                    </div>
                )}
            </section>
        </main>
    )
}

export default SavedRecipes