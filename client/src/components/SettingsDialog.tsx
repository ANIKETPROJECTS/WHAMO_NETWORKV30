import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { useProjects, useUpdateProject, useDeleteProject } from "@/hooks/use-projects";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Lock,
  Save,
  FolderOpen,
  Trash2,
  Pencil,
  Check,
  X,
  Clock,
  Shield,
  Eye,
  EyeOff,
  Settings,
  ChevronRight,
} from "lucide-react";
import { getAuthHeader } from "@/lib/queryClient";

const AUTOSAVE_KEY = "whamo_autosave_settings";

export interface AutosaveSettings {
  enabled: boolean;
  intervalSec: number;
}

export function getAutosaveSettings(): AutosaveSettings {
  try {
    const s = localStorage.getItem(AUTOSAVE_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return { enabled: false, intervalSec: 60 };
}

function saveAutosaveSettingsToStorage(settings: AutosaveSettings) {
  localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(settings));
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }) +
    " " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

type TabId = "profile" | "security" | "autosave" | "projects";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  onLoadProject?: (project: any) => void;
  currentProjectId?: number | null;
}

export function SettingsDialog({
  open,
  onClose,
  onLoadProject,
  currentProjectId,
}: SettingsDialogProps) {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  const [autosave, setAutosave] = useState<AutosaveSettings>(getAutosaveSettings);

  const { data: projects, isLoading: projectsLoading } = useProjects();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    if (open) setAutosave(getAutosaveSettings());
  }, [open]);

  const handleProfileSave = async () => {
    if (!fullName.trim() || !email.trim()) {
      toast({ variant: "destructive", title: "Error", description: "All fields are required" });
      return;
    }
    setProfileLoading(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ fullName, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");
      updateUser(data.user, data.token);
      toast({ title: "Profile Updated", description: "Your profile has been saved." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Update Failed", description: err.message });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSave = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ variant: "destructive", title: "Error", description: "All fields are required" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Error", description: "New passwords don't match" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ variant: "destructive", title: "Error", description: "Password must be at least 8 characters" });
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password Changed", description: "Your password has been updated." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Change Failed", description: err.message });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAutosaveChange = (newSettings: AutosaveSettings) => {
    setAutosave(newSettings);
    saveAutosaveSettingsToStorage(newSettings);
    window.dispatchEvent(
      new CustomEvent("autosave-settings-changed", { detail: newSettings })
    );
  };

  const handleRenameStart = (project: any) => {
    setEditingProjectId(project.id);
    setEditingName(project.name);
    setConfirmDeleteId(null);
  };

  const handleRenameConfirm = async (id: number) => {
    if (!editingName.trim()) return;
    try {
      await updateProject.mutateAsync({ id, name: editingName.trim() });
      setEditingProjectId(null);
      toast({ title: "Renamed", description: "Project name updated." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Rename Failed", description: err.message });
    }
  };

  const handleDeleteConfirm = async (id: number) => {
    try {
      await deleteProject.mutateAsync(id);
      setConfirmDeleteId(null);
      toast({ title: "Deleted", description: "Project has been deleted." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Delete Failed", description: err.message });
    }
  };

  const navItems: { id: TabId; label: string; icon: any; description: string }[] = [
    { id: "profile", label: "Profile", icon: User, description: "Personal info" },
    { id: "security", label: "Security", icon: Shield, description: "Password" },
    { id: "autosave", label: "Autosave", icon: Save, description: "Auto-backup" },
    { id: "projects", label: "Projects", icon: FolderOpen, description: "Manage files" },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="p-0 gap-0 overflow-hidden border-0 shadow-2xl"
        style={{ maxWidth: 760, height: 600, fontFamily: "Poppins, sans-serif" }}
      >
        <div className="flex h-full">
          {/* ── Sidebar ── */}
          <div className="w-56 flex-shrink-0 bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col rounded-l-lg">
            {/* Logo area */}
            <div className="px-5 pt-5 pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <Settings className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-bold text-[15px] tracking-tight">Settings</span>
              </div>
            </div>

            {/* User card */}
            <div className="px-4 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <span className="text-white font-bold text-sm">
                    {getInitials(user?.fullName || "U")}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-white text-[13px] font-semibold truncate">
                    {user?.fullName || "User"}
                  </p>
                  <p className="text-slate-400 text-[11px] truncate">{user?.email || ""}</p>
                </div>
              </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 p-3 space-y-1">
              {navItems.map(({ id, label, icon: Icon, description }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group ${
                    activeTab === id
                      ? "bg-blue-500 shadow-lg shadow-blue-500/20"
                      : "hover:bg-white/8"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                      activeTab === id ? "bg-white/20" : "bg-white/6 group-hover:bg-white/10"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${activeTab === id ? "text-white" : "text-slate-400"}`} />
                  </div>
                  <div>
                    <p className={`text-[12px] font-semibold leading-none mb-0.5 ${activeTab === id ? "text-white" : "text-slate-300"}`}>
                      {label}
                    </p>
                    <p className={`text-[10px] leading-none ${activeTab === id ? "text-blue-100" : "text-slate-500"}`}>
                      {description}
                    </p>
                  </div>
                  {activeTab === id && (
                    <ChevronRight className="w-3.5 h-3.5 text-white/60 ml-auto flex-shrink-0" />
                  )}
                </button>
              ))}
            </nav>

            {/* Bottom version */}
            <div className="px-5 py-3 border-t border-white/10">
              <p className="text-slate-600 text-[10px]">WHAMO Designer</p>
            </div>
          </div>

          {/* ── Content area ── */}
          <div className="flex-1 flex flex-col bg-white rounded-r-lg overflow-hidden">
            {/* Content header */}
            <div className="px-7 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
              {(() => {
                const item = navItems.find((n) => n.id === activeTab)!;
                const Icon = item.icon;
                return (
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-[17px] font-bold text-slate-900">{item.label}</h2>
                      <p className="text-[12px] text-slate-400 mt-0.5">
                        {activeTab === "profile" && "Update your personal information"}
                        {activeTab === "security" && "Change your account password"}
                        {activeTab === "autosave" && "Configure automatic cloud backups"}
                        {activeTab === "projects" && "View and manage your saved projects"}
                      </p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                      <Icon className="w-4.5 h-4.5 text-blue-600 w-[18px] h-[18px]" />
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-7 py-6">

              {/* ─── PROFILE ─── */}
              {activeTab === "profile" && (
                <div className="space-y-5 max-w-sm">
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
                      <span className="text-white font-bold text-lg">
                        {getInitials(user?.fullName || "U")}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{user?.fullName || "—"}</p>
                      <p className="text-xs text-slate-400">{user?.email || "—"}</p>
                      <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                        ACTIVE
                      </span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
                      Full Name
                    </Label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      className="h-10 text-sm border-slate-200 focus-visible:ring-blue-500"
                      data-testid="input-settings-fullname"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
                      Email Address
                    </Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="h-10 text-sm border-slate-200 focus-visible:ring-blue-500"
                      data-testid="input-settings-email"
                    />
                  </div>
                  <Button
                    onClick={handleProfileSave}
                    disabled={profileLoading}
                    className="w-full h-10 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 shadow-sm"
                    data-testid="btn-settings-save-profile"
                  >
                    {profileLoading ? "Saving…" : "Save Changes"}
                  </Button>
                </div>
              )}

              {/* ─── SECURITY ─── */}
              {activeTab === "security" && (
                <div className="space-y-5 max-w-sm">
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                    <Shield className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700 leading-relaxed">
                      Use a strong password with at least 8 characters, mixing letters and numbers.
                    </p>
                  </div>

                  {(["Current Password", "New Password", "Confirm New Password"] as const).map((labelText, i) => {
                    const values = [currentPassword, newPassword, confirmPassword];
                    const setters = [setCurrentPassword, setNewPassword, setConfirmPassword];
                    const testIds = ["input-settings-current-password", "input-settings-new-password", "input-settings-confirm-password"];
                    return (
                      <div key={labelText}>
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
                          {labelText}
                        </Label>
                        <div className="relative">
                          <Input
                            type={showPasswords ? "text" : "password"}
                            value={values[i]}
                            onChange={(e) => setters[i](e.target.value)}
                            placeholder="••••••••"
                            className="h-10 text-sm border-slate-200 focus-visible:ring-blue-500 pr-10"
                            data-testid={testIds[i]}
                          />
                          {i === 2 && (
                            <button
                              type="button"
                              onClick={() => setShowPasswords(!showPasswords)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <Button
                    onClick={handlePasswordSave}
                    disabled={passwordLoading}
                    className="w-full h-10 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 shadow-sm"
                    data-testid="btn-settings-change-password"
                  >
                    {passwordLoading ? "Updating…" : "Update Password"}
                  </Button>
                </div>
              )}

              {/* ─── AUTOSAVE ─── */}
              {activeTab === "autosave" && (
                <div className="max-w-sm space-y-5">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[13px] font-semibold text-slate-800">Enable Autosave</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Save silently in the background</p>
                      </div>
                      <Switch
                        checked={autosave.enabled}
                        onCheckedChange={(checked) =>
                          handleAutosaveChange({ ...autosave, enabled: checked })
                        }
                        data-testid="switch-autosave"
                      />
                    </div>

                    {autosave.enabled && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
                          Save Interval
                        </Label>
                        <Select
                          value={String(autosave.intervalSec)}
                          onValueChange={(v) =>
                            handleAutosaveChange({ ...autosave, intervalSec: Number(v) })
                          }
                        >
                          <SelectTrigger className="h-9 text-sm" data-testid="select-autosave-interval">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30">Every 30 seconds</SelectItem>
                            <SelectItem value="60">Every 1 minute</SelectItem>
                            <SelectItem value="120">Every 2 minutes</SelectItem>
                            <SelectItem value="300">Every 5 minutes</SelectItem>
                            <SelectItem value="600">Every 10 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
                    <Save className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-600 leading-relaxed">
                      Autosave only runs when a project is open and has been saved at least once.
                    </p>
                  </div>
                </div>
              )}

              {/* ─── PROJECTS ─── */}
              {activeTab === "projects" && (
                <div>
                  {projectsLoading && (
                    <div className="flex justify-center py-12">
                      <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                    </div>
                  )}

                  {!projectsLoading && (!Array.isArray(projects) || projects.length === 0) && (
                    <div className="flex flex-col items-center py-16 text-slate-300 gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                        <FolderOpen className="w-7 h-7 text-slate-300" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-slate-400">No saved projects</p>
                        <p className="text-xs text-slate-300 mt-1">Save a project to see it here</p>
                      </div>
                    </div>
                  )}

                  {!projectsLoading && Array.isArray(projects) && projects.length > 0 && (
                    <div className="space-y-2">
                      {(projects as any[]).map((project) => (
                        <div
                          key={project.id}
                          className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                            project.id === currentProjectId
                              ? "border-blue-200 bg-blue-50/60 shadow-sm"
                              : "border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/80"
                          }`}
                          data-testid={`settings-project-card-${project.id}`}
                        >
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              project.id === currentProjectId ? "bg-blue-100" : "bg-slate-100"
                            }`}
                          >
                            <FolderOpen
                              className={`w-4 h-4 ${
                                project.id === currentProjectId ? "text-blue-600" : "text-slate-400"
                              }`}
                            />
                          </div>

                          {editingProjectId === project.id ? (
                            <div className="flex-1 flex items-center gap-1.5">
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleRenameConfirm(project.id);
                                  if (e.key === "Escape") setEditingProjectId(null);
                                }}
                                className="h-7 text-sm flex-1 py-0"
                                autoFocus
                              />
                              <button
                                onClick={() => handleRenameConfirm(project.id)}
                                className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingProjectId(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-semibold text-slate-700 truncate">
                                  {project.name}
                                </span>
                                {project.id === currentProjectId && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-600 text-white rounded-full flex-shrink-0 tracking-wide">
                                    OPEN
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3 text-slate-300" />
                                <span className="text-[11px] text-slate-400">
                                  {formatDate(project.updatedAt || project.createdAt)}
                                </span>
                              </div>
                            </div>
                          )}

                          {editingProjectId !== project.id && (
                            <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                              {confirmDeleteId === project.id ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-red-500 font-medium">Delete?</span>
                                  <button
                                    onClick={() => handleDeleteConfirm(project.id)}
                                    disabled={deleteProject.isPending}
                                    className="px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors"
                                  >
                                    {deleteProject.isPending ? "…" : "Yes"}
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-colors"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <>
                                  {onLoadProject && (
                                    <button
                                      onClick={() => {
                                        onLoadProject(project);
                                        onClose();
                                      }}
                                      className="px-3 py-1 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
                                      data-testid={`settings-btn-open-${project.id}`}
                                    >
                                      Open
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleRenameStart(project)}
                                    className="p-1.5 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                    title="Rename"
                                    data-testid={`settings-btn-rename-${project.id}`}
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setConfirmDeleteId(project.id);
                                      setEditingProjectId(null);
                                    }}
                                    className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                    title="Delete"
                                    data-testid={`settings-btn-delete-${project.id}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
