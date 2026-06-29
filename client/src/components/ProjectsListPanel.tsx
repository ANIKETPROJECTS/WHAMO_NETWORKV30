import { useState } from "react";
import { useProjects, useDeleteProject } from "@/hooks/use-projects";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { X, FolderOpen, Trash2, Upload, Clock, LayoutGrid, AlertTriangle, Share2, UserPlus, UserMinus, Crown } from "lucide-react";
import { api } from "@shared/routes";
import { getAuthHeader } from "@/lib/queryClient";

interface Project {
  id: string;
  name: string;
  content: any;
  createdAt: string | null;
  updatedAt: string | null;
  userId: string;
  sharedWith: string[];
}

interface ProjectsListPanelProps {
  onClose: () => void;
  onLoadProject: (project: Project) => void;
  onLoadFromFile: () => void;
  currentProjectId: string | null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function projectStats(content: any): { nodes: number; pipes: number } {
  if (!content) return { nodes: 0, pipes: 0 };
  const nodes = Array.isArray(content.nodes) ? content.nodes.length : 0;
  const pipes = Array.isArray(content.edges) ? content.edges.length : 0;
  return { nodes, pipes };
}

async function authFetch(url: string, init: RequestInit = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { ...getAuthHeader(), ...(init.headers as Record<string, string> || {}) },
    credentials: "include",
  });
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.message || `Request failed: ${res.status}`);
  }
  return res;
}

function ShareDialog({
  project,
  onClose,
  onUpdated,
  currentUserEmail,
}: {
  project: Project;
  onClose: () => void;
  onUpdated: () => void;
  currentUserEmail: string;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleShare = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      await authFetch(`/api/projects/${project.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      setEmail("");
      onUpdated();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnshare = async (emailToRemove: string) => {
    setLoading(true);
    setError("");
    try {
      await authFetch(`/api/projects/${project.id}/share`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToRemove }),
      });
      onUpdated();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        style={{ width: "min(480px, 95vw)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Share2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900" style={{ fontFamily: "Poppins, sans-serif" }}>
                Share Project
              </h2>
              <p className="text-xs text-slate-500 truncate max-w-[260px]" style={{ fontFamily: "Poppins, sans-serif" }}>
                {project.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5">
          {/* Add user input */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide" style={{ fontFamily: "Poppins, sans-serif" }}>
              Grant access by email
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleShare()}
                placeholder="colleague@example.com"
                className="flex-1 h-9 px-3 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ fontFamily: "Poppins, sans-serif" }}
                data-testid="input-share-email"
              />
              <button
                onClick={handleShare}
                disabled={loading || !email.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: "Poppins, sans-serif" }}
                data-testid="btn-share-project"
              >
                <UserPlus className="w-4 h-4" />
                Share
              </button>
            </div>
            {error && (
              <p className="text-xs text-red-500 mt-1.5" style={{ fontFamily: "Poppins, sans-serif" }}>{error}</p>
            )}
          </div>

          {/* Shared-with list */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide" style={{ fontFamily: "Poppins, sans-serif" }}>
              People with access
            </label>
            <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto">
              {/* Owner row */}
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-blue-50 border border-blue-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-[11px] font-bold text-white uppercase">
                      {currentUserEmail.charAt(0)}
                    </span>
                  </div>
                  <span className="text-sm text-slate-700 truncate" style={{ fontFamily: "Poppins, sans-serif" }}>
                    {currentUserEmail}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                  <Crown className="w-3 h-3" />
                  Owner
                </div>
              </div>

              {/* Shared-with rows */}
              {project.sharedWith.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-3" style={{ fontFamily: "Poppins, sans-serif" }}>
                  No one else has access yet
                </p>
              ) : (
                project.sharedWith.map((sharedEmail) => (
                  <div
                    key={sharedEmail}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center flex-shrink-0">
                        <span className="text-[11px] font-bold text-slate-600 uppercase">
                          {sharedEmail.charAt(0)}
                        </span>
                      </div>
                      <span className="text-sm text-slate-700 truncate" style={{ fontFamily: "Poppins, sans-serif" }}>
                        {sharedEmail}
                      </span>
                    </div>
                    <button
                      onClick={() => handleUnshare(sharedEmail)}
                      disabled={loading}
                      className="flex items-center gap-1 text-[11px] text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                      style={{ fontFamily: "Poppins, sans-serif" }}
                      title="Remove access"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProjectsListPanel({ onClose, onLoadProject, onLoadFromFile, currentProjectId }: ProjectsListPanelProps) {
  const { data: projects, isLoading, error, refetch } = useProjects();
  const deleteMutation = useDeleteProject();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [shareProject, setShareProject] = useState<Project | null>(null);

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
    setConfirmDeleteId(null);
  };

  const handleShareUpdated = () => {
    qc.invalidateQueries({ queryKey: [api.projects.list.path] });
    refetch();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
          style={{ width: "min(860px, 95vw)", height: "min(640px, 90vh)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-2xl flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <FolderOpen className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900" style={{ fontFamily: "Poppins, sans-serif" }}>
                  My Projects
                </h2>
                <p className="text-xs text-slate-500" style={{ fontFamily: "Poppins, sans-serif" }}>
                  {Array.isArray(projects) ? `${projects.length} saved project${projects.length !== 1 ? "s" : ""}` : "Loading…"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onLoadFromFile}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors border border-slate-200"
                style={{ fontFamily: "Poppins, sans-serif" }}
                data-testid="btn-load-from-file"
              >
                <Upload className="w-3.5 h-3.5" />
                Import File
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
                data-testid="btn-projects-close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-sm" style={{ fontFamily: "Poppins, sans-serif" }}>Loading projects…</span>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                <AlertTriangle className="w-10 h-10 text-amber-400" />
                <p className="text-sm font-medium text-slate-600" style={{ fontFamily: "Poppins, sans-serif" }}>
                  Could not load projects
                </p>
                <button
                  onClick={() => refetch()}
                  className="text-xs text-blue-600 hover:underline"
                  style={{ fontFamily: "Poppins, sans-serif" }}
                >
                  Try again
                </button>
              </div>
            )}

            {!isLoading && !error && Array.isArray(projects) && projects.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                  <LayoutGrid className="w-8 h-8 text-slate-300" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-500 mb-1" style={{ fontFamily: "Poppins, sans-serif" }}>
                    No saved projects yet
                  </p>
                  <p className="text-xs text-slate-400" style={{ fontFamily: "Poppins, sans-serif" }}>
                    Click <strong>Save</strong> in the toolbar to save your current network to your account.
                  </p>
                </div>
              </div>
            )}

            {!isLoading && !error && Array.isArray(projects) && projects.length > 0 && (
              <div className="flex flex-col gap-2">
                {(projects as Project[]).map((project) => {
                  const stats = projectStats(project.content);
                  const isActive = project.id === currentProjectId;
                  const isDeleting = confirmDeleteId === project.id;
                  const isOwner = project.userId === user?.id;
                  const isSharedWithMe = !isOwner;

                  return (
                    <div
                      key={project.id}
                      className={`group flex items-center gap-4 p-4 rounded-xl border transition-all duration-150 cursor-pointer ${
                        isActive
                          ? "border-blue-300 bg-blue-50/60"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                      data-testid={`project-card-${project.id}`}
                      onClick={() => !isDeleting && onLoadProject(project)}
                    >
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? "bg-blue-100" : "bg-slate-100 group-hover:bg-slate-200"}`}>
                        <FolderOpen className={`w-5 h-5 ${isActive ? "text-blue-600" : "text-slate-500"}`} />
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-sm font-semibold text-slate-800 truncate"
                            style={{ fontFamily: "Poppins, sans-serif" }}
                          >
                            {project.name}
                          </span>
                          {isActive && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-600 text-white rounded-full flex-shrink-0">
                              OPEN
                            </span>
                          )}
                          {isSharedWithMe && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full flex-shrink-0 flex items-center gap-0.5">
                              <Share2 className="w-2.5 h-2.5" />
                              Shared with me
                            </span>
                          )}
                          {isOwner && (project.sharedWith?.length ?? 0) > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full flex-shrink-0 flex items-center gap-0.5">
                              <Share2 className="w-2.5 h-2.5" />
                              Shared ({project.sharedWith?.length ?? 0})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="flex items-center gap-1 text-xs text-slate-400" style={{ fontFamily: "Poppins, sans-serif" }}>
                            <Clock className="w-3 h-3" />
                            {formatDate(project.updatedAt || project.createdAt)}
                          </span>
                          <span className="text-xs text-slate-400" style={{ fontFamily: "Poppins, sans-serif" }}>
                            {stats.nodes} node{stats.nodes !== 1 ? "s" : ""} · {stats.pipes} pipe{stats.pipes !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        {isDeleting ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-red-600 font-medium" style={{ fontFamily: "Poppins, sans-serif" }}>
                              Delete?
                            </span>
                            <button
                              onClick={() => handleDelete(project.id)}
                              disabled={deleteMutation.isPending}
                              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                              style={{ fontFamily: "Poppins, sans-serif" }}
                            >
                              {deleteMutation.isPending ? "…" : "Yes"}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                              style={{ fontFamily: "Poppins, sans-serif" }}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => onLoadProject(project)}
                              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              style={{ fontFamily: "Poppins, sans-serif" }}
                              data-testid={`btn-open-project-${project.id}`}
                            >
                              Open
                            </button>
                            {isOwner && (
                              <button
                                onClick={() => setShareProject(project)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100"
                                data-testid={`btn-share-project-${project.id}`}
                                title="Share project"
                              >
                                <Share2 className="w-4 h-4" />
                              </button>
                            )}
                            {isOwner && (
                              <button
                                onClick={() => setConfirmDeleteId(project.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                data-testid={`btn-delete-project-${project.id}`}
                                title="Delete project"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {shareProject && user && (
        <ShareDialog
          project={shareProject}
          currentUserEmail={user.email}
          onClose={() => setShareProject(null)}
          onUpdated={() => {
            handleShareUpdated();
            setShareProject(null);
          }}
        />
      )}
    </>
  );
}
