const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    role: {
        type: String,
        enum: ['user', 'staff', 'manager', 'admin', 'ceo'],
        default: 'user'
    },
    dateOfBirth: {
        type: Date
    },
    address: {
        street: String,
        city: String,
        state: String,
        country: String,
        zipCode: String
    },

    // Staff-specific fields
    department: {
        type: String,
        enum: ['housekeeping', 'food_service', 'concierge', 'maintenance', 'management', 'administration'],
        required: function () {
            return ['staff', 'manager', 'admin'].includes(this.role);
        }
    },
    employeeId: {
        type: String,
        unique: true,
        sparse: true // Only required for staff
    },
    startDate: {
        type: Date,
        default: Date.now
    },

    // User preferences and status
    isActive: {
        type: Boolean,
        default: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    isPhoneVerified: {
        type: Boolean,
        default: false
    },

    // Login tracking
    lastLogin: {
        type: Date
    },
    loginCount: {
        type: Number,
        default: 0
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    isLocked: {
        type: Boolean,
        default: false
    },
    lockUntil: {
        type: Date
    },

    // Loyalty and preferences
    loyaltyPoints: {
        type: Number,
        default: 0
    },
    preferences: {
        notifications: {
            email: { type: Boolean, default: true },
            sms: { type: Boolean, default: false },
            push: { type: Boolean, default: true }
        },
        language: {
            type: String,
            default: 'en'
        },
        currency: {
            type: String,
            default: 'USD'
        }
    },

    // Security
    passwordResetToken: String,
    passwordResetExpires: Date,
    emailVerificationToken: String,
    emailVerificationExpires: Date,

    // Profile image
    profileImage: {
        type: String
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Additional indexes (unique indexes are already defined in schema)
userSchema.index({ role: 1 });
userSchema.index({ department: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) return next();

    try {
        // Hash password with cost of 12
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Pre-save middleware to generate employee ID for staff
userSchema.pre('save', function (next) {
    if (this.isNew && ['staff', 'manager', 'admin'].includes(this.role) && !this.employeeId) {
        // Generate employee ID: DEPT-YYYY-NNNN
        const dept = this.department ? this.department.substring(0, 3).toUpperCase() : 'GEN';
        const year = new Date().getFullYear();
        const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
        this.employeeId = `${dept}-${year}-${random}`;
    }
    next();
});

// Instance method to check password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to update login info
userSchema.methods.updateLoginInfo = function () {
    this.lastLogin = new Date();
    this.loginCount += 1;
    return this.save();
};

// Static method to find by email or phone
userSchema.statics.findByEmailOrPhone = function (emailOrPhone) {
    return this.findOne({
        $or: [
            { email: emailOrPhone.toLowerCase() },
            { phone: emailOrPhone }
        ]
    });
};

// Static method to find active users by role
userSchema.statics.findActiveByRole = function (role) {
    return this.find({ role, isActive: true });
};

// Static method to find staff by department
userSchema.statics.findStaffByDepartment = function (department) {
    return this.find({
        department,
        role: { $in: ['staff', 'manager'] },
        isActive: true
    });
};

// Instance method to handle login attempts
userSchema.methods.incLoginAttempts = function () {
    // If previous lock has expired, restart at 1
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $unset: { lockUntil: 1 },
            $set: {
                loginAttempts: 1,
                isLocked: false
            }
        });
    }

    const updates = { $inc: { loginAttempts: 1 } };

    // If we have hit max attempts and aren't locked yet, lock the account
    if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
        updates.$set = {
            isLocked: true,
            lockUntil: Date.now() + 2 * 60 * 60 * 1000 // Lock for 2 hours
        };
    }

    return this.updateOne(updates);
};

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = function () {
    return this.updateOne({
        $unset: {
            loginAttempts: 1,
            lockUntil: 1
        },
        $set: {
            isLocked: false
        }
    });
};

// Instance method to add loyalty points
userSchema.methods.addLoyaltyPoints = function (points) {
    this.loyaltyPoints += points;
    return this.save();
};

// Instance method to check if user can access resource
userSchema.methods.canAccess = function (requiredRole, requiredDepartment = null) {
    const roleHierarchy = {
        'user': 1,
        'staff': 2,
        'manager': 3,
        'admin': 4,
        'ceo': 5
    };

    const userLevel = roleHierarchy[this.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    // Check role hierarchy
    if (userLevel < requiredLevel) {
        return false;
    }

    // Check department if specified
    if (requiredDepartment && this.department !== requiredDepartment && this.role !== 'admin' && this.role !== 'ceo') {
        return false;
    }

    return this.isActive;
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
    const user = this.toObject();
    delete user.password;
    delete user.passwordResetToken;
    delete user.passwordResetExpires;
    delete user.emailVerificationToken;
    delete user.emailVerificationExpires;
    return user;
};

module.exports = mongoose.model('User', userSchema);
