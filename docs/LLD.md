# Morselo — Low-Level Design (LLD)

## 1. Purpose

This document describes the planned implementation details for Morselo, including frontend state, API endpoints, backend flow, database schemas, and error handling.

The designs below are planned. They do not mean these features have already been implemented.

## 2. Frontend Design

### 2.1 Main React Component

The current application uses the `App` component to display the ingredient selection interface.

Planned responsibilities:
- Store the available ingredients.
- Track the ingredients selected by the user.
- Allow custom ingredients to be added.
- Send selected ingredients to the backend.
- Display recipe suggestions and request status.

### 2.2 React State

The current ingredient picker uses React `useState` for:
- `ingredients`: the available ingredient names.
- `newIngredient`: the text entered for a custom ingredient.
- `selectedIngredients`: the ingredients selected by the user.
- `showRecipes`: whether the temporary results card is visible.

Planned additional state:
- `recipes`: recipe results returned by the backend.
- `loading`: whether a recipe request is in progress.
- `error`: an error message to show if the request fails.

### 2.3 Planned Frontend Flow

1. User selects ingredients or adds a custom ingredient.
2. User clicks **Generate recipes**.
3. The frontend checks that at least one ingredient is selected.
4. The frontend sets the loading state and sends a request to the backend.
5. On success, the frontend stores and displays the recipe results.
6. On failure, the frontend displays a useful error message.
7. The loading state is cleared when the request finishes.

## 3. Backend Design

### 3.1 Planned Technology

- Node.js runtime
- Express framework
- REST API endpoints
- Environment variables for secrets and configuration

### 3.2 Backend Responsibilities

- Receive requests from the frontend.
- Validate request data.
- Call the AI service when recipe generation is requested.
- Store or retrieve data from the databases as required.
- Handle errors and return appropriate HTTP status codes.

### 3.3 Planned Middleware

Middleware will be used for shared request-processing tasks.

Planned middleware:
- JSON request parsing.
- Request validation.
- Centralized error handling.

## 4. REST API Design

### 4.1 Generate Recipes

**Endpoint:** `POST /api/recipes/generate`

**Purpose:** Generate recipe suggestions from the ingredients supplied by the user.

Example request:

    {
      "ingredients": ["Eggs", "Tomato", "Onion"]
    }

Planned successful response:

    {
      "recipes": [
        {
          "name": "Tomato Egg Scramble",
          "ingredients": ["Eggs", "Tomato", "Onion"],
          "instructions": [
            "Chop the tomato and onion.",
            "Cook the onion until softened.",
            "Add tomato and eggs, then cook until done."
          ]
        }
      ]
    }

Planned status codes:
- `200 OK`: Recipe suggestions were generated successfully.
- `400 Bad Request`: The request is missing ingredients or contains invalid data.
- `502 Bad Gateway`: The AI service returned an unusable response or failed.
- `500 Internal Server Error`: An unexpected server-side error occurred.

### 4.2 Planned Ingredient List Endpoint

**Endpoint:** `GET /api/ingredients`

**Purpose:** Retrieve the ingredient options shown in the interface.

Planned status codes:
- `200 OK`: Ingredient list returned.
- `500 Internal Server Error`: The server could not retrieve the list.

### 4.3 Planned Photo Recognition Endpoint

**Endpoint:** `POST /api/ingredients/analyze-image`

**Purpose:** Analyze an uploaded image and return possible ingredient names.

This endpoint is a planned feature. The user should review and confirm recognized ingredients before using them to generate recipes.

Planned status codes:
- `200 OK`: Possible ingredients returned.
- `400 Bad Request`: Missing or invalid image.
- `502 Bad Gateway`: Image analysis service failed.
- `500 Internal Server Error`: Unexpected server-side error.

## 5. Database Design

Morselo is planned to use both MongoDB and PostgreSQL to demonstrate document and relational data modeling.

The exact division of data between the two databases will be confirmed during implementation.

### 5.1 MongoDB — Planned Recipe Collection

Collection: `recipes`

Example document:

    {
      "_id": "generated-id",
      "name": "Tomato Egg Scramble",
      "ingredients": ["Eggs", "Tomato", "Onion"],
      "instructions": [
        "Chop the vegetables.",
        "Cook the onion and tomato.",
        "Add eggs and cook until done."
      ],
      "createdAt": "date"
    }

The document format allows a recipe to store its ingredient list and instructions together.

Planned CRUD operations:
- Create: save a recipe.
- Read: retrieve saved recipes.
- Update: edit a saved recipe, if editing is supported.
- Delete: remove a saved recipe, if deletion is supported.

### 5.2 PostgreSQL — Planned Relational Schema

Table: `ingredients`

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER | Primary key |
| `name` | VARCHAR | Ingredient name |

Table: `recipe_ingredients`

| Column | Type | Description |
|---|---|---|
| `recipe_id` | INTEGER | Foreign key to a recipe record |
| `ingredient_id` | INTEGER | Foreign key to `ingredients.id` |

The `recipe_ingredients` table is planned to connect recipe records and ingredient records. It represents a many-to-many relationship: a recipe can use multiple ingredients, and an ingredient can appear in multiple recipes.

A relational query can use a SQL `JOIN` to retrieve ingredient names associated with a recipe.

The exact recipe table and foreign-key targets must be finalized when the PostgreSQL implementation is chosen.

## 6. AI Integration Design

### 6.1 Recipe Generation

The backend will send the selected ingredients to a language model API.

The prompt will ask the model to:
- Suggest recipes that use the supplied ingredients.
- Return a predictable structured response.
- Include recipe names, ingredient lists, and cooking instructions.
- Avoid adding ingredients that were not supplied unless clearly marked as optional.

### 6.2 Structured Output

The planned response format is JSON with a `recipes` array. Each recipe object will contain:
- `name`
- `ingredients`
- `instructions`

The backend will check that the AI response follows the expected structure before returning it to the frontend.

### 6.3 Secret Management

The AI API key will be stored in a backend environment variable, not in React code or a committed source file.

## 7. Validation and Error Handling

Planned request validation:
- The `ingredients` field must be an array.
- The array must contain at least one ingredient.
- Ingredient values must be non-empty strings.
- The request must stay within reasonable size limits.

Planned error handling:
- Return `400` for invalid user input.
- Return `502` when an external AI service fails.
- Return `500` for unexpected backend errors.
- Avoid returning secrets or internal stack traces to the client.
- Show the user a clear message when a request cannot be completed.

## 8. Git Workflow

The project uses Git for version control and GitHub as its remote repository.

Planned workflow:
1. Make a focused change.
2. Test the change locally.
3. Review the changed files with `git status`.
4. Stage the intended files with `git add`.
5. Commit with a descriptive message.
6. Push the commit to GitHub.

Environment files containing secrets must not be committed.

## 9. Current and Planned Implementation

### Implemented so far

- React + Vite setup.
- Ingredient selection using React state.
- Custom ingredient entry.
- Selected ingredient count.
- A temporary card that displays selected ingredients.
- Initial product and architecture documentation.

### Planned

- Recipe result cards with actual recipe details.
- Express backend and REST API.
- Request validation and centralized error handling.
- MongoDB and PostgreSQL integration.
- AI recipe generation with structured output.
- Loading and error states.
- Optional photo-based ingredient recognition.