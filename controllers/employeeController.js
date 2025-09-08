const Employee = require('../models/Employee');
const User = require('../models/User');

// Get all employees with user details
const getAllEmployees = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', department = '', role = '', isActive } = req.query;

        const userFilter = {
            role: { $in: ['staff', 'manager', 'admin', 'ceo'] }
        };

        if (search) {
            userFilter.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { employeeId: { $regex: search, $options: 'i' } }
            ];
        }

        if (department) {
            userFilter.department = department;
        }

        if (role) {
            userFilter.role = role;
        }

        if (isActive !== undefined) {
            userFilter.isActive = isActive === 'true';
        }

        const employees = await Employee.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'userDetails'
                }
            },
            { $unwind: '$userDetails' },
            { $match: { 'userDetails': userFilter } },
            {
                $project: {
                    _id: 1,
                    salary: 1,
                    position: 1,
                    workSchedule: 1,
                    skills: 1,
                    performance: 1,
                    isActive: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    'userDetails._id': 1,
                    'userDetails.firstName': 1,
                    'userDetails.lastName': 1,
                    'userDetails.email': 1,
                    'userDetails.phone': 1,
                    'userDetails.role': 1,
                    'userDetails.department': 1,
                    'userDetails.employeeId': 1,
                    'userDetails.isActive': 1,
                    'userDetails.startDate': 1,
                    'userDetails.profileImage': 1
                }
            },
            { $sort: { 'userDetails.role': 1, 'userDetails.firstName': 1 } },
            { $skip: (page - 1) * parseInt(limit) },
            { $limit: parseInt(limit) }
        ]);

        const total = await Employee.countDocuments({
            user: {
                $in: await User.find(userFilter).distinct('_id')
            }
        });

        res.json({
            success: true,
            data: employees,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / limit),
                total
            }
        });
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching employees',
            error: error.message
        });
    }
};

// Get single employee
const getEmployee = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id)
            .populate('user', '-password -passwordResetToken -passwordResetExpires -emailVerificationToken -emailVerificationExpires');

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        res.json({
            success: true,
            data: employee
        });
    } catch (error) {
        console.error('Error fetching employee:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching employee',
            error: error.message
        });
    }
};

// Create new employee
const createEmployee = async (req, res) => {
    try {
        const { userId, salary, position, workSchedule, skills, emergencyContact } = req.body;

        if (!userId || !salary || !position) {
            return res.status(400).json({
                success: false,
                message: 'User ID, salary, and position are required'
            });
        }

        // Check if user exists and is staff/manager/admin
        const user = await User.findById(userId);
        if (!user || !['staff', 'manager', 'admin', 'ceo'].includes(user.role)) {
            return res.status(400).json({
                success: false,
                message: 'User not found or not eligible for employee record'
            });
        }

        // Check if employee record already exists
        const existingEmployee = await Employee.findOne({ user: userId });
        if (existingEmployee) {
            return res.status(400).json({
                success: false,
                message: 'Employee record already exists for this user'
            });
        }

        const employee = new Employee({
            user: userId,
            salary,
            position,
            workSchedule,
            skills,
            emergencyContact
        });

        await employee.save();
        await employee.populate('user', '-password');

        res.status(201).json({
            success: true,
            message: 'Employee created successfully',
            data: employee
        });
    } catch (error) {
        console.error('Error creating employee:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating employee',
            error: error.message
        });
    }
};

// Update employee
const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Don't allow updating user reference
        delete updateData.user;

        const employee = await Employee.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate('user', '-password');

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        res.json({
            success: true,
            message: 'Employee updated successfully',
            data: employee
        });
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating employee',
            error: error.message
        });
    }
};

// Delete employee (deactivate)
const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const { terminationReason } = req.body;

        const employee = await Employee.findByIdAndUpdate(
            id,
            {
                isActive: false,
                terminationDate: new Date(),
                terminationReason: terminationReason || 'Not specified'
            },
            { new: true }
        );

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        // Also deactivate the user
        await User.findByIdAndUpdate(employee.user, { isActive: false });

        res.json({
            success: true,
            message: 'Employee deactivated successfully'
        });
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting employee',
            error: error.message
        });
    }
};

// Get salary information (restricted access)
const getSalaryInfo = async (req, res) => {
    try {
        const { id } = req.params;
        const requestingUser = req.user;

        // Check permissions
        if (requestingUser.role === 'staff' && requestingUser._id.toString() !== id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only view your own salary information.'
            });
        }

        if (requestingUser.role === 'manager') {
            // Managers can only see staff in their department
            const employee = await Employee.findById(id).populate('user');
            if (!employee || (employee.user.department !== requestingUser.department && employee.user.role !== 'staff')) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You can only view salary information for staff in your department.'
                });
            }
        }

        const employee = await Employee.findById(id)
            .populate('user', 'firstName lastName employeeId role department')
            .select('salary position workSchedule performance');

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        res.json({
            success: true,
            data: employee
        });
    } catch (error) {
        console.error('Error fetching salary info:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching salary information',
            error: error.message
        });
    }
};

module.exports = {
    getAllEmployees,
    getEmployee,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    getSalaryInfo
};
