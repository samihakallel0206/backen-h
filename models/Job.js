//models/Job.js
const mongoose = require("mongoose")

const jobSchema = new mongoose.Schema({
    job_code: {
        type: Number,
        required: true,
        unique: true,
    },
    job_title: {
        type: String,
        required: true,
        unique: true,
    }
}, {
    timestamps: true
});

const Job = mongoose.model("Job", jobSchema); // "Job" avec majuscule
module.exports = Job;