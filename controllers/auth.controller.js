//controllers/auth.controller.js
const User = require("../models/User");
const Job = require("../models/Job");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.register = async(req,res) => {
    try {
        // Extraction des données du corps de la requête
        const {
            email_address, 
            password,
            profile_picture,
            name,
            gender,
            phone_numbers,
            id_card_number,
            id_card_issue_date,
            passport_number,
            passport_date,
            id_number, // Maintenant un Number (correspond à job_code)
            cooperative_number,
            unique_id,
            // current_career_plan sera auto-complété
            current_plan_start_date,
            current_plan_seniority,
            career_plan_obtainment_date,
            career_plan_seniority,
            grade,
            grade_obtainment_date,
            rank_seniority,
            appointment_date,
            professional_seniority,
            retirement_date,
            date_of_birth,
            age,
            place_of_birth_by_state,
            place_of_birth_by_delegation,
            health_status,
            place_of_origin_by_state,
            place_of_origin_by_delegation,
            family_address,
            family_status,
            spouse_employment_status, 
            spouse_occupation_and_workplace,
            spouse_birth_place,
            spouse_place_of_origin_by_state,
            spouse_place_of_origin_by_delegation,
            spouse_health_status,
            children_count,
            children,
            assigned_career_plans,
            general_notes,
        } = req.body;

        // Vérifier si l'utilisateur existe déjà dans la BD
        const foundUser = await User.findOne({
            $or: [
                { email_address: email_address },
                { id_number: id_number }
            ]
        });

        if (foundUser) {
            return res.status(400).json({errors: [{msg: "Email or ID number already exists"}]});
        }

        // 1. Chercher le job correspondant au id_number
        const job = await Job.findOne({ job_code: id_number });
        
        if (!job) {
            return res.status(400).json({errors: [{msg: "Numéro d'identification non trouvé"}]});
        }

        // Hachage du mot de passe avec bcrypt pour la sécurité
        const saltRound = 10;
        const hashPassword = await bcrypt.hash(password, saltRound);

        // Création d'un nouvel utilisateur avec le mot de passe haché
        const newUser = new User ({
            email_address, 
            password: hashPassword,
            profile_picture,
            name,
            gender,
            phone_numbers,
            id_card_number,
            id_card_issue_date,
            passport_number,
            passport_date,
            id_number: id_number, 
            cooperative_number,
            unique_id,
            current_career_plan: job.job_title, // Auto-complétion depuis Job
            current_plan_start_date,
            current_plan_seniority,
            career_plan_obtainment_date,
            career_plan_seniority,
            grade,
            grade_obtainment_date,
            rank_seniority,
            appointment_date,
            professional_seniority,
            retirement_date,
            date_of_birth,
            age,
            place_of_birth_by_state,
            place_of_birth_by_delegation,
            health_status,
            place_of_origin_by_state,
            place_of_origin_by_delegation,
            family_address,
            family_status,
            spouse_employment_status, 
            spouse_occupation_and_workplace,
            spouse_birth_place,
            spouse_place_of_origin_by_state,
            spouse_place_of_origin_by_delegation,
            spouse_health_status,
            children_count,
            children,
            assigned_career_plans,
            general_notes,
        });

        await newUser.save();

        // Préparer l'utilisateur pour la réponse (sans le mot de passe)
        const userResponse = {
            _id: newUser._id,
            email_address: newUser.email_address,
            name: newUser.name,
            profile_picture: newUser.profile_picture,
            id_number: newUser.id_number,
            current_career_plan: newUser.current_career_plan,
            grade: newUser.grade,
            gender: newUser.gender,
            isOnline: newUser.isOnline,
            role: newUser.role,
            createdAt: newUser.createdAt
        };

        const token = jwt.sign({
            id: newUser._id
        },
        process.env.SECRET_KEY,
        {expiresIn: "4h"}
        );
     
        res.status(201).json({
            success: [{msg: "Registered Successfully"}], 
            user: userResponse, 
            token
        });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(400).json({errors: [{msg: "Can't register user"}], error: error.message});
    }
};

// Récupérer tous les utilisateurs
exports.getAllUsers = async(req,res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        
        res.status(200).json({
            success: true,
            users: users,
            count: users.length
        });
    } catch (error) {
        console.error("Get all users error:", error);
        res.status(500).json({errors: [{msg: "Error fetching users"}]});
    }
};

// Récupérer un utilisateur par ID
exports.getUserById = async(req,res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        
        if (!user) {
            return res.status(404).json({errors: [{msg: "User not found"}]});
        }

        res.status(200).json({
            success: true,
            user: user
        });
    } catch (error) {
        console.error("Get user by ID error:", error);
        res.status(500).json({errors: [{msg: "Error fetching user"}]});
    }
};

exports.updateUser = async(req,res) => {
    try {
        const {id} = req.params;
        
        // Vérifier si l'utilisateur existe
        const userToUpdate = await User.findById(id);
        if (!userToUpdate) {
            return res.status(404).json({errors: [{msg: "User non trouvé"}]});
        }

        // Vérifier les permissions : soit admin, soit le propriétaire du compte
        const isOwner = userToUpdate._id.toString() === req.user._id.toString();
        const isAdminUser = req.user.role === 'admin';
        
        if (!isOwner && !isAdminUser) {
            return res.status(403).json({errors: [{msg: "Pas le droit de modifier"}]});
        }

        // Mettre à jour l'utilisateur
        const updatedUser = await User.findByIdAndUpdate(
            id, 
            req.body, 
            { new: true, runValidators: true }
        ).select('-password'); // Exclure le mot de passe de la réponse

        res.status(200).json({
            success: [{msg: "Utilisateur mis à jour avec succès"}],
            user: updatedUser
        });

    } catch (error) {
        console.error("Update user error:", error);
        res.status(400).json({errors: [{msg: "Echec impossible de mettre à jour cet utilisateur"}], error: error.message});
    }
}

// Mettre à jour le mot de passe
exports.updatePassword = async(req,res) => {
    try {
        const userId = req.params.id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({errors: [{msg: "Current password and new password are required"}]});
        }

        if (newPassword.length < 6) {
            return res.status(400).json({errors: [{msg: "New password must be at least 6 characters long"}]});
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({errors: [{msg: "User not found"}]});
        }

        // Vérifier le mot de passe actuel
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({errors: [{msg: "Current password is incorrect"}]});
        }

        // Hacher le nouveau mot de passe
        const saltRound = 10;
        const hashPassword = await bcrypt.hash(newPassword, saltRound);

        // Mettre à jour le mot de passe
        user.password = hashPassword;
        await user.save();

        res.status(200).json({
            success: [{msg: "Password updated successfully"}]
        });

    } catch (error) {
        console.error("Update password error:", error);
        res.status(500).json({errors: [{msg: "Error updating password"}]});
    }
};

// Supprimer un utilisateur
exports.deleteUser = async(req,res) => {
    try {
        const userId = req.params.id;

        // Vérifier si l'utilisateur existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({errors: [{msg: "User not found"}]});
        }

        // Empêcher la suppression de l'utilisateur admin principal (optionnel)
        if (user.role === 'admin') {
            const adminCount = await User.countDocuments({ role: 'admin' });
            if (adminCount <= 1) {
                return res.status(400).json({errors: [{msg: "Cannot delete the last admin user"}]});
            }
        }

        await User.findByIdAndDelete(userId);

        res.status(200).json({
            success: [{msg: "User deleted successfully"}]
        });

    } catch (error) {
        console.error("Delete user error:", error);
        res.status(500).json({errors: [{msg: "Error deleting user"}]});
    }
};

// Nouvelle fonction pour l'auto-complétion
exports.getCareerByCode = async(req,res) => {
    try {
        const { code } = req.params;
        
        const job = await Job.findOne({ job_code: parseInt(code) });
        
        if (!job) {
            return res.status(404).json({errors: [{msg: "Code non trouvé"}]});
        }

        res.status(200).json({ 
            career_plan: job.job_title,
            job_code: job.job_code 
        });
    } catch (error) {
        console.error("Get career error:", error);
        res.status(400).json({errors: [{msg: "Erreur de recherche"}], error: error.message});
    }
};

exports.login = async(req,res) => {
    try {
        const { email_address, password } = req.body;

        // Vérifier si l'utilisateur existe
        const user = await User.findOne({ email_address });

        if (!user) {
            return res.status(400).json({errors: [{msg: "Invalid email or password"}]});
        }

        // Vérifier le mot de passe
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({errors: [{msg: "Invalid email or password"}]});
        }

        // Mettre à jour le statut en ligne
        user.isOnline = true;
        user.lastSeen = new Date();
        await user.save();

        // Préparer l'utilisateur pour la réponse
        const userResponse = {
            _id: user._id,
            email_address: user.email_address,
            name: user.name,
            profile_picture: user.profile_picture,
            id_number: user.id_number,
            current_career_plan: user.current_career_plan,
            grade: user.grade,
            gender: user.gender,
            isOnline: user.isOnline,
            role: user.role,
            lastSeen: user.lastSeen
        };

        // Générer le token JWT
        const token = jwt.sign(
            { id: user._id },
            process.env.SECRET_KEY,
            { expiresIn: "4h" }
        );

        res.status(200).json({
            success: [{msg: "Login successful"}],
            user: userResponse,
            token
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({errors: [{msg: "Server error during login"}]});
    }
};

// Déconnexion utilisateur
exports.logout = async(req,res) => {
    try {
        const userId = req.user.id; // Supposant que vous avez un middleware d'authentification
        
        await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen: new Date()
        });

        res.status(200).json({success: [{msg: "Logout successful"}]});
    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({errors: [{msg: "Server error during logout"}]});
    }
};


// AJOUTER cette fonction dans auth.controller.js
// Dans auth.controller.js - AJOUTER
// AJOUTER dans auth.controller.js
// AJOUTER dans auth.controller.js
exports.getUsersForChat = async (req, res) => {
    try {
        console.log('🟢 getUsersForChat called by user:', req.user.id);
        
        const users = await User.find(
            { _id: { $ne: req.user.id } },
            'name email_address profile_picture isOnline lastSeen role current_career_plan grade id_number'
        )
        .sort({ isOnline: -1, name: 1 })
        .limit(100);

        console.log(`📊 Found ${users.length} users for chat`);

        res.status(200).json({
            success: true,
            users: users,
            count: users.length
        });

    } catch (error) {
        console.error("❌ Get users for chat error:", error);
        res.status(500).json({
            success: false,
            errors: [{msg: "Erreur lors de la récupération des utilisateurs"}],
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


//nvvvvvvvvvvvv ajout upload
// Dans auth.controller.js - AJOUTEZ CETTE FONCTION
exports.current = async (req, res) => {
    try {
        console.log('🟢 current user called for:', req.user.id);
        
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({
                errors: [{msg: "Utilisateur non trouvé"}]
            });
        }

        res.status(200).json(user);
        
    } catch (error) {
        console.error("Current user error:", error);
        res.status(500).json({
            errors: [{msg: "Erreur serveur"}]
        });
    }
};

/********************************************************************** */
