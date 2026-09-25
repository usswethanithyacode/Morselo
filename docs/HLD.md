# Morselo — High-Level Design (HLD)

## 1. Purpose

This document describes the planned architecture of Morselo: its main components, how they communicate, and how data flows through the application.

## 2. System Overview

Morselo is planned as a web application with:

- **Frontend:** React — the interface users interact with.
- **Backend:** Node.js and Express — handles API requests and application logic.
- **Database:** MongoDB and PostgreSQL — planned for storing application data in document and relational formats.
- **AI service:** A language model API — planned to generate recipe suggestions from user-selected ingredients.
- **Optional vision capability:** An AI model that can analyze uploaded ingredient photos.

The frontend will communicate with the backend through REST API endpoints. The backend will handle validation, database operations, and requests to the AI service.

## 3. High-Level Architecture

```text
                 USER
                  |
                  v
        REACT FRONTEND
   - Select ingredients
   - Add custom ingredients
   - View recipe suggestions
   - Optional photo upload
                  |
                  | HTTP / JSON
                  v
        NODE.JS + EXPRESS
             BACKEND
   - REST API routes
   - Input validation
   - Business logic
   - Error handling
       /       |       \
      v        v        v
  MONGODB  POSTGRESQL  AI SERVICE
  Document  Relational  Recipe and
  storage   storage     image analysis
  4. Main Components
4.1 React Frontend

The frontend will:

Display the Morselo homepage.

Allow users to select available ingredients.

Allow users to add custom ingredients.

Send ingredient selections to the backend.

Display recipe suggestions and their details.

Show loading and error messages when appropriate.

Potentially allow users to upload ingredient photos.

4.2 Node.js and Express Backend

The backend will:

Expose REST API endpoints for the frontend.

Validate incoming requests.

Coordinate recipe generation.

Communicate with the databases.

Call the AI service using server-side credentials.

Handle errors and return suitable HTTP status codes.

4.3 MongoDB

MongoDB is planned as a document database for flexible data such as recipe documents and their ingredient lists.

The exact collections and fields will be defined in the low-level design.

4.4 PostgreSQL

PostgreSQL is planned for relational data, such as structured ingredient records and their relationships.

The exact tables, keys, and relationships will be defined in the low-level design.

4.5 AI Service

The backend will send a carefully structured prompt and the selected ingredients to an AI service.

The AI response will be requested in a structured format so the application can display recipe names, ingredients, and instructions consistently.

The specific AI provider and response schema will be selected during implementation.

5. Main Data Flow: Recipe Generation

The user selects ingredients in the React interface.

The user clicks Generate recipes.

The frontend sends the selected ingredients to a backend REST endpoint.

The backend validates the request.

The backend prepares a prompt and sends it to the AI service.

The AI service returns recipe suggestions.

The backend checks and formats the response.

The backend sends a JSON response to the frontend.

The frontend displays the recipe suggestions.

6. Planned Photo Ingredient Flow

The user chooses an image in the frontend.

The frontend sends the image to a backend endpoint.

The backend validates the file and forwards it to a vision-capable AI service.

The service returns possible ingredient names.

The frontend displays the proposed ingredients for review.

The user can correct the list and confirm it before requesting recipes.

Photo analysis is a planned extension, not part of the current working implementation.

7. API Communication

The frontend and backend will communicate using HTTP requests and JSON.

Example planned endpoint:

POST /api/recipes/generate

Example request body:

{
  "ingredients": ["Eggs", "Tomato", "Onion"]
}

The backend will validate the ingredients before processing the request. A successful response will contain structured recipe suggestions. Error responses will use suitable HTTP status codes and a clear error message.

8. Security and Reliability

Store AI API keys and database credentials in backend environment variables.

Do not expose secrets in frontend code or commit them to Git.

Validate and limit user-provided data on the backend.

Handle AI service, database, and network errors.

Return clear error responses without exposing private implementation details.

Use loading and error states in the frontend to communicate request status.

9. Design Decisions and Open Items

The following are planned decisions or items to confirm during implementation:

Choose the AI API provider and model.

Define the exact MongoDB collections and PostgreSQL tables.

Define the recipe response schema.

Decide whether recipe suggestions will be stored for later use.

Determine whether photo ingredient recognition fits the project timeline.

10. Current Implementation Status
Implemented

React + Vite frontend setup.

Ingredient selection interface.

Custom ingredient entry.

Selected ingredient count.

Temporary results card displaying selected ingredients.

Planned

Express backend and REST endpoints.

MongoDB and PostgreSQL integration.

AI-powered recipe generation.

Actual recipe result cards.

Optional photo ingredient recognition.