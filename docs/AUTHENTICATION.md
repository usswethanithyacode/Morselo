# Morselo Authentication & Password Security Architecture

This document describes the **JSON Web Token (JWT)** authentication and **Bcrypt Password Hashing** security architecture implemented in Morselo.

---

## 1. Overview: Password Hashing & Security

### Why Password Hashing is Used
Storing passwords in plaintext or using reversible encryption poses severe security vulnerabilities. If a database is ever compromised, plaintext passwords expose users across multiple services due to password reuse.

**Password Hashing** transforms a plaintext password into an irreversible, fixed-length cryptographic hash using a one-way mathematical function.

### Key Security Principles in Morselo
1. **Never Store Plaintext**: Passwords are never written to database tables or logged.
2. **Cryptographic Salting**: `bcryptjs` automatically generates a unique random salt for every user and password change before hashing. This defeats rainbow table and precomputed hash attacks.
3. **Adaptive Work Factor (Cost Factor)**: Morselo uses 10 salt rounds (`saltRounds = 10`), providing strong computational protection against brute-force and dictionary attacks while maintaining low latency for genuine users.
4. **Non-Reversible Verification**: Authentication compares the submitted password against the stored hash using `bcrypt.compare()`, which internally hashes the candidate password with the embedded salt and performs constant-time comparison to prevent timing attacks.

---

## 2. Password Hashing & Authentication Flow

### A. User Registration Flow (`POST /api/auth/register`)
1. User provides `email`, `username`, and `password`.
2. Validation ensures email format and minimum password length (6+ characters).
3. Backend checks if the email already exists in the `User` MongoDB collection.
4. Password is cryptographically hashed:
   ```javascript
   const saltRounds = 10;
   const passwordHash = await bcrypt.hash(password, saltRounds);
   ```
5. A new `User` document is created storing `{ email, username, passwordHash }`.
6. A signed JWT token is issued and returned to the client along with the non-sensitive user profile.

### B. User Login Flow (`POST /api/auth/login`)
1. User submits identifier (`email` or `username`) and candidate `password`.
2. The user document is queried from MongoDB.
3. If no user is found, the server responds with `401 Unauthorized` without revealing whether the email or password was incorrect.
4. Password verification:
   ```javascript
   const isMatch = await bcrypt.compare(password, user.passwordHash);
   ```
5. If `isMatch` is `false`, the server responds with `401 Unauthorized`.
6. If `isMatch` is `true`, a JWT token is signed with the user payload and returned to the client (`200 OK`).

---

## 3. JSON Web Token (JWT) Flow

### Overview
**JSON Web Token (JWT)** is an open standard (RFC 7519) that defines a compact and self-contained way for securely transmitting information between parties as a JSON object.

- Tokens are signed using `process.env.JWT_SECRET`.
- Tokens expire after 1 hour (`expiresIn: '1h'`).
- The client passes the token via the `Authorization: Bearer <token>` HTTP header.

---

## 4. JWT Verification Middleware (`authenticateToken`)

The middleware [`server/middleware/auth.js`](file:///c:/Users/usswe/OneDrive/Desktop/Morselo/server/middleware/auth.js) intercepts requests to protected routes:
1. **Header Extraction**: Reads the standard `Authorization` header (`Bearer <token>`).
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
- `POST /api/auth/register`: Register a new user with bcrypt-hashed password.
- `POST /api/auth/login`: Authenticate credentials against bcrypt hash and receive a JWT.
- `GET /api/ingredients`: Retrieve ingredient catalog for recipe generator.
- `GET /api/recipes`: Retrieve saved recipe collection.
- `POST /api/recipes`: Save a recipe.
- `POST /api/recipes/generate`: AI recipe generation with Gemini.

---

## 6. Frontend Token Transmission Example

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
