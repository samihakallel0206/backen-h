//controllers/admin.controller.js
const Job = require("../models/Job");
const User = require("../models/User")

//la recherche de tous les utilisateurs
exports.getAllUsers = async (req,res) => {
    try {
        const listUsers = await User.find();
        res.status(200).json({msg: "La liste des utilisateurs est:", listUsers});
    } catch (error) {
        res.status(400).json({msg:"Impossible de trouver les utilisateurs", error});
    }
};


//la suppression de user
exports.deleteUser = async(req, res) => {
    try {
        const {id} = req.params;
        const userToDel = await User.findByIdAndDelete(id);
        if (!userToDel) {
            return res.status(400).json({msg:'User Not Found'})
        }
        res.status(200).json({msg: "Suppression de l'utilisateur faite avec succés", userToDel})
    } catch (error) {
        res.status(400).json({msg:"Impossible de supprimer les utilisateur", error});
    }
}



//la modification d'un utilisateur
exports.updateUser = async (req,res) => {
    try {
        const {id} = req.params;
        const userToUpdate = await User.findByIdAndUpdate(
            id, 
            {...req.body}, 
            {new: true} // Retourne le document modifié
        );
        if (!userToUpdate) {
            return res.status(400).json({msg:'User Not Found'})
        }
        res.status(200).json({msg: "Modification de l'utilisateur faite avec succés", userToUpdate})
    } catch (error) {
        res.status(400).json({msg:"Impossible de modifier l'utilisateur", error});
    }
}




//la recherche de tous les Job
exports.getAllJob = async (req,res) => {
    try {
        const listJobs = await Job.find();
        res.status(200).json({msg: "La liste des Jobs est:", listJobs});
    } catch (error) {
        res.status(400).json({msg:"Impossible de trouver les Jobs", error});
    }
};


//la suppression de user
exports.deleteJob = async(req, res) => {
    try {
        const {id} = req.params;
        const jobToDel = await Job.findByIdAndDelete(id);
        if (!jobToDel) {
            return res.status(400).json({msg:'Job Not Found'})
        }
        res.status(200).json({msg: "Suppression Job faite avec succés", jobToDel})
    } catch (error) {
        res.status(400).json({msg:"Impossible de supprimer les Jobs", error});
    }
}