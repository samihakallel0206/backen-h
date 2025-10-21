
// controllers/activity.controller.js

const Activity = require("../models/Activity");
const User = require("../models/User");
const NotificationActivityService = require("../services/notificationActivityService");
const ActivityViewService = require("../services/activityViewService");

// ✅ Vérification que les modèles sont bien chargés
console.log('🟢 Loading Activity Controller...');
console.log('📦 Activity Model:', typeof Activity);
console.log('📦 User Model:', typeof User);
console.log('📦 NotificationActivityService:', typeof NotificationActivityService);
console.log('📦 ActivityViewService:', typeof ActivityViewService);

// ✅ CREATE ACTIVITY - CORRIGÉ AVEC NOTIFICATIONS
const createActivity = async (req, res) => {
    try {
        console.log('🟢 CONTROLLER CREATE ACTIVITY: Données reçues:', req.body);
        console.log('🟢 CONTROLLER CREATE ACTIVITY: Utilisateur:', req.user.id);

        const {
            general_activity,
            activity_type,
            start_date,
            start_time,
            end_date,
            end_time,
            activity_subject,
            description,
            notes,
            visibility,
            identified_users_ids,
            uploads
        } = req.body;

        // Validation des champs requis
        if (!general_activity || !activity_type || !activity_subject || !start_date || !end_date) {
            return res.status(400).json({
                errors: [{ msg: 'Tous les champs obligatoires doivent être remplis' }]
            });
        }

        // ✅ CORRECTION : Préparer les utilisateurs identifiés
        let identifiedUsersData = [];
        if (identified_users_ids && identified_users_ids.length > 0) {
            console.log('🔍 RECHERCHE UTILISATEURS:', identified_users_ids);
            
            try {
                const users = await User.find({ 
                    _id: { $in: identified_users_ids } 
                }).select('name email_address current_career_plan profile_picture grade');
                
                console.log('👥 UTILISATEURS TROUVÉS:', users.length);

                identifiedUsersData = users.map(user => {
                    const userData = {
                        user: user._id,
                        name: user.name || `Utilisateur ${user._id.toString().slice(-6)}`,
                        email: user.email_address || `${user.name?.replace(/\s+/g, '').toLowerCase() || 'user'}@example.com`,
                        current: user.current_career_plan || 'Poste non spécifié',
                        profile_picture: user.profile_picture || null,
                        current_career_plan: user.current_career_plan || '',
                        grade: user.grade || ''
                    };
                    return userData;
                });

            } catch (userError) {
                console.error('❌ ERREUR RECHERCHE UTILISATEURS:', userError);
                return res.status(400).json({
                    errors: [{ msg: 'Erreur lors de la recherche des utilisateurs identifiés' }]
                });
            }
        }

        // Création de l'activité
        const activityData = {
            general_activity,
            activity_type,
            start_date,
            start_time: start_time || '00:00',
            end_date,
            end_time: end_time || '23:59',
            activity_subject: activity_subject || 'Sans titre',
            description: description || '',
            notes: notes || '',
            visibility: visibility || 'خاص',
            identified_users: identifiedUsersData,
            uploads: uploads || [],
            user: req.user.id,
            created_by: req.user.id,
            is_published: true
        };

        console.log('📦 DONNÉES ACTIVITÉ PRÊTES:', activityData);

        const newActivity = new Activity(activityData);

        // Validation avant sauvegarde
        try {
            await newActivity.validate();
        } catch (validationError) {
            console.error('❌ ERREUR VALIDATION:', validationError);
            return res.status(400).json({
                errors: [{ msg: 'Erreur de validation des données' }]
            });
        }

        // Sauvegarde
        const savedActivity = await newActivity.save();
        console.log('✅ ACTIVITÉ SAUVEGARDÉE:', savedActivity._id);

        // ✅ NOTIFICATIONS APRÈS CRÉATION
        try {
            const creator = await User.findById(req.user.id);
            
            if (savedActivity.visibility === 'عام') {
                // Notification pour tous les utilisateurs
                await NotificationActivityService.notifyPublicActivity(savedActivity, creator);
                console.log('📢 Notifications publiques envoyées');
            } 
            else if (savedActivity.visibility === 'مستخدمين محددين' && identifiedUsersData.length > 0) {
                // Notification seulement pour les utilisateurs identifiés
                await NotificationActivityService.notifyIdentifiedUsers(savedActivity, creator, identifiedUsersData);
                console.log('🎯 Notifications utilisateurs identifiés envoyées');
            }
            // Pas de notification pour 'خاص'
            
        } catch (notificationError) {
            console.error('⚠️ Erreur envoi notifications:', notificationError);
            // Ne pas bloquer la réponse si les notifications échouent
        }

        // Populer les données
        await savedActivity.populate('user', 'name profile_picture current_career_plan grade');
        await savedActivity.populate('identified_users.user', 'name profile_picture current_career_plan grade');

        res.status(201).json({
            success: [{ msg: 'Activité créée avec succès' }],
            activity: savedActivity
        });

    } catch (error) {
        console.error('❌ ERREUR CREATE ACTIVITY:', error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                errors: Object.values(error.errors).map(err => ({
                    msg: err.message,
                    path: err.path
                }))
            });
        }

        res.status(500).json({
            errors: [{ msg: 'Erreur serveur lors de la création de l\'activité' }]
        });
    }
};

// ✅ GET ALL ACTIVITIES - CORRIGÉ POUR ADMIN
const getAllActivities = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const isAdminUser = req.user.role === 'admin';
        
        console.log('📥 GET ALL ACTIVITIES - User ID:', currentUserId);
        console.log('👑 IS ADMIN:', isAdminUser);

        let query = { is_published: true };

        // ✅ CORRECTION CRITIQUE : Si c'est un admin, voir TOUTES les activités SANS restriction
        if (!isAdminUser) {
            // Logique normale pour les utilisateurs non-admin
            query.$or = [
                { visibility: 'عام' }, // Public
                { visibility: 'خاص', user: currentUserId }, // Privé - seulement propriétaire
                { visibility: 'مستخدمين محددين', "identified_users.user": currentUserId }, // Utilisateurs spécifiques
                { user: currentUserId } // Propriétaire de l'activité
            ];
            console.log('🔍 GET ALL ACTIVITIES - Mode utilisateur normal');
        } else {
            console.log('👑 GET ALL ACTIVITIES - Mode admin: accès à TOUTES les activités SANS restriction');
            // Pas de restriction de visibilité pour l'admin - query reste { is_published: true }
        }

        console.log('🔍 GET ALL ACTIVITIES - Query:', JSON.stringify(query));

        const activities = await Activity.find(query)
            .populate('user', 'name profile_picture current_career_plan grade')
            .populate({
                path: 'identified_users.user',
                select: 'name profile_picture current_career_plan grade email_address'
            })
            .populate('comments.user', 'name profile_picture current_career_plan grade')
            .populate('comments.replies.user', 'name profile_picture current_career_plan grade')
            .populate('likes', 'name profile_picture current_career_plan grade _id')
            .populate('comments.likes', 'name profile_picture current_career_plan grade _id')
            .populate('comments.replies.likes', 'name profile_picture current_career_plan grade _id')
            .sort({ createdAt: -1 });

        console.log('📥 ACTIVITÉS TROUVÉES:', activities.length);

        // Ajouter les statuts like/identification
        const activitiesWithLikeStatus = activities.map(activity => {
            const activityObj = activity.toObject();
            const currentUserIdStr = currentUserId.toString();

            activityObj.userHasLiked = activity.likes.some(like => {
                if (!like) return false;
                return like._id?.toString() === currentUserIdStr || like.toString() === currentUserIdStr;
            });

            activityObj.userIsIdentified = false;
            if (activity.identified_users && activity.identified_users.length > 0) {
                activityObj.userIsIdentified = activity.identified_users.some(identifiedUser => {
                    if (!identifiedUser.user) return false;
                    const identifiedUserId = identifiedUser.user._id ? 
                        identifiedUser.user._id.toString() : 
                        identifiedUser.user.toString();
                    return identifiedUserId === currentUserIdStr;
                });
            }

            // ✅ LOG ADMIN POUR CONFIRMER L'ACCÈS COMPLET
            if (isAdminUser) {
                console.log(`👑 ADMIN - Activité ${activityObj._id}: ${activityObj.activity_subject}`);
                console.log(`   👤 Créateur: ${activityObj.user?.name} (${activityObj.user?._id})`);
                console.log(`   🔒 Visibilité: ${activityObj.visibility}`);
            }

            return activityObj;
        });

        res.status(200).json({
            success: true,
            activities: activitiesWithLikeStatus,
            count: activities.length,
            isAdmin: isAdminUser // ✅ Inclure l'info admin dans la réponse
        });
    } catch (error) {
        console.error("❌ Get all activities error:", error);
        res.status(500).json({ 
            errors: [{ msg: "Erreur lors de la récupération des activités" }]
        });
    }
};

// ✅ GET FILTERED ACTIVITIES - CORRIGÉ POUR ADMIN
const getFilteredActivities = async (req, res) => {
    try {
        const {
            viewMode = 'all',
            activityType,
            startDate,
            endDate,
            search,
            page = 1,
            limit = 20
        } = req.query;

        const currentUserId = req.user.id;
        const isAdminUser = req.user.role === 'admin';
        
        console.log('🎯 GET FILTERED ACTIVITIES - ViewMode:', viewMode, 'User ID:', currentUserId);
        console.log('👑 IS ADMIN:', isAdminUser);

        let query = { is_published: true };

        // ✅ CORRECTION CRITIQUE : Gestion des viewModes avec logique admin COMPLÈTE
        if (viewMode === 'identified' && currentUserId) {
            query["identified_users.user"] = currentUserId;
            console.log('🎯 MODE IDENTIFIÉ - Filtrage par utilisateur identifié');
        }
        else if (viewMode === 'my' && currentUserId) {
            query.user = currentUserId;
            console.log('👤 MODE MES ACTIVITÉS - Filtrage par créateur');
        }
        else if (viewMode === 'public') {
            query.visibility = 'عام';
            console.log('🌍 MODE PUBLIC - Filtrage par visibilité publique');
        }
        else {
            // Mode 'all' - voir toutes les activités selon les permissions
            if (!isAdminUser) {
                query.$or = [
                    { visibility: 'عام' }, // Public
                    { user: currentUserId }, // Mes activités
                    { "identified_users.user": currentUserId } // Activités où je suis identifié
                ];
                console.log('📁 MODE TOUT - Filtrage par permissions utilisateur normal');
            } else {
                console.log('👑 MODE ADMIN - Accès à TOUTES les activités SANS restriction');
                // Pas de restriction pour l'admin - il voit tout
            }
        }

        // Autres filtres
        if (activityType) {
            query.general_activity = activityType;
            console.log('🔧 Filtre type activité:', activityType);
        }

        if (startDate || endDate) {
            query.start_date = {};
            if (startDate) {
                query.start_date.$gte = new Date(startDate);
                console.log('📅 Filtre date début:', startDate);
            }
            if (endDate) {
                query.start_date.$lte = new Date(endDate);
                console.log('📅 Filtre date fin:', endDate);
            }
        }

        // Recherche texte
        if (search) {
            const searchConditions = [
                { activity_subject: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { general_activity: { $regex: search, $options: 'i' } },
                { activity_type: { $regex: search, $options: 'i' } }
            ];

            // ✅ CORRECTION : Si on a déjà des conditions, on les combine
            if (query.$or) {
                query = {
                    $and: [
                        query,
                        { $or: searchConditions }
                    ]
                };
            } else {
                query.$or = searchConditions;
            }
            console.log('🔍 Recherche texte:', search);
        }

        console.log('🔍 QUERY FINAL:', JSON.stringify(query, null, 2));

        // Pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const activities = await Activity.find(query)
            .populate('user', 'name profile_picture current_career_plan grade')
            .populate({
                path: 'identified_users.user',
                select: 'name profile_picture current_career_plan grade email_address'
            })
            .populate('comments.user', 'name profile_picture current_career_plan grade')
            .populate('comments.replies.user', 'name profile_picture current_career_plan grade')
            .populate('likes', 'name profile_picture current_career_plan grade _id')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        const total = await Activity.countDocuments(query);

        console.log('📥 ACTIVITÉS TROUVÉES:', activities.length);

        const activitiesWithStatus = activities.map(activity => {
            const activityObj = activity.toObject();
            const currentUserIdStr = currentUserId.toString();

            activityObj.userHasLiked = activity.likes && activity.likes.some(like => {
                if (!like) return false;
                const likeId = like._id ? like._id.toString() : like.toString();
                return likeId === currentUserIdStr;
            });

            activityObj.userIsIdentified = false;
            if (activity.identified_users && activity.identified_users.length > 0) {
                activityObj.userIsIdentified = activity.identified_users.some(identifiedUser => {
                    if (!identifiedUser.user) return false;
                    const identifiedUserId = identifiedUser.user._id ? 
                        identifiedUser.user._id.toString() : 
                        identifiedUser.user.toString();
                    return identifiedUserId === currentUserIdStr;
                });
            }

            // ✅ DEBUG pour l'admin
            if (isAdminUser) {
                console.log(`👑 ADMIN - Activité ${activityObj._id}:`);
                console.log(`   👤 Créateur: ${activityObj.user?._id} (${activityObj.user?.name})`);
                console.log(`   🔒 Visibilité: ${activityObj.visibility}`);
                console.log(`   📝 Titre: ${activityObj.activity_subject}`);
            }

            return activityObj;
        });

        res.status(200).json({
            success: true,
            activities: activitiesWithStatus,
            count: activities.length,
            total: total,
            pagination: {
                current: pageNum,
                pages: Math.ceil(total / limitNum),
                limit: limitNum
            },
            filters: { viewMode, activityType, startDate, endDate, search },
            isAdmin: isAdminUser
        });

    } catch (error) {
        console.error('❌ ERREUR getFilteredActivities:', error);
        res.status(500).json({ 
            errors: [{ msg: 'Erreur serveur lors du filtrage des activités' }] 
        });
    }
};

// ✅ GET ACTIVITY BY ID - CORRIGÉ POUR ADMIN
const getActivityById = async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.id)
            .populate('user', 'name profile_picture current_career_plan grade')
            .populate({
                path: 'identified_users.user',
                select: 'name profile_picture current_career_plan grade email_address'
            })
            .populate('comments.user', 'name profile_picture current_career_plan grade')
            .populate('comments.replies.user', 'name profile_picture current_career_plan grade')
            .populate('likes', 'name profile_picture current_career_plan grade _id')
            .populate('comments.likes', 'name profile_picture current_career_plan grade _id')
            .populate('comments.replies.likes', 'name profile_picture current_career_plan grade _id');

        if (!activity) {
            return res.status(404).json({ errors: [{ msg: "Activité non trouvée" }] });
        }

        const currentUserId = req.user.id.toString();
        const isAdminUser = req.user.role === 'admin';
        
        const canView = isAdminUser ||
            activity.visibility === 'عام' ||
            activity.user._id.toString() === currentUserId ||
            activity.identified_users.some(identifiedUser => 
                identifiedUser.user && identifiedUser.user.toString() === currentUserId
            );

        if (!canView) {
            return res.status(403).json({ errors: [{ msg: "Accès non autorisé à cette activité" }] });
        }

        // ✅ MARQUER L'ACTIVITÉ COMME VUE
        try {
            await ActivityViewService.markActivityAsViewed(activity._id, currentUserId);
            console.log(`👁️ Activité ${activity._id} marquée comme vue par ${currentUserId}`);
        } catch (viewError) {
            console.error('⚠️ Erreur marquage activité vue:', viewError);
        }

        const activityObj = activity.toObject();
        
        activityObj.userHasLiked = activity.likes.some(like => 
            like._id?.toString() === currentUserId || like.toString() === currentUserId
        );
        
        activityObj.userIsIdentified = activity.identified_users.some(identifiedUser => 
            identifiedUser.user && identifiedUser.user.toString() === currentUserId
        );

        res.status(200).json({
            success: true,
            activity: activityObj,
            isAdmin: isAdminUser
        });
    } catch (error) {
        console.error("❌ Get activity by ID error:", error);
        res.status(500).json({ errors: [{ msg: "Erreur lors de la récupération de l'activité" }] });
    }
};

// ✅ MARQUER TOUTES LES ACTIVITÉS COMME CONSULTÉES
const markAllActivitiesAsViewed = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const updatedCount = await ActivityViewService.markAllActivitiesAsViewed(userId);

        res.status(200).json({
            success: true,
            message: `${updatedCount} activités marquées comme consultées`,
            updatedCount
        });

    } catch (error) {
        console.error("❌ Mark all activities as viewed error:", error);
        res.status(500).json({ errors: [{ msg: "Erreur lors du marquage des activités" }] });
    }
};

// ✅ UPDATE ACTIVITY - CORRIGÉ
const updateActivity = async (req, res) => {
    try {
        const { id } = req.params;
        const { identified_users_ids, ...updateData } = req.body;

        const activityToUpdate = await Activity.findById(id);
        if (!activityToUpdate) {
            return res.status(404).json({ errors: [{ msg: "Activité non trouvée" }] });
        }

        const isOwner = activityToUpdate.user.toString() === req.user.id.toString();
        const isAdminUser = req.user.role === 'admin';

        if (!isOwner && !isAdminUser) {
            return res.status(403).json({ errors: [{ msg: "Pas le droit de modifier cette activité" }] });
        }

        // Mettre à jour les utilisateurs identifiés si fournis
        if (identified_users_ids !== undefined) {
            let identifiedUsersData = [];
            if (identified_users_ids && identified_users_ids.length > 0) {
                const users = await User.find({ 
                    _id: { $in: identified_users_ids } 
                }).select('name email_address current_career_plan profile_picture grade');
                
                identifiedUsersData = users.map(user => ({
                    user: user._id,
                    name: user.name,
                    email: user.email_address,
                    current: user.current_career_plan,
                    profile_picture: user.profile_picture || null,
                    current_career_plan: user.current_career_plan,
                    grade: user.grade
                }));
            }
            updateData.identified_users = identifiedUsersData;
        }

        const updatedActivity = await Activity.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        )
            .populate('user', 'name profile_picture current_career_plan grade')
            .populate({
                path: 'identified_users.user',
                select: 'name profile_picture current_career_plan grade email_address'
            });

        res.status(200).json({
            success: [{ msg: "Activité mise à jour avec succès" }],
            activity: updatedActivity
        });

    } catch (error) {
        console.error("❌ Update activity error:", error);
        res.status(400).json({ 
            errors: [{ msg: "Echec impossible de mettre à jour cette activité" }]
        });
    }
};

// ✅ DELETE ACTIVITY
const deleteActivity = async (req, res) => {
    try {
        const activityId = req.params.id;

        const activity = await Activity.findById(activityId);
        if (!activity) {
            return res.status(404).json({ errors: [{ msg: "Activité non trouvée" }] });
        }

        const isOwner = activity.user.toString() === req.user.id.toString();
        const isAdminUser = req.user.role === 'admin';

        if (!isOwner && !isAdminUser) {
            return res.status(403).json({ errors: [{ msg: "Pas le droit de supprimer cette activité" }] });
        }

        await Activity.findByIdAndDelete(activityId);

        res.status(200).json({
            success: [{ msg: "Activité supprimée avec succès" }]
        });

    } catch (error) {
        console.error("❌ Delete activity error:", error);
        res.status(500).json({ errors: [{ msg: "Erreur lors de la suppression de l'activité" }] });
    }
};

// ✅ LIKE/UNLIKE ACTIVITY - AVEC NOTIFICATIONS
const likeActivity = async (req, res) => {
    try {
        const activityId = req.params.id;

        const activity = await Activity.findById(activityId)
            .populate('user', 'name profile_picture');

        if (!activity) {
            return res.status(404).json({ errors: [{ msg: 'Activité non trouvée' }] });
        }

        const userHasLiked = activity.likes.some(likeId =>
            likeId.toString() === req.user.id.toString()
        );

        if (userHasLiked) {
            // Unlike - pas de notification
            activity.likes = activity.likes.filter(
                likeId => likeId.toString() !== req.user.id.toString()
            );
            activity.engagement_metrics.likes_count = Math.max(0, activity.engagement_metrics.likes_count - 1);
        } else {
            // Like - envoyer notification
            activity.likes.push(req.user.id);
            activity.engagement_metrics.likes_count += 1;

            // ✅ NOTIFICATION POUR LIKE
            try {
                const likerUser = await User.findById(req.user.id);
                await NotificationActivityService.notifyActivityLike(activity, likerUser, activity.user);
                console.log('❤️ Notification like envoyée');
            } catch (notificationError) {
                console.error('⚠️ Erreur notification like:', notificationError);
            }
        }

        await activity.save();
        await activity.populate('likes', 'name profile_picture current_career_plan grade _id');

        const finalUserHasLiked = activity.likes.some(like =>
            like._id.toString() === req.user.id.toString()
        );

        res.status(200).json({
            success: [{ msg: userHasLiked ? "Like retiré" : "Activité likée" }],
            activity: {
                _id: activity._id,
                likes: activity.likes,
                engagement_metrics: activity.engagement_metrics,
                userHasLiked: finalUserHasLiked
            }
        });
    } catch (error) {
        console.error("❌ Like activity error:", error);
        res.status(500).json({ errors: [{ msg: "Erreur lors du like" }] });
    }
};

// ✅ ADD COMMENT - AVEC NOTIFICATIONS
const addComment = async (req, res) => {
    try {
        const { content } = req.body;
        const activityId = req.params.id;

        const activity = await Activity.findById(activityId)
            .populate('user', 'name profile_picture');

        if (!activity) {
            return res.status(404).json({ errors: [{ msg: 'Activité non trouvée' }] });
        }

        const currentUserId = req.user.id.toString();
        const isAdminUser = req.user.role === 'admin';
        
        // ✅ CORRECTION : L'admin peut commenter TOUTES les activités
        const canComment = isAdminUser ||
            activity.visibility === 'عام' ||
            activity.user._id.toString() === currentUserId ||
            activity.identified_users.some(identifiedUser => 
                identifiedUser.user && identifiedUser.user.toString() === currentUserId
            );

        if (!canComment) {
            return res.status(403).json({ errors: [{ msg: "Pas le droit de commenter cette activité" }] });
        }

        activity.comments.push({
            user: req.user.id,
            content
        });

        activity.engagement_metrics.comments_count += 1;
        await activity.save();

        // ✅ NOTIFICATION POUR NOUVEAU COMMENTAIRE
        try {
            const commenter = await User.findById(req.user.id);
            await NotificationActivityService.notifyNewComment(activity, commenter, activity.user, content);
            console.log('💬 Notification commentaire envoyée');
        } catch (notificationError) {
            console.error('⚠️ Erreur notification commentaire:', notificationError);
        }

        await activity.populate('comments.user', 'name profile_picture current_career_plan grade');
        const newComment = activity.comments[activity.comments.length - 1];

        res.status(201).json({
            success: [{ msg: "Commentaire ajouté avec succès" }],
            comment: newComment
        });
    } catch (error) {
        console.error("❌ Add comment error:", error);
        res.status(500).json({ errors: [{ msg: "Erreur lors de l'ajout du commentaire" }] });
    }
};

// ✅ GET USER ACTIVITIES
const getUserActivities = async (req, res) => {
    try {
        const { userId } = req.params;
        const isAdminUser = req.user.role === 'admin';

        let visibilityQuery = {
            user: userId,
            is_published: true
        };

        // ✅ CORRECTION : L'admin peut voir TOUTES les activités d'un utilisateur
        if (!isAdminUser) {
            visibilityQuery.$or = [
                { visibility: 'عام' },
                { user: req.user.id },
                { "identified_users.user": req.user.id }
            ];
        }

        const activities = await Activity.find(visibilityQuery)
            .populate('user', 'name profile_picture current_career_plan grade')
            .populate({
                path: 'identified_users.user',
                select: 'name profile_picture current_career_plan grade email_address'
            })
            .populate('comments.user', 'name profile_picture current_career_plan grade')
            .populate('likes', 'name profile_picture current_career_plan grade _id')
            .populate('comments.likes', 'name profile_picture current_career_plan grade _id')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            activities: activities,
            count: activities.length,
            isAdmin: isAdminUser
        });
    } catch (error) {
        console.error("❌ Get user activities error:", error);
        res.status(500).json({ errors: [{ msg: "Erreur lors de la récupération des activités utilisateur" }] });
    }
};

// ✅ GET USERS FOR MENTION - CORRIGÉ
const getUsersForMention = async (req, res) => {
    try {
        console.log('🟢 getUsersForMention called by user:', req.user.id);

        const users = await User.find(
            { _id: { $ne: req.user.id } },
            'name profile_picture current_career_plan email_address grade'
        )
            .sort({ name: 1 })
            .limit(50);

        console.log(`📊 Found ${users.length} users for mention`);
        
        const formattedUsers = users.map(user => ({
            _id: user._id,
            name: user.name,
            email: user.email_address,
            current: user.current_career_plan,
            profile_picture: user.profile_picture,
            current_career_plan: user.current_career_plan,
            grade: user.grade
        }));

        console.log('👥 Sample user data:', formattedUsers.slice(0, 3));

        res.status(200).json({
            success: true,
            users: formattedUsers,
            count: users.length
        });

    } catch (error) {
        console.error("❌ Get users for mention error:", error);
        res.status(500).json({
            success: false,
            errors: [{ msg: "Erreur lors de la récupération des utilisateurs" }]
        });
    }
};

// ✅ REPLY TO COMMENT - AVEC NOTIFICATIONS
const replyToComment = async (req, res) => {
    try {
        const { activityId, commentId } = req.params;
        const { content } = req.body;

        const activity = await Activity.findById(activityId)
            .populate('user', 'name profile_picture');

        if (!activity) {
            return res.status(404).json({ errors: [{ msg: 'Activité non trouvée' }] });
        }

        const parentComment = activity.comments.id(commentId);
        if (!parentComment) {
            return res.status(404).json({ errors: [{ msg: 'Commentaire non trouvé' }] });
        }

        const currentUserId = req.user.id.toString();
        const isAdminUser = req.user.role === 'admin';
        
        // ✅ CORRECTION : L'admin peut répondre à TOUS les commentaires
        const canComment = isAdminUser ||
            activity.visibility === 'عام' ||
            activity.user._id.toString() === currentUserId ||
            activity.identified_users.some(identifiedUser => 
                identifiedUser.user && identifiedUser.user.toString() === currentUserId
            );

        if (!canComment) {
            return res.status(403).json({ errors: [{ msg: "Pas le droit de répondre à ce commentaire" }] });
        }

        parentComment.replies.push({
            user: req.user.id,
            content
        });

        activity.engagement_metrics.comments_count += 1;
        await activity.save();

        // ✅ NOTIFICATION POUR RÉPONSE
        try {
            const replier = await User.findById(req.user.id);
            const commentOwner = await User.findById(parentComment.user);
            
            if (commentOwner) {
                await NotificationActivityService.notifyCommentReply(
                    activity, 
                    replier, 
                    commentOwner, 
                    content, 
                    parentComment.content
                );
                console.log('↩️ Notification réponse envoyée');
            }
        } catch (notificationError) {
            console.error('⚠️ Erreur notification réponse:', notificationError);
        }

        await activity.populate('comments.replies.user', 'name profile_picture current_career_plan grade');
        const updatedComment = activity.comments.id(commentId);
        const newReply = updatedComment.replies[updatedComment.replies.length - 1];

        res.status(201).json({
            success: [{ msg: "Réponse ajoutée avec succès" }],
            reply: newReply
        });
    } catch (error) {
        console.error("❌ Reply to comment error:", error);
        res.status(500).json({ errors: [{ msg: "Erreur lors de l'ajout de la réponse" }] });
    }
};

// ✅ LIKE COMMENT
const likeComment = async (req, res) => {
    try {
        const { activityId, commentId } = req.params;

        const activity = await Activity.findById(activityId);

        if (!activity) {
            return res.status(404).json({ errors: [{ msg: 'Activité non trouvée' }] });
        }

        const comment = activity.comments.id(commentId);
        if (!comment) {
            return res.status(404).json({ errors: [{ msg: 'Commentaire non trouvé' }] });
        }

        if (!comment.likes) {
            comment.likes = [];
        }

        const userHasLiked = comment.likes.some(likeId =>
            likeId.toString() === req.user.id.toString()
        );

        if (userHasLiked) {
            comment.likes = comment.likes.filter(
                likeId => likeId.toString() !== req.user.id.toString()
            );
        } else {
            comment.likes.push(req.user.id);
        }

        await activity.save();
        await activity.populate('comments.likes', 'name profile_picture current_career_plan grade _id');
        const updatedComment = activity.comments.id(commentId);

        const finalUserHasLiked = updatedComment.likes.some(like =>
            like._id.toString() === req.user.id.toString()
        );

        res.status(200).json({
            success: [{ msg: userHasLiked ? "Like retiré" : "Commentaire liké" }],
            comment: {
                _id: updatedComment._id,
                likes: updatedComment.likes,
                userHasLiked: finalUserHasLiked
            }
        });
    } catch (error) {
        console.error("❌ Like comment error:", error);
        res.status(500).json({ errors: [{ msg: "Erreur lors du like du commentaire" }] });
    }
};

// ✅ LIKE REPLY
const likeReply = async (req, res) => {
    try {
        const { activityId, commentId, replyId } = req.params;

        const activity = await Activity.findById(activityId);

        if (!activity) {
            return res.status(404).json({ errors: [{ msg: 'Activité non trouvée' }] });
        }

        const comment = activity.comments.id(commentId);
        if (!comment) {
            return res.status(404).json({ errors: [{ msg: 'Commentaire non trouvé' }] });
        }

        const reply = comment.replies.id(replyId);
        if (!reply) {
            return res.status(404).json({ errors: [{ msg: 'Réponse non trouvée' }] });
        }

        if (!reply.likes) {
            reply.likes = [];
        }

        const userIndex = reply.likes.findIndex(
            userId => userId.toString() === req.user.id.toString()
        );

        if (userIndex > -1) {
            reply.likes.splice(userIndex, 1);
        } else {
            reply.likes.push(req.user.id);
        }

        await activity.save();

        await activity.populate('comments.replies.likes', 'name profile_picture current_career_plan grade _id');
        const updatedReply = comment.replies.id(replyId);

        res.status(200).json({
            success: [{ msg: "Like sur réponse mis à jour" }],
            reply: {
                _id: updatedReply._id,
                likes: updatedReply.likes
            }
        });
    } catch (error) {
        console.error("❌ Like reply error:", error);
        res.status(500).json({ errors: [{ msg: "Erreur lors du like de la réponse" }] });
    }
};

// ✅ DELETE COMMENT
const deleteComment = async (req, res) => {
    try {
        const { activityId, commentId } = req.params;

        const activity = await Activity.findById(activityId);

        if (!activity) {
            return res.status(404).json({ errors: [{ msg: 'Activité non trouvée' }] });
        }

        const comment = activity.comments.id(commentId);
        if (!comment) {
            return res.status(404).json({ errors: [{ msg: 'Commentaire non trouvé' }] });
        }

        const isOwner = comment.user.toString() === req.user.id.toString();
        const isAdminUser = req.user.role === 'admin';
        const isActivityOwner = activity.user.toString() === req.user.id.toString();

        if (!isOwner && !isAdminUser && !isActivityOwner) {
            return res.status(403).json({ errors: [{ msg: "Pas le droit de supprimer ce commentaire" }] });
        }

        comment.remove();
        activity.engagement_metrics.comments_count = Math.max(0, activity.engagement_metrics.comments_count - 1);

        await activity.save();

        res.status(200).json({
            success: [{ msg: "Commentaire supprimé avec succès" }]
        });
    } catch (error) {
        console.error("❌ Delete comment error:", error);
        res.status(500).json({ errors: [{ msg: "Erreur lors de la suppression du commentaire" }] });
    }
};

// ✅ DELETE REPLY
const deleteReply = async (req, res) => {
    try {
        const { activityId, commentId, replyId } = req.params;

        const activity = await Activity.findById(activityId);

        if (!activity) {
            return res.status(404).json({ errors: [{ msg: 'Activité non trouvée' }] });
        }

        const comment = activity.comments.id(commentId);
        if (!comment) {
            return res.status(404).json({ errors: [{ msg: 'Commentaire non trouvé' }] });
        }

        const reply = comment.replies.id(replyId);
        if (!reply) {
            return res.status(404).json({ errors: [{ msg: 'Réponse non trouvée' }] });
        }

        const isOwner = reply.user.toString() === req.user.id.toString();
        const isAdminUser = req.user.role === 'admin';
        const isActivityOwner = activity.user.toString() === req.user.id.toString();
        const isCommentOwner = comment.user.toString() === req.user.id.toString();

        if (!isOwner && !isAdminUser && !isActivityOwner && !isCommentOwner) {
            return res.status(403).json({ errors: [{ msg: "Pas le droit de supprimer cette réponse" }] });
        }

        reply.remove();
        activity.engagement_metrics.comments_count = Math.max(0, activity.engagement_metrics.comments_count - 1);

        await activity.save();

        res.status(200).json({
            success: [{ msg: "Réponse supprimée avec succès" }]
        });
    } catch (error) {
        console.error("❌ Delete reply error:", error);
        res.status(500).json({ errors: [{ msg: "Erreur lors de la suppression de la réponse" }] });
    }
};

// ✅ GET IDENTIFIED ACTIVITIES
const getIdentifiedActivities = async (req, res) => {
    try {
        const query = {
            "identified_users.user": req.user.id,
            is_published: true
        };

        const activities = await Activity.find(query)
            .populate('user', 'name profile_picture current_career_plan grade')
            .populate({
                path: 'identified_users.user',
                select: 'name profile_picture current_career_plan grade email_address'
            })
            .populate('comments.user', 'name profile_picture current_career_plan grade')
            .populate('likes', 'name profile_picture current_career_plan grade _id')
            .populate('comments.likes', 'name profile_picture current_career_plan grade _id')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            activities: activities,
            count: activities.length
        });
    } catch (error) {
        console.error("❌ Get identified activities error:", error);
        res.status(500).json({ errors: [{ msg: "Erreur lors de la récupération des activités identifiées" }] });
    }
};

// ✅ SEARCH ACTIVITIES - FONCTION COMPLÈTE
const searchActivities = async (req, res) => {
    try {
        const { 
            q, 
            type, 
            startDate, 
            endDate, 
            userId, 
            search, 
            viewMode = 'all',
            activityType,
            page = 1,
            limit = 20
        } = req.query;

        console.log('🔍 SEARCH ACTIVITIES - TOUS LES PARAMÈTRES:', {
            q,
            type,
            activityType,
            startDate,
            endDate,
            userId,
            search,
            viewMode,
            page,
            limit
        });

        let query = { is_published: true };
        const currentUserId = req.user.id;
        const isAdminUser = req.user.role === 'admin';
        const currentPage = parseInt(page);
        const itemsPerPage = parseInt(limit);
        const skip = (currentPage - 1) * itemsPerPage;

        const searchTerm = q || search;
        const activityTypeFilter = type || activityType;

        console.log('👤 Utilisateur courant:', currentUserId);
        console.log('👑 Est admin:', isAdminUser);
        console.log('🔍 Terme de recherche:', searchTerm);

        // ✅ ÉTAPE 1: FILTRES DE BASE - ADMIN VOIT TOUT
        let baseQuery = { is_published: true };

        // Gestion du viewMode
        if (viewMode === 'identified' && currentUserId) {
            baseQuery["identified_users.user"] = currentUserId;
            console.log('🎯 FILTRE - Mode identifié');
        }
        else if (viewMode === 'my' && currentUserId) {
            baseQuery.user = currentUserId;
            console.log('👤 FILTRE - Mes activités');
        }
        else if (viewMode === 'public') {
            baseQuery.visibility = 'عام';
            console.log('🌍 FILTRE - Activités publiques');
        }
        else {
            // Mode 'all' - admin voit TOUT, utilisateur normal voit selon permissions
            if (!isAdminUser) {
                baseQuery.$or = [
                    { visibility: 'عام' },
                    { user: currentUserId },
                    { "identified_users.user": currentUserId }
                ];
                console.log('📁 FILTRE - Mode tout (utilisateur normal)');
            } else {
                console.log('👑 FILTRE - Mode admin: TOUTES les activités');
                // Pas de restriction - admin voit tout
            }
        }

        // ✅ ÉTAPE 2: RECHERCHE TEXTE
        let searchConditions = [];

        if (searchTerm) {
            console.log('🔍 APPLICATION RECHERCHE TEXTE:', searchTerm);
            
            const userSearchRegex = { $regex: searchTerm, $options: 'i' };

            // Recherche des utilisateurs qui correspondent
            const matchingUsers = await User.find({
                $or: [
                    { name: userSearchRegex },
                    { current_career_plan: userSearchRegex },
                    { email_address: userSearchRegex }
                ]
            }).select('_id');

            const matchingUserIds = matchingUsers.map(user => user._id);
            
            console.log('👥 UTILISATEURS TROUVÉS:', matchingUsers.length);

            // Conditions de recherche
            const activitySearchConditions = [
                { activity_subject: { $regex: searchTerm, $options: 'i' } },
                { description: { $regex: searchTerm, $options: 'i' } },
                { general_activity: { $regex: searchTerm, $options: 'i' } },
                { activity_type: { $regex: searchTerm, $options: 'i' } },
                { notes: { $regex: searchTerm, $options: 'i' } }
            ];

            // Recherche par créateur
            if (matchingUserIds.length > 0) {
                activitySearchConditions.push({ user: { $in: matchingUserIds } });
                console.log('✅ Recherche étendue aux créateurs');
            }

            searchConditions = activitySearchConditions;
        }

        // ✅ ÉTAPE 3: FILTRE PAR TYPE D'ACTIVITÉ
        if (activityTypeFilter) {
            baseQuery.general_activity = activityTypeFilter;
            console.log('🎯 FILTRE - Type d\'activité:', activityTypeFilter);
        }

        // ✅ ÉTAPE 4: FILTRE PAR DATE
        if (startDate || endDate) {
            baseQuery.start_date = {};
            if (startDate) {
                baseQuery.start_date.$gte = new Date(startDate);
                console.log('📅 FILTRE - Date de début:', startDate);
            }
            if (endDate) {
                baseQuery.start_date.$lte = new Date(endDate);
                console.log('📅 FILTRE - Date de fin:', endDate);
            }
        }

        // ✅ ÉTAPE 5: FILTRE PAR UTILISATEUR (ADMIN SEULEMENT)
        if (userId && isAdminUser) {
            baseQuery.user = userId;
            console.log('👤 FILTRE - Utilisateur spécifique (admin):', userId);
        }

        // ✅ ÉTAPE 6: COMBINAISON DES FILTRES
        if (searchConditions.length > 0) {
            if (Object.keys(baseQuery).length > 1 || baseQuery.$or) {
                query = {
                    $and: [
                        baseQuery,
                        { $or: searchConditions }
                    ]
                };
            } else {
                query.$or = searchConditions;
            }
        } else {
            query = baseQuery;
        }

        console.log('🔍 REQUÊTE FINALE:', JSON.stringify(query, null, 2));

        // ✅ ÉTAPE 7: EXÉCUTION DE LA REQUÊTE
        const activities = await Activity.find(query)
            .populate('user', 'name profile_picture current_career_plan grade email_address')
            .populate({
                path: 'identified_users.user',
                select: 'name profile_picture current_career_plan grade email_address'
            })
            .populate('comments.user', 'name profile_picture current_career_plan grade')
            .populate('likes', 'name profile_picture current_career_plan grade _id')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(itemsPerPage);

        // ✅ ÉTAPE 8: COMPTAGE TOTAL
        const totalActivities = await Activity.countDocuments(query);
        const totalPages = Math.ceil(totalActivities / itemsPerPage);

        console.log('📥 ACTIVITÉS TROUVÉES:', activities.length);
        console.log('👑 ADMIN MODE:', isAdminUser);

        // ✅ ÉTAPE 9: AJOUT DES STATUTS
        const activitiesWithStatus = activities.map(activity => {
            const activityObj = activity.toObject();
            const currentUserIdStr = currentUserId.toString();

            activityObj.userHasLiked = activity.likes && activity.likes.some(like => {
                if (!like) return false;
                const likeId = like._id ? like._id.toString() : like.toString();
                return likeId === currentUserIdStr;
            });

            activityObj.userIsIdentified = false;
            if (activity.identified_users && activity.identified_users.length > 0) {
                activityObj.userIsIdentified = activity.identified_users.some(identifiedUser => {
                    if (!identifiedUser.user) return false;
                    const identifiedUserId = identifiedUser.user._id ? 
                        identifiedUser.user._id.toString() : 
                        identifiedUser.user.toString();
                    return identifiedUserId === currentUserIdStr;
                });
            }

            return activityObj;
        });

        // ✅ ÉTAPE 10: RÉPONSE FINALE
        res.status(200).json({
            success: true,
            activities: activitiesWithStatus,
            count: activitiesWithStatus.length,
            total: totalActivities,
            pagination: {
                current: currentPage,
                pages: totalPages,
                limit: itemsPerPage,
                total: totalActivities
            },
            filters: {
                query: searchTerm,
                type: activityTypeFilter,
                startDate,
                endDate,
                viewMode,
                isAdmin: isAdminUser
            }
        });

    } catch (error) {
        console.error("❌ ERREUR searchActivities:", error);
        res.status(500).json({ 
            errors: [{ msg: "Erreur lors de la recherche des activités" }] 
        });
    }
};

// ✅ ADD IDENTIFIED USER
const addIdentifiedUser = async (req, res) => {
    try {
        const { activityId } = req.params;
        const { userId } = req.body;

        const activity = await Activity.findById(activityId);
        if (!activity) {
            return res.status(404).json({ errors: [{ msg: 'Activité non trouvée' }] });
        }

        const isOwner = activity.user.toString() === req.user.id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ errors: [{ msg: "Pas le droit de modifier cette activité" }] });
        }

        const userToAdd = await User.findById(userId);
        if (!userToAdd) {
            return res.status(404).json({ errors: [{ msg: 'Utilisateur non trouvé' }] });
        }

        const alreadyIdentified = activity.identified_users.some(identifiedUser => 
            identifiedUser.user.toString() === userId
        );

        if (!alreadyIdentified) {
            activity.identified_users.push({
                user: userToAdd._id,
                name: userToAdd.name,
                email: userToAdd.email_address,
                current: userToAdd.current_career_plan,
                profile_picture: userToAdd.profile_picture || null,
                current_career_plan: userToAdd.current_career_plan,
                grade: userToAdd.grade
            });
            await activity.save();
        }

        res.status(200).json({
            success: [{ msg: "Utilisateur identifié ajouté avec succès" }],
            activity: activity
        });
    } catch (error) {
        console.error("❌ Add identified user error:", error);
        res.status(500).json({ errors: [{ msg: "Erreur lors de l'ajout de l'utilisateur identifié" }] });
    }
};

// ✅ REMOVE IDENTIFIED USER
const removeIdentifiedUser = async (req, res) => {
    try {
        const { activityId, userId } = req.params;

        const activity = await Activity.findById(activityId);
        if (!activity) {
            return res.status(404).json({ errors: [{ msg: 'Activité non trouvée' }] });
        }

        const isOwner = activity.user.toString() === req.user.id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ errors: [{ msg: "Pas le droit de modifier cette activité" }] });
        }

        activity.identified_users = activity.identified_users.filter(identifiedUser =>
            identifiedUser.user.toString() !== userId
        );

        await activity.save();

        res.status(200).json({
            success: [{ msg: "Utilisateur identifié retiré avec succès" }],
            activity: activity
        });
    } catch (error) {
        console.error("❌ Remove identified user error:", error);
        res.status(500).json({ errors: [{ msg: "Erreur lors du retrait de l'utilisateur identifié" }] });
    }
};

// ✅ GET ADMIN STATS
const getAdminStats = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ errors: [{ msg: "Accès réservé aux administrateurs" }] });
        }

        const { startDate, endDate, userId, timeRange = 'all' } = req.query;

        let matchStage = { is_published: true };

        const now = new Date();
        let dateFilter = {};

        switch (timeRange) {
            case 'week':
                dateFilter.$gte = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                dateFilter.$gte = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                break;
            case 'year':
                dateFilter.$gte = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                break;
            default:
                break;
        }

        if (Object.keys(dateFilter).length > 0) {
            matchStage.createdAt = dateFilter;
        }

        if (startDate || endDate) {
            matchStage.start_date = {};
            if (startDate) matchStage.start_date.$gte = new Date(startDate);
            if (endDate) matchStage.start_date.$lte = new Date(endDate);
        }

        if (userId) {
            matchStage.user = userId;
        }

        const stats = await Activity.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalActivities: { $sum: 1 },
                    totalUsers: { $addToSet: "$user" },
                    totalLikes: { $sum: "$engagement_metrics.likes_count" },
                    totalComments: { $sum: "$engagement_metrics.comments_count" },
                    totalDuration: {
                        $sum: {
                            $divide: [
                                { $subtract: ["$end_date", "$start_date"] },
                                1000 * 60 * 60
                            ]
                        }
                    }
                }
            },
            {
                $project: {
                    totalActivities: 1,
                    totalUsers: { $size: "$totalUsers" },
                    totalLikes: 1,
                    totalComments: 1,
                    totalDuration: { $round: ["$totalDuration", 2] }
                }
            }
        ]);

        const activitiesByType = await Activity.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: "$general_activity",
                    count: { $sum: 1 },
                    totalDuration: {
                        $sum: {
                            $divide: [
                                { $subtract: ["$end_date", "$start_date"] },
                                1000 * 60 * 60
                            ]
                        }
                    }
                }
            },
            {
                $project: {
                    type: "$_id",
                    count: 1,
                    totalDuration: { $round: ["$totalDuration", 2] }
                }
            },
            { $sort: { count: -1 } }
        ]);

        const userStats = await Activity.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: "$user",
                    activityCount: { $sum: 1 },
                    totalLikes: { $sum: "$engagement_metrics.likes_count" },
                    totalComments: { $sum: "$engagement_metrics.comments_count" },
                    totalDuration: {
                        $sum: {
                            $divide: [
                                { $subtract: ["$end_date", "$start_date"] },
                                1000 * 60 * 60
                            ]
                        }
                    }
                }
            },
            { $sort: { activityCount: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "userInfo"
                }
            },
            {
                $project: {
                    user: { $arrayElemAt: ["$userInfo", 0] },
                    activityCount: 1,
                    totalLikes: 1,
                    totalComments: 1,
                    totalDuration: { $round: ["$totalDuration", 2] }
                }
            }
        ]);

        const result = {
            generalStats: stats[0] || {
                totalActivities: 0,
                totalUsers: 0,
                totalLikes: 0,
                totalComments: 0,
                totalDuration: 0
            },
            activitiesByType: activitiesByType,
            topUsers: userStats,
            timeRange: timeRange
        };

        res.status(200).json({
            success: true,
            stats: result
        });
    } catch (error) {
        console.error("❌ Get admin stats error:", error);
        res.status(500).json({ errors: [{ msg: "Erreur lors de la récupération des statistiques" }] });
    }
};

// ✅ EXPORTS COMPLETS
module.exports = {
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
    markAllActivitiesAsViewed // ✅ AJOUT IMPORTANT
};