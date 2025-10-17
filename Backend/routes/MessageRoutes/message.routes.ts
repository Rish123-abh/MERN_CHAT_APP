import { Router } from "express";
import { getMessages, sendMessage } from "../../controllers/Message/message.controller.js";
import { requireAuth } from "@clerk/express";
import { upload } from "../../middlewares/multer.middleware.js";
const router=Router();
// We are receiving receiver id from params which will send from frontend 
router.post('/send/:receiver',requireAuth(), upload.single("image"),sendMessage);
router.get('/get/:receiver',requireAuth(), getMessages);

export default router;