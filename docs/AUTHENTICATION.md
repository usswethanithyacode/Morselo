# Morselo Authentication & Authorization Architecture

This document describes the **JSON Web Token (JWT)** authentication, **Bcrypt Password Hashing**, and **Role-Based Access Control (RBAC)** architecture implemented in Morselo.

---

## 1. Role-Based Access Control (RBAC)

### What is RBAC in Morselo?
Role-Based Access Control (RBAC) is an authorization mechanism that restricts system access based on the roles assigned to authenticated users. In Morselo, RBAC separates standard culinary application users from administrative users who manage the global PostgreSQL ingredient catalog.

### Available Roles
| Role | Description | Permissions |
|------|-------------|-------------|
| `user` | Standard registered user | Authenticate, inspect profile (`/api/auth/me`), search ingredients, generate AI recipes, save and manage recipes. |
| `admin` | Administrative system user | All `user` permissions, plus administrative batch catalog modifications (`POST /api/ingredients/batch`). |

### Role Storage & Safe Defaults
- The `User` model in [`server/models/User.js`](file:///c:/Users/usswe/OneDrive/Desktop/Morselo/server/models/User.js) defines a `role` field with an enum `['user', 'admin']` defaulting to `'user'`.
- Existing users without an explicit role safely default to `'user'`.
- To prevent privilege escalation, public registration (`POST /api/auth/register`) explicitly sets `role: 'user'`, ignoring any arbitrary role fields in the request body.

---

## 2. JWT Role Inclusion & Verification

### Role in JWT Payload
When signing a JWT during registration or login, the user's role is embedded directly in the token payload:
```javascript
const payload = {
    id: user._id.toString(),
    email: user.email,
    username: user.username,
    role: user.role || 'user',
};
const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
```

### Verification Middleware
1. **`authenticateToken`** ([`server/middleware/auth.js`](file:///c:/Users/usswe/OneDrive/Desktop/Morselo/server/middleware/auth.js)):
   - Verifies the cryptographic signature of the Bearer token.
   - Extracts the decoded payload and attaches `req.user = { ...decoded, role: decoded.role || 'user' }`.
   - Returns **401 Unauthorized** if the token is missing, invalid, or expired.
2. **`requireRole(requiredRole)`** ([`server/middleware/auth.js`](file:///c:/Users/usswe/OneDrive/Desktop/Morselo/server/middleware/auth.js)):
   - Checks if `req.user.role === requiredRole`.
   - Returns **403 Forbidden** (`{ error: 'Forbidden. Requires "admin" role.' }`) if the authenticated user lacks the required role.
   - Passes control to `next()` if the user has the required permission.

---

## 3. HTTP Status Codes & Error Handling (401 vs. 403)

- **`401 Unauthorized`**: Authentication failure. The request lacks valid authentication credentials (e.g., missing Authorization header, expired token, or invalid JWT signature).
- **`403 Forbidden`**: Authorization failure. The user is successfully authenticated, but their assigned role does not permit access to the requested administrative resource.

---

## 4. Protected vs. Admin-Only vs. Public Endpoints

### Admin-Only Endpoints (`authenticateToken` + `requireRole('admin')`)
- `POST /api/ingredients/batch`: Atomically adds new catalog categories and ingredient batches via Sequelize transactions. Restricting this to administrators prevents unauthorized alterations to the global ingredient catalog.

### Protected User Endpoints (`authenticateToken`)
- `GET /api/auth/me`: Returns the authenticated user's profile and assigned role (`req.user`).

### Public Endpoints
- `POST /api/auth/register`: Public registration (always creates `role: 'user'`).
- `POST /api/auth/login`: Public login against bcrypt-hashed passwords.
- `GET /api/ingredients`: Retrieve ingredient catalog for recipe generator.
- `GET /api/recipes`: Retrieve saved recipe collection.
- `POST /api/recipes`: Save a recipe.
- `POST /api/recipes/generate`: AI recipe generation with Gemini.

---

## 5. Password Hashing & Security Summary

1. **Bcrypt Hashing**: Passwords are never stored in plaintext. Passwords are salted and hashed with `saltRounds = 10` using `bcryptjs`.
2. **One-Way Cryptography**: Verification uses constant-time `bcrypt.compare(candidatePassword, storedHash)`.
3. **Secret Isolation**: `JWT_SECRET` is kept exclusively in `server/.env` and never tracked or committed.
