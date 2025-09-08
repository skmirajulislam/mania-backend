const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    salary: {
        base: { type: Number, required: true, min: 0 },
        bonus: { type: Number, default: 0, min: 0 },
        currency: { type: String, default: 'USD' }
    },
    position: {
        type: String,
        required: true,
        trim: true
    },
    workSchedule: {
        type: {
            type: String,
            enum: ['full-time', 'part-time', 'contract', 'temporary'],
            default: 'full-time'
        },
        hoursPerWeek: { type: Number, min: 0, max: 168 },
        shift: {
            type: String,
            enum: ['morning', 'afternoon', 'evening', 'night', 'rotating'],
            default: 'morning'
        }
    },
    skills: [{
        name: { type: String, required: true },
        level: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'expert'] },
        certified: { type: Boolean, default: false }
    }],
    performance: {
        rating: { type: Number, min: 1, max: 5 },
        lastReviewDate: { type: Date },
        nextReviewDate: { type: Date },
        goals: [{
            description: String,
            targetDate: Date,
            completed: { type: Boolean, default: false }
        }]
    },
    emergencyContact: {
        name: { type: String, required: true },
        relationship: { type: String, required: true },
        phone: { type: String, required: true },
        email: { type: String }
    },
    documents: [{
        type: { type: String, required: true }, // e.g., 'contract', 'certificate', 'id'
        url: { type: String, required: true },
        cloudinaryId: { type: String, required: true },
        uploadDate: { type: Date, default: Date.now },
        expiryDate: { type: Date }
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    terminationDate: {
        type: Date
    },
    terminationReason: {
        type: String
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for total salary
EmployeeSchema.virtual('totalSalary').get(function () {
    return this.salary.base + this.salary.bonus;
});

// Virtual for employment duration
EmployeeSchema.virtual('employmentDuration').get(function () {
    const start = this.createdAt;
    const end = this.terminationDate || new Date();
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
});

// Indexes (user already has unique index)
EmployeeSchema.index({ isActive: 1 });
EmployeeSchema.index({ 'salary.base': 1 });

module.exports = mongoose.model('Employee', EmployeeSchema);
