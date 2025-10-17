import { Router } from 'express';
import { getAllUsers, getCurrentUser, publicKeySaveinDb, searchUsers } from '../../controllers/Users/user.controller.js';
import { requireAuth } from '@clerk/express';
const router = Router();
router.get('/getAllUsers',requireAuth(),getAllUsers);
router.get('/getUser',requireAuth(),getCurrentUser);
router.get('/search',requireAuth(),searchUsers);
router.post('/setPublicKey',requireAuth(),publicKeySaveinDb);



export default router;
