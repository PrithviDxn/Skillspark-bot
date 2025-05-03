import Role from '../models/Role.js';
import ErrorResponse from '../utils/errorResponse.js';
import asyncHandler from '../middleware/async.js';

// @desc    Get all roles
// @route   GET /api/v1/roles
// @access  Private
export const getRoles = asyncHandler(async (req, res, next) => {
  const roles = await Role.find().populate('techStacks');
  
  res.status(200).json({
    success: true,
    count: roles.length,
    data: roles
  });
});

// @desc    Get single role
// @route   GET /api/v1/roles/:id
// @access  Private
export const getRole = asyncHandler(async (req, res, next) => {
  const role = await Role.findById(req.params.id).populate('techStacks');

  if (!role) {
    return next(new ErrorResponse(`Role not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: role
  });
});

// @desc    Create new role
// @route   POST /api/v1/roles
// @access  Private
export const createRole = asyncHandler(async (req, res, next) => {
  const role = await Role.create(req.body);

  res.status(201).json({
    success: true,
    data: role
  });
});

// @desc    Update role
// @route   PUT /api/v1/roles/:id
// @access  Private
export const updateRole = asyncHandler(async (req, res, next) => {
  let role = await Role.findById(req.params.id);

  if (!role) {
    return next(new ErrorResponse(`Role not found with id of ${req.params.id}`, 404));
  }

  role = await Role.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).populate('techStacks');

  res.status(200).json({
    success: true,
    data: role
  });
});

// @desc    Delete role
// @route   DELETE /api/v1/roles/:id
// @access  Private
export const deleteRole = asyncHandler(async (req, res, next) => {
  const role = await Role.findById(req.params.id);

  if (!role) {
    return next(new ErrorResponse(`Role not found with id of ${req.params.id}`, 404));
  }

  await role.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Add tech stacks to role
// @route   PUT /api/v1/roles/:id/techstacks
// @access  Private
export const addTechStacksToRole = asyncHandler(async (req, res, next) => {
  const { techStackIds } = req.body;
  
  if (!techStackIds || !Array.isArray(techStackIds)) {
    return next(new ErrorResponse('Please provide an array of tech stack IDs', 400));
  }
  
  let role = await Role.findById(req.params.id);
  
  if (!role) {
    return next(new ErrorResponse(`Role not found with id of ${req.params.id}`, 404));
  }
  
  // Add tech stacks to role
  role = await Role.findByIdAndUpdate(
    req.params.id,
    { $addToSet: { techStacks: { $each: techStackIds } } },
    { new: true, runValidators: true }
  ).populate('techStacks');
  
  res.status(200).json({
    success: true,
    data: role
  });
});

// @desc    Remove tech stack from role
// @route   DELETE /api/v1/roles/:id/techstacks/:techStackId
// @access  Private
export const removeTechStackFromRole = asyncHandler(async (req, res, next) => {
  const role = await Role.findById(req.params.id);
  
  if (!role) {
    return next(new ErrorResponse(`Role not found with id of ${req.params.id}`, 404));
  }
  
  // Remove tech stack from role
  await Role.findByIdAndUpdate(
    req.params.id,
    { $pull: { techStacks: req.params.techStackId } },
    { new: true }
  );
  
  const updatedRole = await Role.findById(req.params.id).populate('techStacks');
  
  res.status(200).json({
    success: true,
    data: updatedRole
  });
});

export default {
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  addTechStacksToRole,
  removeTechStackFromRole
};
