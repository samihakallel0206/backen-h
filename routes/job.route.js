//routes/job.route.js

const express = require('express');
const { 
    createJob, 
    getAllJobs, 
    getJobById, 
    updateJob, 
    deleteJob,
    //deleteAllJobs 
} = require('../controllers/job.controller');
const isAdmin = require('../middleware/isAdmin');

const router = express.Router();

router.post('/create', createJob);
router.get('/all', isAdmin, getAllJobs);
router.get('/all/:id', isAdmin, getJobById);
router.put('/update/:id', isAdmin, updateJob);
router.delete('/delete/:id', isAdmin, deleteJob);
//router.delete('/jobs', deleteAllJobs); // Optionnel - pour les tests

module.exports = router;