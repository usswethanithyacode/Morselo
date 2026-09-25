# Morselo — Product Requirements Document

## 1. Product Overview

**Product name:** Morselo

**Purpose:** Morselo helps people decide what to cook using ingredients they already have.

**Core idea:** Users select ingredients they have available, and Morselo suggests recipe ideas using AI.

## 2. Problem Statement

People may have ingredients at home but feel unsure what meals they can make with them. Morselo aims to reduce that decision-making effort by turning an ingredient list into recipe suggestions.

## 3. Target Users

- People who cook at home.
- Students and busy people looking for meal ideas.
- Anyone who wants inspiration based on ingredients they already have.

## 4. Goals

- Let users select ingredients from a list.
- Let users add their own ingredients.
- Generate recipe suggestions based on selected ingredients.
- Present recipe details in a clear, friendly interface.
- Explore ingredient recognition from an uploaded food or pantry photo.

## 5. Main User Flow

1. User opens Morselo.
2. User selects ingredients they have.
3. User can add an ingredient that is not in the list.
4. User submits their ingredient selection.
5. Morselo requests recipe ideas.
6. User views the suggested recipes and their details.

**Future photo flow:**
1. User uploads a photo of ingredients.
2. Morselo asks an AI vision model to identify possible ingredients.
3. User reviews and corrects the identified list.
4. User confirms the ingredients and requests recipes.

## 6. Functional Requirements

### Ingredient Selection
- Display a set of selectable ingredients.
- Show which ingredients are selected.
- Display the number of selected ingredients.
- Allow users to add a custom ingredient.
- Prevent empty or duplicate custom ingredient entries.

### Recipe Generation
- Send selected ingredients to the backend.
- Return recipe suggestions based on those ingredients.
- Show recipe names, ingredient details, and cooking instructions.
- Display useful loading and error states.

### Photo Ingredient Recognition (Planned)
- Allow the user to choose an image.
- Send the image to the backend for AI-based ingredient recognition.
- Let the user review and edit the recognized ingredients before generating recipes.

## 7. Non-Functional Requirements

- The interface should be responsive on desktop and mobile.
- The app should provide clear feedback when requests are loading or fail.
- API keys and other secrets must not be exposed in frontend code.
- User inputs should be validated by the backend.
- The app should be organized so features can be maintained and extended.

## 8. Initial Scope

**Implemented so far:**
- React + Vite app setup.
- Ingredient selection interface.
- Custom ingredient entry.
- Selected ingredient count.
- A temporary results card that displays the chosen ingredients.

**Planned next:**
- Actual recipe result cards.
- Backend API.
- Database integration.
- AI recipe generation.
- Photo-based ingredient recognition, if time permits.

## 9. Success Criteria

The MVP is ready for demonstration when a user can select or add ingredients, submit them, and receive recipe suggestions with clear details and feedback.