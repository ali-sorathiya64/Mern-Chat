import { Router } from "express";
import { testEmailHandler, updateUser } from "../controllers/user.controller.js"; // Fixed typo here
import { fileValidation } from "../middlewares/file-validation.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyToken } from "../middlewares/verify-token.middleware.js";
const router = Router();
router.patch("/", verifyToken, upload.single("avatar"), fileValidation, updateUser // Using the correct exported function name
);
router.get("/test-email", verifyToken, testEmailHandler);
export default router;
