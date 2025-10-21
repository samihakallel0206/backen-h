
// routes/activity.route.js

const express = require('express');
const { 
    createActivity,
    getAllActivities,
    getActivityById,
    updateActivity,
    deleteActivity,
    likeActivity,
    addComment,
    getUserActivities,
    getUsersForMention,
    replyToComment,
    likeComment,
    likeReply,
    deleteComment,
    deleteReply,
    getFilteredActivities,
    searchActivities,
    getAdminStats,
    addIdentifiedUser,
    removeIdentifiedUser,
    getIdentifiedActivities,
    markAllActivitiesAsViewed // ✅ IMPORTATION CORRECTE
} = require('../controllers/activity.controller');
const isAuth = require('../middleware/isAuth');
const isAdmin = require('../middleware/isAdmin');
const router = express.Router();

// ✅ Vérification que tous les contrôleurs sont bien définis
console.log('🟢 Activity Controller Functions:');
console.log('- createActivity:', typeof createActivity);
console.log('- getAllActivities:', typeof getAllActivities);
console.log('- getActivityById:', typeof getActivityById);
console.log('- getUsersForMention:', typeof getUsersForMention);
console.log('- markAllActivitiesAsViewed:', typeof markAllActivitiesAsViewed); // ✅ VÉRIFICATION

// ✅ Routes pour les activités
router.post('/', isAuth, createActivity);
router.get('/', isAuth, getAllActivities);
router.get('/filtered', isAuth, getFilteredActivities);
router.get('/search', isAuth, searchActivities);
router.get('/user/:userId', isAuth, getUserActivities);
router.get('/identified', isAuth, getIdentifiedActivities);
router.get('/:id', isAuth, getActivityById);
router.put('/:id', isAuth, updateActivity);
router.delete('/:id', isAdmin, deleteActivity);

// ✅ Routes pour les interactions
router.post('/:id/like', isAuth, likeActivity);
router.post('/:id/comment', isAuth, addComment);

// ✅ Routes pour les réponses et likes de commentaires
router.post('/:activityId/comments/:commentId/reply', isAuth, replyToComment);
router.post('/:activityId/comments/:commentId/like', isAuth, likeComment);
router.delete('/:activityId/comments/:commentId', isAuth, deleteComment);

// ✅ Routes pour les likes de réponses et suppression
router.post('/:activityId/comments/:commentId/replies/:replyId/like', isAuth, likeReply);
router.delete('/:activityId/comments/:commentId/replies/:replyId', isAuth, deleteReply);

// ✅ Routes pour l'identification des utilisateurs
router.post('/:activityId/identified-users', isAuth, addIdentifiedUser);
router.delete('/:activityId/identified-users/:userId', isAuth, removeIdentifiedUser);

// ✅ Route pour l'admin
router.get('/admin/stats', isAuth, getAdminStats);

// ✅ Route pour l'auto-complétion des utilisateurs
router.get('/mention/users', isAuth, getUsersForMention);

// ✅ NOUVELLE ROUTE POUR MARQUER TOUTES LES ACTIVITÉS COMME VUES
router.post('/mark-all-viewed', isAuth, markAllActivitiesAsViewed);

module.exports = router;