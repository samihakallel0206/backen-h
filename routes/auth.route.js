//auth.route.js

const express = require('express');
const { 
    register, 
    login, 
    logout, 
    getCareerByCode,
    getAllUsers,
    getUserById,
    updateUser,
    updatePassword,
    deleteUser,
    getUsersForChat // ✅ AJOUT IMPORT
} = require('../controllers/auth.controller');
const isAdmin = require('../middleware/isAdmin');
const isAuth = require('../middleware/isAuth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

//current pour identifier le utilisateur connecté
router.get('/current', isAuth, (req,res) =>{
    res.json(req.user)
});

router.post('/logout', logout);
router.get('/career/:code', getCareerByCode);

// Nouvelles routes pour la gestion des utilisateurs
router.get('/all', isAdmin, getAllUsers);
router.get('/all/:id', isAuth, getUserById);
router.put('/update/:id', isAuth, updateUser);
router.put('/updatePass/:id/password', isAuth, updatePassword);
router.delete('/delete/:id', isAdmin, deleteUser);

// ✅ AJOUTER LA ROUTE CHAT DANS AUTH.ROUTE.JS
router.get('/chat/users', isAuth, getUsersForChat);

module.exports = router;
