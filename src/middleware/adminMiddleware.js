// Admin Middleware - Checks if user has admin role
const adminMiddleware = (req, res, next) => {
    try {
        // Check if user exists (should be set by authMiddleware)
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required.' });
        }

        // Check if user has admin role
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required. You do not have permission to perform this action.' });
        }

        // User is admin, proceed to next middleware/route
        next();
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error in admin middleware.' });
    }
};

const isAdmin = (req, res, next) => {
    // req.user was set by the first verifyToken middleware
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ error: 'Access denied. Admins only.' });
    }
};

module.exports = adminMiddleware, isAdmin;
