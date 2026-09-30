const jwt = require('jsonwebtoken')

/**
 * JWT Authentication Middleware
 * Validates the JSON Web Token provided in the HTTP Authorization header.
 * Attaches the verified user payload (including role) to `req.user`.
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization || req.headers.Authorization

    if (!authHeader || typeof authHeader !== 'string') {
        return res.status(401).json({
            error: 'Access denied. No authentication token provided.',
        })
    }

    const parts = authHeader.trim().split(' ')
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
        return res.status(401).json({
            error: 'Invalid authorization format. Format must be "Bearer <token>".',
        })
    }

    const token = parts[1]
    const secret = process.env.JWT_SECRET || 'morselo_super_secret_jwt_key_2026'

    try {
        const decoded = jwt.verify(token, secret)
        req.user = {
            ...decoded,
            role: decoded.role || 'user',
        }
        next()
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Authentication token has expired. Please log in again.',
            })
        }
        return res.status(401).json({
            error: 'Invalid authentication token.',
        })
    }
}

/**
 * Role-Based Access Control (RBAC) Middleware
 * Ensures the authenticated user possesses the required role to access the endpoint.
 * Returns HTTP 403 Forbidden for authenticated users without permission.
 */
function requireRole(requiredRole) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Access denied. User authentication required.',
            })
        }

        const userRole = req.user.role || 'user'
        if (userRole !== requiredRole) {
            return res.status(403).json({
                error: `Forbidden. Requires "${requiredRole}" role.`,
            })
        }

        next()
    }
}

module.exports = {
    authenticateToken,
    requireRole,
}
