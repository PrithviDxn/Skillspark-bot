import express from 'express';
import {
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  addTechStacksToRole,
  removeTechStackFromRole
} from '../controllers/roles.js';

const router = express.Router();

// Main role routes
router.route('/')
  .get(getRoles)
  .post(createRole);

router.route('/:id')
  .get(getRole)
  .put(updateRole)
  .delete(deleteRole);

// Tech stack management for roles
router.route('/:id/techstacks')
  .put(addTechStacksToRole);

router.route('/:id/techstacks/:techStackId')
  .delete(removeTechStackFromRole);

export default router;
