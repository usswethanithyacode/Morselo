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

    const [selectedPhotoFile, setSelectedPhotoFile] = useState(null)
    const [photoError, setPhotoError] = useState('')
    const [photoAsyncMethod, setPhotoAsyncMethod] = useState('')

    // =========================================================================
    // JavaScript Async Concepts: Native FileReader Callbacks vs Promises
    // =========================================================================

    /**
     * 1. NATIVE CALLBACK-BASED ASYNCHRONOUS HELPER
     * Uses browser-native FileReader event-based asynchronous API.
     * Contains NO Promises, NO .then(), and NO async/await internally.
     * Follows the traditional error-first callback pattern: callback(error, result).
     */
    function readRecipePhotoWithCallback(file, callback) {
        if (!file) {
            callback(new Error('No file provided to FileReader.'), null)
            return
        }

        const reader = new FileReader()

        reader.onload = () => {
            // Explicitly invokes callback on successful async read
            callback(null, reader.result)
        }

        reader.onerror = () => {
            // Explicitly invokes callback with error on read failure
            callback(new Error('Unable to read the recipe image file.'), null)
        }

        reader.readAsDataURL(file)
    }

    /**
     * 2. NATIVE PROMISE-BASED ASYNCHRONOUS HELPER
     * Returns a new Promise instance around the browser-native FileReader.
     * Resolves with data URL string or rejects with an Error.
     */
    function readRecipePhotoWithPromise(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('No file provided to FileReader.'))
                return
            }

            const reader = new FileReader()

            reader.onload = () => {
                resolve(reader.result)
            }

            reader.onerror = () => {
                reject(new Error('Unable to read the recipe image file.'))
            }

            reader.readAsDataURL(file)
        })
    }

    // --- Callback Consumer Flow ---
    function handlePhotoSelectWithCallback(e) {
        const file = e.target.files?.[0]
        if (!file) return

        setSelectedPhotoFile(file)
        setPhotoError('')

        // Explicitly invokes the callback helper:
        readRecipePhotoWithCallback(file, (err, dataUrl) => {
            if (err) {
                setPhotoError(err.message)
            } else {
                setEditFormData((prev) => ({ ...prev, photo: dataUrl }))
                setPhotoAsyncMethod('Callback (FileReader onload event)')
            }
        })
    }

    // --- Promise Consumer Flow ---
    async function handlePhotoSelectWithPromise() {
        if (!selectedPhotoFile) {
            setPhotoError('Please choose an image file first.')
            return
        }

        setPhotoError('')

        // Explicitly awaits the Promise helper:
        try {
            const dataUrl = await readRecipePhotoWithPromise(selectedPhotoFile)
            setEditFormData((prev) => ({ ...prev, photo: dataUrl }))
            setPhotoAsyncMethod('Promise (new Promise + async/await)')
        } catch (err) {
            setPhotoError(err.message)
        }
    }

    const [loadMethod, setLoadMethod] = useState('promise')

    // --- Promise-based loading function (default flow) ---
    async function loadWithPromise() {
        try {
            setLoading(true)
            setError('')
            const response = await fetch('http://localhost:5000/api/recipes')
            if (!response.ok) {
                throw new Error('Failed to fetch saved recipes.')
            }
            const data = await response.json()
            setRecipes(data)
            setLoadMethod('promise')
        } catch (err) {
            setError(err.message || 'Unable to load saved recipes. Please make sure the backend is running and try again.')
        } finally {
            setLoading(false)
        }
    }

    // --- Callback-based reload handler ---
    function loadWithCallback() {
        setLoading(true)
        setError('')
        const xhr = new XMLHttpRequest()
        xhr.open('GET', 'http://localhost:5000/api/recipes')
        xhr.onload = function () {
            setLoading(false)
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText)
                    setRecipes(data)
                    setLoadMethod('callback')
                    setSuccessMessage('Loaded saved recipes using callback pattern.')
                    setTimeout(() => setSuccessMessage(''), 3000)
                } catch {
                    setError('Failed to parse saved recipes response.')
                }
            } else {
                setError('Failed to fetch saved recipes via callback.')
            }
        }
        xhr.onerror = function () {
            setLoading(false)
            setError('Network error while fetching saved recipes via callback.')
        }
        xhr.send()
    }

    useEffect(() => {
        loadWithPromise()
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
            photo: recipe.photo || null,
        })
        setSelectedPhotoFile(null)
        setPhotoError('')
        setPhotoAsyncMethod('')
        setEditError('')
        setSuccessMessage('')
    }

    function cancelEditing() {
        setEditingId(null)
        setEditFormData(null)
        setSelectedPhotoFile(null)
        setPhotoError('')
        setPhotoAsyncMethod('')
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
                    photo: editFormData.photo || null,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update recipe.')
            }

            // Update recipe in local state
            const updatedData = { ...data, photo: editFormData.photo || null }
            setRecipes((prev) =>
                prev.map((recipe) => (recipe._id === editingId ? updatedData : recipe))
            )

            setEditingId(null)
            setEditFormData(null)
            setSelectedPhotoFile(null)
            setPhotoError('')
            setPhotoAsyncMethod('')
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
                <div className="collection-header-row">
                    <h2>Your saved collection</h2>
                    <div className="async-action-buttons">
                        <button
                            type="button"
                            className="reload-async-btn"
                            onClick={loadWithCallback}
                            disabled={loading || savingEdit}
                            title="Fetch saved recipes using error-first callback pattern"
                        >
                            🔄 Reload (Callback)
                        </button>
                        <button
                            type="button"
                            className="reload-async-btn"
                            onClick={loadWithPromise}
                            disabled={loading || savingEdit}
                            title="Fetch saved recipes using async/await Promise pattern"
                        >
                            ⚡ Reload (Promise)
                        </button>
                    </div>
                </div>

                {loadMethod && (
                    <div className="async-status-pill">
                        Active async method: <strong>{loadMethod === 'callback' ? 'Callback Pattern (callback(err, data))' : 'Promise Pattern (async/await)'}</strong>
                    </div>
                )}

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

                                            <div className="form-group">
                                                <label htmlFor={`edit-photo-${recipe._id}`}>Recipe Photo / Image Attachment</label>
                                                <div className="photo-upload-controls">
                                                    <input
                                                        id={`edit-photo-${recipe._id}`}
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handlePhotoSelectWithCallback}
                                                        className="photo-file-input"
                                                    />
                                                    {selectedPhotoFile && (
                                                        <button
                                                            type="button"
                                                            className="reload-async-btn photo-promise-btn"
                                                            onClick={handlePhotoSelectWithPromise}
                                                            title="Process the chosen photo using the native Promise helper"
                                                        >
                                                            ⚡ Process with Promise
                                                        </button>
                                                    )}
                                                </div>
                                                {photoError && <p className="validation-error">{photoError}</p>}
                                                {editFormData?.photo && (
                                                    <div className="photo-preview-box">
                                                        <img src={editFormData.photo} alt="Recipe preview" className="recipe-photo-thumbnail" />
                                                        <div className="photo-preview-meta">
                                                            <span className="photo-method-badge">{photoAsyncMethod}</span>
                                                            <button
                                                                type="button"
                                                                className="remove-photo-btn"
                                                                onClick={() => {
                                                                    setEditFormData((prev) => ({ ...prev, photo: null }))
                                                                    setSelectedPhotoFile(null)
                                                                    setPhotoAsyncMethod('')
                                                                }}
                                                            >
                                                                Remove photo
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
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

                                            {recipe.photo && (
                                                <div className="recipe-display-photo-box">
                                                    <img src={recipe.photo} alt={recipe.name} className="recipe-display-photo" />
                                                </div>
                                            )}

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