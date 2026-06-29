import { useState } from "react";
import { useAuth, type SectionKey } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Pencil, PlusCircle, ArrowLeft, ShieldCheck, User } from "lucide-react";

const SECTION_LABELS: Record<SectionKey, string> = {
  designer:        "Network Designer",
  projects:        "Project Management",
  simulation:      "Run Simulation",
  visualization:   "Results Visualization",
  outputRequests:  "Output Requests",
  flexTable:       "Flex Table",
  excelIO:         "Excel Import / Export",
  networkSettings: "Network Settings",
};

const ALL_SECTIONS = Object.keys(SECTION_LABELS) as SectionKey[];

interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: "masterAdmin" | "normalUser";
  sectionAccess: SectionKey[];
  createdAt: string;
}

const emptyForm = {
  fullName: "",
  email: "",
  password: "",
  role: "normalUser" as "masterAdmin" | "normalUser",
  sectionAccess: [...ALL_SECTIONS] as SectionKey[],
};

export default function AdminPanel() {
  const { user, isMasterAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  if (!isMasterAdmin()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Master Admin access required.</p>
          <Button variant="outline" className="mt-4" onClick={() => setLocation("/")}>
            Back to Designer
          </Button>
        </div>
      </div>
    );
  }

  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/auth/admin/users"],
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiRequest("POST", "/api/auth/admin/users", data).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/auth/admin/users"] });
      setDialogOpen(false);
      toast({ title: "User created successfully." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof form> }) =>
      apiRequest("PUT", `/api/auth/admin/users/${id}`, data).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/auth/admin/users"] });
      setDialogOpen(false);
      toast({ title: "User updated successfully." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/auth/admin/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/auth/admin/users"] });
      setDeleteTarget(null);
      toast({ title: "User deleted." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function openCreate() {
    setEditingUser(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  }

  function openEdit(u: AdminUser) {
    setEditingUser(u);
    setForm({
      fullName: u.fullName,
      email: u.email,
      password: "",
      role: u.role,
      sectionAccess: [...u.sectionAccess],
    });
    setDialogOpen(true);
  }

  function toggleSection(s: SectionKey) {
    setForm(f => ({
      ...f,
      sectionAccess: f.sectionAccess.includes(s)
        ? f.sectionAccess.filter(x => x !== s)
        : [...f.sectionAccess, s],
    }));
  }

  function handleSubmit() {
    if (editingUser) {
      const payload: any = {
        fullName: form.fullName,
        email: form.email,
        role: form.role,
        sectionAccess: form.sectionAccess,
      };
      if (form.password) payload.password = form.password;
      updateMutation.mutate({ id: editingUser.id, data: payload });
    } else {
      createMutation.mutate(form);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="gap-1.5 text-slate-600">
          <ArrowLeft className="w-4 h-4" />
          Back to Designer
        </Button>
        <div className="h-5 w-px bg-slate-200" />
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-slate-800 text-[15px]" style={{ fontFamily: "Poppins, sans-serif" }}>
            User Management
          </span>
        </div>
        <div className="ml-auto">
          <Button size="sm" onClick={openCreate} className="gap-1.5 bg-blue-600 hover:bg-blue-700">
            <PlusCircle className="w-4 h-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Info bar */}
      <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
        <span className="text-[12px] text-blue-700" style={{ fontFamily: "Poppins, sans-serif" }}>
          Logged in as <strong>{user?.fullName}</strong> (Master Admin) — You can create, edit and delete user accounts and set section access permissions.
        </span>
      </div>

      {/* Table */}
      <div className="p-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold text-slate-600 text-[12px]" style={{ fontFamily: "Poppins, sans-serif" }}>Name</TableHead>
                <TableHead className="font-semibold text-slate-600 text-[12px]" style={{ fontFamily: "Poppins, sans-serif" }}>Email</TableHead>
                <TableHead className="font-semibold text-slate-600 text-[12px]" style={{ fontFamily: "Poppins, sans-serif" }}>Role</TableHead>
                <TableHead className="font-semibold text-slate-600 text-[12px]" style={{ fontFamily: "Poppins, sans-serif" }}>Section Access</TableHead>
                <TableHead className="font-semibold text-slate-600 text-[12px]" style={{ fontFamily: "Poppins, sans-serif" }}>Added</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400 text-[13px]">Loading users…</TableCell>
                </TableRow>
              )}
              {!isLoading && users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400 text-[13px]">No users found.</TableCell>
                </TableRow>
              )}
              {users.map(u => (
                <TableRow key={u.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell className="font-medium text-[13px] text-slate-800" style={{ fontFamily: "Poppins, sans-serif" }}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-white uppercase">{u.fullName.charAt(0)}</span>
                      </div>
                      {u.fullName}
                      {u.id === user?.id && (
                        <span className="text-[10px] text-blue-500 font-semibold">(you)</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-[12px] text-slate-600">{u.email}</TableCell>
                  <TableCell>
                    {u.role === "masterAdmin" ? (
                      <Badge className="bg-blue-600 text-white text-[10px] gap-1">
                        <ShieldCheck className="w-3 h-3" /> Master Admin
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] gap-1 text-slate-600 border-slate-300">
                        <User className="w-3 h-3" /> Normal User
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.role === "masterAdmin" ? (
                      <span className="text-[11px] text-slate-400 italic">All sections</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {u.sectionAccess.length === ALL_SECTIONS.length ? (
                          <span className="text-[11px] text-slate-400 italic">All sections</span>
                        ) : u.sectionAccess.length === 0 ? (
                          <span className="text-[11px] text-red-400 italic">No access</span>
                        ) : (
                          u.sectionAccess.slice(0, 3).map(s => (
                            <Badge key={s} variant="outline" className="text-[9px] px-1.5 py-0 text-slate-600 border-slate-200">
                              {SECTION_LABELS[s]}
                            </Badge>
                          )).concat(
                            u.sectionAccess.length > 3
                              ? [<Badge key="more" variant="outline" className="text-[9px] px-1.5 py-0 text-slate-400 border-slate-200">+{u.sectionAccess.length - 3} more</Badge>]
                              : []
                          )
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-[12px] text-slate-400">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost" size="icon"
                        className="w-7 h-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                        onClick={() => openEdit(u)}
                        title="Edit user"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="w-7 h-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setDeleteTarget(u)}
                        disabled={u.id === user?.id}
                        title={u.id === user?.id ? "Cannot delete yourself" : "Delete user"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold text-slate-800" style={{ fontFamily: "Poppins, sans-serif" }}>
              {editingUser ? "Edit User" : "Add New User"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-slate-700">Full Name</Label>
              <Input
                value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                placeholder="e.g. John Engineer"
                className="h-8 text-[13px]"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-slate-700">Email Address</Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="user@organisation.com"
                className="h-8 text-[13px]"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-slate-700">
                {editingUser ? "New Password (leave blank to keep current)" : "Password"}
              </Label>
              <Input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder={editingUser ? "Leave blank to keep unchanged" : "Min. 8 characters"}
                className="h-8 text-[13px]"
              />
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-slate-700">Role</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as any }))}>
                <SelectTrigger className="h-8 text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="masterAdmin">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                      Master Admin — full access, can manage users
                    </div>
                  </SelectItem>
                  <SelectItem value="normalUser">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      Normal User — access controlled by section permissions
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Section Access */}
            {form.role === "normalUser" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[12px] font-medium text-slate-700">Section Access</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, sectionAccess: [...ALL_SECTIONS] }))}
                      className="text-[11px] text-blue-600 hover:underline"
                    >
                      Select all
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, sectionAccess: [] }))}
                      className="text-[11px] text-slate-500 hover:underline"
                    >
                      Clear all
                    </button>
                  </div>
                </div>
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {ALL_SECTIONS.map(s => (
                    <label
                      key={s}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer"
                    >
                      <Checkbox
                        checked={form.sectionAccess.includes(s)}
                        onCheckedChange={() => toggleSection(s)}
                        className="h-4 w-4"
                      />
                      <span className="text-[12px] text-slate-700" style={{ fontFamily: "Poppins, sans-serif" }}>
                        {SECTION_LABELS[s]}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 italic">
                  Master Admins always have access to all sections regardless of this setting.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={isPending} className="bg-blue-600 hover:bg-blue-700">
              {isPending ? "Saving…" : editingUser ? "Save Changes" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold text-slate-800">Delete User?</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-slate-600 py-2">
            Are you sure you want to delete <strong>{deleteTarget?.fullName}</strong> ({deleteTarget?.email})?
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
