import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { userStore } from "../auth/inMemoryUserStore";
import { ALL_SECTIONS, type SectionKey, type UserRole } from "../models/User";

export async function listUsers(req: Request, res: Response) {
  try {
    const users = await userStore.findAll();
    const safe = users.map(u => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      sectionAccess: u.sectionAccess,
      createdAt: u.createdAt,
    }));
    return res.json(safe);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function createUser(req: Request, res: Response) {
  try {
    const { fullName, email, password, role, sectionAccess } = req.body;

    if (!fullName?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: "fullName, email and password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }
    const validRoles: UserRole[] = ["masterAdmin", "normalUser"];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    const existing = await userStore.findByEmail(email);
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const sections: SectionKey[] = Array.isArray(sectionAccess)
      ? sectionAccess.filter((s: string) => (ALL_SECTIONS as readonly string[]).includes(s)) as SectionKey[]
      : [...ALL_SECTIONS];

    const hashed = await bcrypt.hash(password, 12);
    const user = await userStore.create(
      fullName.trim(),
      email.trim(),
      hashed,
      role || "normalUser",
      sections,
    );

    return res.status(201).json({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      sectionAccess: user.sectionAccess,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error("Admin createUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function updateUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const requesterId = (req as any).user.id;

    const target = await userStore.findById(id);
    if (!target) return res.status(404).json({ message: "User not found" });

    const { fullName, email, password, role, sectionAccess } = req.body;

    // Prevent removing masterAdmin role from yourself
    if (id === requesterId && role && role !== "masterAdmin") {
      return res.status(400).json({ message: "You cannot downgrade your own Master Admin role" });
    }

    const updates: Parameters<typeof userStore.update>[1] = {};
    if (fullName?.trim()) updates.fullName = fullName.trim();
    if (email?.trim()) {
      const emailConflict = await userStore.findByEmail(email);
      if (emailConflict && emailConflict.id !== id) {
        return res.status(409).json({ message: "Email is already in use by another account" });
      }
      updates.email = email.trim();
    }
    if (password) {
      if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });
      updates.password = await bcrypt.hash(password, 12);
    }
    if (role) updates.role = role as UserRole;
    if (Array.isArray(sectionAccess)) {
      updates.sectionAccess = sectionAccess.filter((s: string) =>
        (ALL_SECTIONS as readonly string[]).includes(s)
      ) as SectionKey[];
    }

    const updated = await userStore.update(id, updates);
    if (!updated) return res.status(404).json({ message: "User not found" });

    return res.json({
      id: updated.id,
      fullName: updated.fullName,
      email: updated.email,
      role: updated.role,
      sectionAccess: updated.sectionAccess,
      createdAt: updated.createdAt,
    });
  } catch (err) {
    console.error("Admin updateUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function deleteUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const requesterId = (req as any).user.id;

    if (id === requesterId) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }

    const target = await userStore.findById(id);
    if (!target) return res.status(404).json({ message: "User not found" });

    await userStore.delete(id);
    return res.status(204).send();
  } catch (err) {
    console.error("Admin deleteUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

export function listSections(_req: Request, res: Response) {
  return res.json(ALL_SECTIONS);
}
