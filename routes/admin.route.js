//routes/admin.route.js

const express = require('express')
const { getAllUsers, deleteUser } = require('../controllers/auth.controller');
const isAdmin = require('../middleware/isAdmin');
const isAuth = require('../middleware/isAuth'); // 🔥 IMPORT MANQUANT
const { getAllJob, deleteJob, updateUser } = require('../controllers/admin.controller');

const router = express.Router()

/*router.get('/test', (req,res) => {
    res.status(200).json({msg:"Hello Test admin"})
})*/
router.put('/update/:id', isAdmin, updateUser);

router.get('/all', isAdmin, getAllUsers);
router.delete('/:id', isAdmin, deleteUser);
//router.put("/:id", isAuth, isAdmin, updateUser); // ✅ CORRIGÉ

router.get('/job/all', isAdmin, getAllJob);
router.delete('/job/:id', isAdmin, deleteJob);

module.exports = router

/**************************************************************** */
