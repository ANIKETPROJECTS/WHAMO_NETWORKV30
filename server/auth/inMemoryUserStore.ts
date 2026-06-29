import bcrypt from "bcryptjs";
import { User, type IUser, type UserRole, type SectionKey, ALL_SECTIONS } from "../models/User";

export interface StoredUser {
  id: string;
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  sectionAccess: SectionKey[];
  createdAt: Date;
}

function toStoredUser(doc: IUser): StoredUser {
  return {
    id: (doc._id as any).toString(),
    fullName: doc.fullName,
    email: doc.email,
    password: doc.password,
    role: doc.role ?? "normalUser",
    sectionAccess: doc.sectionAccess?.length ? doc.sectionAccess : [...ALL_SECTIONS],
    createdAt: doc.createdAt,
  };
}

class MongoUserStore {
  async findByEmail(email: string): Promise<StoredUser | undefined> {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    return user ? toStoredUser(user) : undefined;
  }

  async findById(id: string): Promise<StoredUser | undefined> {
    const user = await User.findById(id);
    return user ? toStoredUser(user) : undefined;
  }

  async findAll(): Promise<StoredUser[]> {
    const users = await User.find().sort({ createdAt: 1 });
    return users.map(toStoredUser);
  }

  async create(
    fullName: string,
    email: string,
    password: string,
    role: UserRole = "normalUser",
    sectionAccess: SectionKey[] = [...ALL_SECTIONS],
  ): Promise<StoredUser> {
    const user = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      password,
      role,
      sectionAccess,
    });
    return toStoredUser(user);
  }

  async update(
    id: string,
    data: {
      fullName?: string;
      email?: string;
      password?: string;
      role?: UserRole;
      sectionAccess?: SectionKey[];
    },
  ): Promise<StoredUser | undefined> {
    const updates: Partial<IUser> = {};
    if (data.fullName !== undefined) updates.fullName = data.fullName.trim();
    if (data.email !== undefined) updates.email = data.email.toLowerCase().trim();
    if (data.password !== undefined) updates.password = data.password;
    if (data.role !== undefined) updates.role = data.role;
    if (data.sectionAccess !== undefined) updates.sectionAccess = data.sectionAccess;

    const user = await User.findByIdAndUpdate(id, updates, { new: true });
    return user ? toStoredUser(user) : undefined;
  }

  async delete(id: string): Promise<boolean> {
    const result = await User.findByIdAndDelete(id);
    return !!result;
  }

  async seedDemo(): Promise<void> {
    const existing = await this.findByEmail("admin@whamo.com");
    if (existing) return;
    const hashed = await bcrypt.hash("Admin@123", 12);
    await this.create("Master Admin", "admin@whamo.com", hashed, "masterAdmin", [...ALL_SECTIONS]);
    console.log("[auth] Master Admin ready: admin@whamo.com / Admin@123");

    // Also seed demo user if not present
    const demoExists = await this.findByEmail("demo@example.com");
    if (!demoExists) {
      const demoHash = await bcrypt.hash("Demo@123", 12);
      await this.create("Demo User", "demo@example.com", demoHash, "normalUser", [...ALL_SECTIONS]);
      console.log("[auth] Demo user ready: demo@example.com / Demo@123");
    }
  }
}

export const userStore = new MongoUserStore();
