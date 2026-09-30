# Morselo JWT Authentication Architecture

This document describes the **JSON Web Token (JWT)** authentication system implemented in Morselo.

---

## 1. Overview: What is JWT?

**JSON Web Token (JWT)** is an open standard (RFC 7519) that defines a compact and self-contained way for securely transmitting information between parties as a JSON object.

In Morselo:
- When a user logs in, the backend creates and cryptographically signs a token containing the user's basic profile payload.
- The client includes this token in the HTTP `Authorization` header for subsequent requests to protected endpoints.
- The server verifies the token signature using the secret key (`JWT_SECRET`) without needing to query a session store on every request (stateless authentication).

---

## 2. Environment Configuration

The secret signing key is configured via `server/.env`:
```env
JWT_SECRET=<your-cryptographically-secure-secret>
```

> [!NOTE]
> The `JWT_SECRET` is kept private and never exposed in client responses or committed to version control.

---

## 3. Token Issuance Flow

### Endpoint: `POST /api/auth/login`
- **Purpose**: Authenticates credentials and issues a signed JWT with a 1-hour expiration.
- **Request Body**:
  ```json
  {
    "email": "chef@morselo.local",
    "password": "secretPassword123"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "message": "Authentication successful",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_63686566",
      "email": "chef@morselo.local",
      "username": "chef"
    }
  }
  ```

---

## 4. JWT Verification Middleware (`authenticateToken`)

The middleware [`server/middleware/auth.js`](file:///c:/Users/usswe/OneDrive/Desktop/Morselo/server/middleware/auth.js) intercepts incoming requests to protected routes:

1. **Header Extraction**: Reads the standard `Authorization` header and expects the format `Bearer <token>`.
2. **Signature Verification**: Verifies the signature using `jwt.verify(token, process.env.JWT_SECRET)`.
3. **Payload Attachment**: If valid, attaches the decoded user object to `req.user` and calls `next()`.
4. **Rejection Handling**:
   - **Missing Token**: Returns `401 Unauthorized` (`"Access denied. No authentication token provided."`).
   - **Invalid Token**: Returns `401 Unauthorized` (`"Invalid authentication token."`).
   - **Expired Token**: Returns `401 Unauthorized` (`"Authentication token has expired. Please log in again."`).

---

## 5. Protected vs. Public Endpoints

### Protected Endpoints (Requires `Authorization: Bearer <token>`)
- `GET /api/auth/me`: Returns the authenticated user's profile information.
- `POST /api/ingredients/batch`: Atomically adds new catalog categories and ingredient batches via Sequelize transactions.

### Public Endpoints
- `POST /api/auth/login`: Authentication and token issuance.
- `GET /api/ingredients`: Retrieve ingredient catalog for recipe generator.
- `GET /api/recipes`: Retrieve saved recipe collection.
- `POST /api/recipes`: Save a recipe.
- `POST /api/recipes/generate`: AI recipe generation with Gemini.

---

## 6. How the Frontend Sends the Token

When making requests to protected routes, the frontend includes the JWT token in the `Authorization` header:

```javascript
const token = localStorage.getItem('morselo_auth_token');

const response = await fetch('http://localhost:5000/api/auth/me', {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    }
});
```
