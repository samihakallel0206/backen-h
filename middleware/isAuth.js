//middleware/isAuth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const isAuth = async (req, res, next) => {
    try {
        console.log('🟢 isAuth middleware called for:', req.method, req.originalUrl);
        
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        console.log('🔑 Token received:', token ? 'YES' : 'NO');
        
        if (!token) {
            console.log('❌ No token provided');
            return res.status(401).json({ 
                success: false,
                errors: [{msg: "Token d'authentification manquant"}] 
            });
        }

        console.log('🔐 Verifying token...');
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        console.log('🟢 Token decoded, user id:', decoded.id);
        
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            console.log('❌ User not found in database');
            return res.status(401).json({ 
                success: false,
                errors: [{msg: "Utilisateur non trouvé"}] 
            });
        }

        req.user = user;
        console.log('🟢 User authenticated successfully:', user._id);
        next();
        
    } catch (error) {
        console.error('❌ Auth middleware error:', error.message);
        res.status(401).json({ 
            success: false,
            errors: [{msg: "Token invalide"}] 
        });
    }
};

module.exports = isAuth; 