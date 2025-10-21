//controllers/activityViewController.js
const ActivityViewService = require("../services/activityViewService");
const NotificationActivityService = require("../services/notificationActivityService");

// ✅ RÉCUPÉRER LES ACTIVITÉS NON CONSULTÉES
const getUnviewedActivities = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await NotificationActivityService.getUnviewedActivities(userId);

        res.status(200).json({
            success: true,
            unviewedActivities: result.notifications,
            unviewedActivityIds: result.activityIds,
            count: result.activityIds.length
        });
    } catch (error) {
        console.error("❌ Get unviewed activities error:", error);
        res.status(500).json({ 
            errors: [{ msg: "Erreur lors de la récupération des activités non consultées" }] 
        });
    }
};

// ✅ VÉRIFIER SI UNE ACTIVITÉ EST NOUVELLE POUR L'UTILISATEUR
const checkActivityViewStatus = async (req, res) => {
    try {
        const { activityId } = req.params;
        const userId = req.user.id;

        // ✅ CORRECTION : Utiliser ActivityViewService au lieu de NotificationActivityService
        const isNew = await ActivityViewService.isActivityNewForUser(activityId, userId);

        console.log(`🔍 Vérification statut activité ${activityId} pour utilisateur ${userId}: ${isNew}`);

        res.status(200).json({
            success: true,
            isNewActivity: isNew,
            activityId: activityId
        });
    } catch (error) {
        console.error("❌ Check activity view status error:", error);
        res.status(500).json({ 
            success: false,
            errors: [{ msg: "Erreur lors de la vérification du statut de l'activité" }],
            isNewActivity: false
        });
    }
};

// ✅ MARQUER UNE ACTIVITÉ COMME CONSULTÉE
const markActivityAsViewed = async (req, res) => {
    try {
        const { activityId } = req.params;
        const userId = req.user.id;

        const updatedCount = await ActivityViewService.markActivityAsViewed(activityId, userId);

        console.log(`✅ Activité ${activityId} marquée comme vue par l'utilisateur ${userId}`);

        res.status(200).json({
            success: true,
            message: "Activité marquée comme consultée",
            updatedCount
        });
    } catch (error) {
        console.error("❌ Mark activity as viewed error:", error);
        res.status(500).json({ 
            success: false,
            errors: [{ msg: "Erreur lors du marquage de l'activité" }] 
        });
    }
};

module.exports = {
    getUnviewedActivities,
    checkActivityViewStatus,
    markActivityAsViewed
};