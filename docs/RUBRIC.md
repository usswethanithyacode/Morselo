# Morselo — Project Rubric Tracker

Status key:
- Done: implemented and tested in the app
- In progress: started, but not complete
- Planned: not implemented yet

## 1. Frontend and React

| Concept | Morselo feature | Status |
|---|---|---|
| React component composition | App interface and planned reusable recipe cards | In progress |
| useState | Ingredient list, selected ingredients, custom input, card visibility | Done |
| useEffect | Not used yet | Planned |
| Async API fetching | Requesting recipes from backend | Planned |
| Client-side routing | Multiple pages/views | Planned |
| Problem modeling | Ingredient-to-recipe use case | In progress |

## 2. Backend and API

| Concept | Morselo feature | Status |
|---|---|---|
| System design basics | PRD, HLD, LLD architecture drafts | In progress |
| REST endpoint design | Planned recipe generation endpoint | In progress |
| HTTP status codes | Planned API response codes | In progress |
| Server-side error handling | Backend not built yet | Planned |
| Middleware | Express middleware planned | Planned |

## 3. Databases

| Concept | Morselo feature | Status |
|---|---|---|
| MongoDB schema modeling | Planned recipe collection | In progress |
| MongoDB CRUD | Saving and managing recipe documents | Planned |
| PostgreSQL relational schema | Planned ingredient and recipe relationship tables | In progress |
| SQL JOINs | Planned query across recipe and ingredient records | Planned |

## 4. AI and Prompting

| Concept | Morselo feature | Status |
|---|---|---|
| LLM API integration | AI recipe generation | Planned |
| Prompt engineering | Prompt based on selected ingredients | Planned |
| Structured outputs | JSON recipe response format | In progress |

## 5. JavaScript Concepts

| Concept | Morselo feature | Status |
|---|---|---|
| Event loop | To cover while learning async requests | Planned |
| Promises vs callbacks | To cover during API integration | Planned |
| Async/await | Planned backend and frontend requests | Planned |
| Closures | To identify and explain in event handlers/state callbacks | Planned |
| Hoisting | To review with JavaScript examples | Planned |

## 6. Git and Secrets

| Concept | Morselo feature | Status |
|---|---|---|
| Git workflow | Repository initialized, commits and push completed | Done |
| Environment variables | Backend configuration and AI key | Planned |
| Secrets management | Keep API keys out of frontend and Git | Planned |

## 7. Current MVP Progress

### Implemented and tested
- React + Vite setup
- Ingredient selection
- Custom ingredient entry
- Selected ingredient count
- Temporary ingredient summary card
- GitHub repository with pushed commits

### Documentation drafted
- PRD
- HLD
- LLD

### Still to build
- Actual recipe result cards
- Backend and REST API
- Database schemas and operations
- AI recipe generation
- API fetching and loading/error UI
- Optional photo-based ingredient recognition

## 8. Important Note

A concept is only marked Done when the feature or concept has actually been implemented and tested. Documentation of a planned feature does not count as implementation.