import { Router } from "express";
import { register, login, getMe, updateProfile, changePassword } from "../controllers/authController";
import { listUsers, createUser, updateUser, deleteUser, listSections } from "../controllers/adminController";
import { authenticateToken } from "../middleware/authMiddleware";
import { requireMasterAdmin } from "../middleware/adminMiddleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticateToken, getMe);
router.put("/profile", authenticateToken, updateProfile);
router.put("/password", authenticateToken, changePassword);

// Admin-only user management
router.get("/admin/sections", authenticateToken, requireMasterAdmin, listSections);
router.get("/admin/users", authenticateToken, requireMasterAdmin, listUsers);
router.post("/admin/users", authenticateToken, requireMasterAdmin, createUser);
router.put("/admin/users/:id", authenticateToken, requireMasterAdmin, updateUser);
router.delete("/admin/users/:id", authenticateToken, requireMasterAdmin, deleteUser);

export default router;
