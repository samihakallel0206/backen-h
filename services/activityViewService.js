// services/activityViewService.js

const NotificationActivity = require("../models/NotificationActivity");
const Activity = require("../models/Activity");

class ActivityViewService {
    
    // ✅ METHODE MANQUANTE : Vérifier si une activité est NOUVELLE pour l'utilisateur
    static async isActivityNewForUser(activityId, userId) {
        try {
            console.log(`🔍 Vérification si activité ${activityId} est nouvelle pour utilisateur ${userId}`);
            
            // Vérifier s'il existe une notification NON VUE pour cette activité
            const unviewedNotification = await NotificationActivity.findOne({
                recipient: userId,
                activity: activityId,
                activity_viewed: false,
                type: { 
                    $in: [
                        'activity_created_public', 
                        'activity_created_identified', 
                        'identified_in_activity'
                    ] 
                }
            });

            const isNew = !!unviewedNotification;
            console.log(`📊 Activité ${activityId} est nouvelle: ${isNew}`);
            
            return isNew;
            
        } catch (error) {
            console.error('❌ Erreur vérification activité nouvelle:', error);
            return false; // En cas d'erreur, considérer comme non nouvelle
        }
    }

    // ✅ Marquer une activité comme vue (quand l'utilisateur consulte l'activité)
    static async markActivityAsViewed(activityId, userId) {
        try {
            console.log(`👁️ Marquage activité ${activityId} comme vue par utilisateur ${userId}`);
            
            // Marquer toutes les notifications liées à cette activité comme "activité vue"
            const result = await NotificationActivity.updateMany(
                {
                    recipient: userId,
                    activity: activityId,
                    activity_viewed: false
                },
                {
                    $set: { 
                        activity_viewed: true,
                        is_read: true // ✅ Marquer aussi comme lue
                    }
                }
            );

            console.log(`✅ ${result.modifiedCount} notifications marquées comme vues pour l'activité ${activityId}`);
            return result.modifiedCount;
            
        } catch (error) {
            console.error('❌ Erreur marquage activité vue:', error);
            throw error;
        }
    }

    // ✅ Récupérer le compteur de NOUVELLES ACTIVITÉS non consultées
    static async getUnviewedActivitiesCount(userId) {
        try {
            // Compter les activités avec des notifications non consultées
            const unviewedCount = await NotificationActivity.countDocuments({
                recipient: userId,
                activity_viewed: false,
                // Seulement les notifications de nouvelles activités, pas les likes/commentaires
                type: { 
                    $in: [
                        'activity_created_public', 
                        'activity_created_identified', 
                        'identified_in_activity'
                    ] 
                }
            });

            console.log(`📊 ${unviewedCount} activités non consultées pour l'utilisateur ${userId}`);
            return unviewedCount;

        } catch (error) {
            console.error('❌ Erreur comptage activités non consultées:', error);
            return 0; // Retourner 0 en cas d'erreur
        }
    }

    // ✅ Marquer TOUTES les activités comme consultées
    static async markAllActivitiesAsViewed(userId) {
        try {
            const result = await NotificationActivity.updateMany(
                {
                    recipient: userId,
                    activity_viewed: false,
                    type: { 
                        $in: [
                            'activity_created_public', 
                            'activity_created_identified', 
                            'identified_in_activity'
                        ] 
                    }
                },
                {
                    $set: { 
                        activity_viewed: true,
                        is_read: true
                    }
                }
            );

            console.log(`✅ ${result.modifiedCount} activités marquées comme consultées pour l'utilisateur ${userId}`);
            return result.modifiedCount;

        } catch (error) {
            console.error('❌ Erreur marquage toutes activités consultées:', error);
            throw error;
        }
    }

    // ✅ Vérifier si une activité spécifique a été consultée
    static async isActivityViewed(activityId, userId) {
        try {
            const notification = await NotificationActivity.findOne({
                recipient: userId,
                activity: activityId,
                activity_viewed: true
            });

            return !!notification; // Retourne true si au moins une notification est marquée comme vue
        } catch (error) {
            console.error('❌ Erreur vérification activité consultée:', error);
            return false;
        }
    }

    // ✅ Récupérer les IDs des activités non consultées
    static async getUnviewedActivityIds(userId) {
        try {
            const unviewedNotifications = await NotificationActivity.find({
                recipient: userId,
                activity_viewed: false,
                type: { 
                    $in: [
                        'activity_created_public', 
                        'activity_created_identified', 
                        'identified_in_activity'
                    ] 
                }
            }).select('activity').distinct('activity');

            return unviewedNotifications;
        } catch (error) {
            console.error('❌ Erreur récupération IDs activités non consultées:', error);
            return [];
        }
    }
}

module.exports = ActivityViewService;