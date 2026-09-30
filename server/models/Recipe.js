const mongoose = require('mongoose')

const recipeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        ingredients: {
            type: [String],
            required: true,
        },
        steps: {
            type: [String],
            required: true,
        },
    },
    {
        timestamps: true,
    }
)

// Index on createdAt (descending) to optimize reverse-chronological recipe feed queries:
// Recipe.find().sort({ createdAt: -1 })
recipeSchema.index({ createdAt: -1 })

module.exports = mongoose.model('Recipe', recipeSchema)
