//middleware/isAdmin.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const isAdmin = async (req, res, next) => {
    try {
        // Vérifier la présence du token
        const authHeader = req.headers["authorization"];
        //console.log(authHeader)
        if (!authHeader) {
            return res.status(401).json({ errors: [{ msg: 'Token manquant ou format invalide' }] });
        }

        
        // Vérifier et décoder le token
        const decode = jwt.decode(authHeader, process.env.SECRET_KEY);
        
        // Trouver l'utilisateur
        const foundUser = await User.findOne({_id:decode.id});
        //console.log(foundUser)
        if (!foundUser) {
            return res.status(404).json({ errors: [{ msg: 'Utilisateur introuvable' }] });
        }
        
        // Vérifier les privilèges admin
        if (!foundUser.isAdmin && foundUser.role !== 'admin') {
            return res.status(403).json({ errors: [{ msg: 'Accès refusé : privilèges administrateur requis' }] });
        }

        // Ajouter l'utilisateur à la requête
        req.user = foundUser;
        next();

    } catch (error) {
        console.error("Middleware isAdmin error:", error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ errors: [{ msg: 'Token invalide' }] });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ errors: [{ msg: 'Token expiré' }] });
        }
        
        res.status(500).json({ errors: [{ msg: 'Erreur d\'authentification' }] });
    }
};

module.exports = isAdmin;
