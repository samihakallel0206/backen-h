//controllers/job.controller.js

const Job = require("../models/Job");
exports.createJob = async (req, res) => {
    try {
        // Extraction des données du corps de la requête
        const { job_code, job_title } = req.body;

        // Vérifier si le job existe déjà
        const foundJob = await Job.findOne({
            $or: [
                { job_code: job_code },
                { job_title: job_title }
            ]
        });

        if (foundJob) {
            return res.status(400).json({ errors: [{ msg: "Job code or title already exists" }] });
        }

        // Création d'un nouveau job
        const newJob = new Job({
            job_code, 
            job_title,
        });

        await newJob.save();

        res.status(201).json({ 
            success: [{ msg: "Job created successfully" }], 
            job: newJob 
        });
        
    } catch (error) {
        //console.error("Create job error:", error);
        res.status(400).json({ 
            errors: [{ msg: "Can't create job" }], 
            error: error.message 
        });
    }
};

// Pour récupérer tous les jobs
exports.getAllJobs = async (req, res) => {
    try {
        const jobs = await Job.find().sort({ createdAt: -1 });
        res.status(200).json({ 
            success: true,
            jobs: jobs,
            count: jobs.length 
        });
    } catch (error) {
        console.error("Get jobs error:", error);
        res.status(500).json({ 
            errors: [{ msg: "Error fetching jobs" }] 
        });
    }
};

// Pour récupérer un job par son ID
exports.getJobById = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) {
            return res.status(404).json({ errors: [{ msg: "Job not found" }] });
        }
        res.status(200).json({ job });
    } catch (error) {
        console.error("Get job error:", error);
        res.status(500).json({ errors: [{ msg: "Error fetching job" }] });
    }
};

exports.updateJob = async (req, res) => {
    try {
        const { job_code, job_title } = req.body;
        const jobId = req.params.id;

        // Vérifier si le job existe
        const existingJob = await Job.findById(jobId);
        if (!existingJob) {
            return res.status(404).json({ errors: [{ msg: "Job not found" }] });
        }

        // Vérifier si les nouvelles valeurs existent déjà (pour un autre job)
        const duplicateJob = await Job.findOne({
            _id: { $ne: jobId }, // Exclure le job actuel de la recherche
            $or: [
                { job_code: job_code },
                { job_title: job_title }
            ]
        });

        if (duplicateJob) {
            return res.status(400).json({ errors: [{ msg: "Job code or title already exists for another job" }] });
        }

        // Sauvegarder l'ancien job_code pour la mise à jour des utilisateurs
        const oldJobCode = existingJob.job_code;
        const newJobCode = job_code;

        // Mettre à jour le job
        const updatedJob = await Job.findByIdAndUpdate(
            jobId,
            {
                job_code,
                job_title,
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        );

        // 🔄 METTRE À JOUR AUTOMATIQUEMENT LES UTILISATEURS
        if (oldJobCode !== newJobCode || existingJob.job_title !== job_title) {
            const User = require("../models/User");
            
            // Mettre à jour le career_plan des utilisateurs concernés
            await User.updateMany(
                { id_number: oldJobCode }, // Chercher les users avec l'ancien job_code
                { 
                    $set: { 
                        current_career_plan: job_title,
                        // Si le job_code change aussi, mettre à jour id_number
                        ...(oldJobCode !== newJobCode && { id_number: newJobCode })
                    } 
                }
            );

            console.log(`Users updated with new career plan: ${job_title}`);
        }

        res.status(200).json({ 
            success: [{ msg: "Job updated successfully - Users updated automatically" }], 
            job: updatedJob 
        });

    } catch (error) {
        console.error("Update job error:", error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                errors: [{ msg: "Validation error", details: error.errors }] 
            });
        }
        
        res.status(500).json({ 
            errors: [{ msg: "Error updating job" }], 
            error: error.message 
        });
    }
};

// Pour supprimer un job
exports.deleteJob = async (req, res) => {
    try {
        const jobId = req.params.id;

        // Vérifier si le job existe
        const existingJob = await Job.findById(jobId);
        if (!existingJob) {
            return res.status(404).json({ errors: [{ msg: "Job not found" }] });
        }

        // Vérifier si le job est utilisé par des utilisateurs (optionnel mais recommandé)
        const User = require("../models/User");
        const usersWithThisJob = await User.findOne({ id_number: existingJob.job_code });
        
        if (usersWithThisJob) {
            return res.status(400).json({ 
                errors: [{ msg: "Cannot delete job: it is currently assigned to one or more users" }] 
            });
        }

        // Supprimer le job
        await Job.findByIdAndDelete(jobId);

        res.status(200).json({ 
            success: [{ msg: "Job deleted successfully" }] 
        });

    } catch (error) {
        console.error("Delete job error:", error);
        res.status(500).json({ 
            errors: [{ msg: "Error deleting job" }], 
            error: error.message 
        });
    }
};

