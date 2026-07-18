"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Users,
  UserPlus,
  Trash2,
  Shield,
  Wrench,
  KeyRound,
  Eye,
  EyeOff,
  RefreshCw,
  AtSign,
  User as UserIcon,
  Bell,
  Check,
  X,
} from "lucide-react";
import { Header } from "@/components/Header";
import { createUser, removeUser, changeUserRole, approveUser, rejectUser, resyncAuthUser } from "@/app/actions";
import { getCurrentRole } from "@/app/actions";
import type { UserRole, UserStatus } from "@/lib/usersDb";

interface UserRow {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

const ROLE_META: Record<UserRole, { label: string; color: string; icon: React.ReactNode }> = {
  admin: {
    label: "Administrador",
    color: "text-red-400 border-red-500/30 bg-red-500/10",
    icon: <Shield className="w-3.5 h-3.5" />,
  },
  encargado: {
    label: "Encargado",
    color: "text-blue-400 border-blue-500/30 bg-blue-500/10",
    icon: <Wrench className="w-3.5 h-3.5" />,
  },
};

type Tab = "activos" | "pendientes";

export default function UsuariosPage() {
  const router = useRouter();
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("activos");

  // form (solo lo usa el admin para crear atajos)
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("encargado");
  const [showPassword, setShowPassword] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const roleResp = await getCurrentRole();
      setCurrentRole(roleResp);

      if (!roleResp) {
        toast.error("No tienes permisos para acceder a este módulo.");
        return;
      }

      const res = await fetch(`/api/users?t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || "No se pudo obtener la lista de usuarios.");
      }
      setUsers(data.users || []);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Error al sincronizar usuarios";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    const toastId = toast.loading("Creando usuario...");
    try {
      const res = await createUser({ username, password, name, role });
      if (!res.success) throw new Error(res.error || "No se pudo crear el usuario.");
      toast.success(`Usuario ${name} creado y activo.`, { id: toastId });
      setUsername("");
      setName("");
      setPassword("");
      setRole("encargado");
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al crear usuario";
      toast.error(message, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (user: UserRow) => {
    if (currentRole !== "admin") {
      toast.error("Solo el administrador puede eliminar usuarios.");
      return;
    }
    const ok = window.confirm(
      `¿Eliminar al usuario ${user.name} (@${user.username})? Esta acción no se puede deshacer.`
    );
    if (!ok) return;

    const toastId = toast.loading("Eliminando usuario...");
    try {
      const res = await removeUser(user.id);
      if (!res.success) throw new Error(res.error || "No se pudo eliminar.");
      toast.success("Usuario eliminado.", { id: toastId });
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al eliminar";
      toast.error(message, { id: toastId });
    }
  };

  const handleChangeRole = async (user: UserRow, newRole: UserRole) => {
    if (currentRole !== "admin") {
      toast.error("Solo el administrador puede cambiar roles.");
      return;
    }
    if (newRole === user.role) return;
    const toastId = toast.loading("Actualizando rol...");
    try {
      const res = await changeUserRole(user.id, newRole);
      if (!res.success) throw new Error(res.error || "No se pudo actualizar.");
      toast.success(`Rol actualizado a ${ROLE_META[newRole].label}.`, { id: toastId });
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cambiar rol";
      toast.error(message, { id: toastId });
    }
  };

  const handleApprove = async (user: UserRow, finalRole?: UserRole) => {
    if (currentRole !== "admin") {
      toast.error("Solo el administrador puede aprobar.");
      return;
    }
    const toastId = toast.loading("Aprobando solicitud...");
    try {
      const res = await approveUser(user.id, finalRole);
      if (!res.success) throw new Error(res.error || "No se pudo aprobar.");
      toast.success(`Solicitud de @${user.username} aprobada.`, { id: toastId });
      await loadData();
      setActiveTab("activos");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al aprobar";
      toast.error(message, { id: toastId });
    }
  };

  const handleReject = async (user: UserRow) => {
    if (currentRole !== "admin") {
      toast.error("Solo el administrador puede rechazar.");
      return;
    }
    const ok = window.confirm(
      `¿Rechazar y eliminar la solicitud de @${user.username}? Esta acción no se puede deshacer.`
    );
    if (!ok) return;

    const toastId = toast.loading("Rechazando solicitud...");
    try {
      const res = await rejectUser(user.id);
      if (!res.success) throw new Error(res.error || "No se pudo rechazar.");
      toast.success("Solicitud rechazada.", { id: toastId });
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al rechazar";
      toast.error(message, { id: toastId });
    }
  };

  const handleResync = async (user: UserRow) => {
    if (currentRole !== "admin") {
      toast.error("Solo el administrador puede re-sincronizar.");
      return;
    }
    const toastId = toast.loading(`Re-sincronizando @${user.username} con Auth...`);
    try {
      const res = await resyncAuthUser(user.id);
      if (!res.success) throw new Error(res.error || "No se pudo re-sincronizar.");
      toast.success(res.message || "Re-sincronizado.", { id: toastId });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al re-sincronizar";
      toast.error(message, { id: toastId });
    }
  };

  // Si no hay rol válido
  if (!currentRole && !isLoading) {
    return (
      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
        <Header />
        <div className="border border-red-500/30 bg-red-500/5 p-6 mt-6 text-center">
          <Shield className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-red-300 font-mono-terminal uppercase tracking-wider">
            Acceso Denegado
          </h2>
          <p className="text-sm text-zinc-400 mt-2">
            No tienes permisos para acceder a la gestión de usuarios.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 font-mono-terminal text-xs uppercase tracking-wider rounded-none"
          >
            Volver al Panel
          </button>
        </div>
      </main>
    );
  }

  const activeUsers = users.filter((u) => u.status === "activo");
  const pendingUsers = users.filter((u) => u.status === "pendiente");

  return (
    <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
      <Header />

      {/* Encabezado */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 text-black p-2 border border-amber-600 rounded-none">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-mono-terminal tracking-wider text-white uppercase">
              Gestión de Usuarios
            </h1>
            <p className="text-xs text-zinc-500 font-mono-terminal uppercase tracking-widest">
              Cuentas activas, solicitudes pendientes y creación directa
            </p>
          </div>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3 py-2 border border-zinc-850 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-amber-500 font-mono-terminal text-xs uppercase tracking-wider transition-all cursor-pointer rounded-none disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refrescar</span>
        </button>
      </div>

      {/* Banner para encargado: explica que el módulo es solo lectura */}
      {currentRole !== "admin" && currentRole !== null && (
        <div className="mb-6 p-3 border border-blue-500/20 bg-blue-500/5 text-blue-300 font-mono-terminal text-[10px] uppercase tracking-wider leading-relaxed">
          <Shield className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
          Tu rol actual (<b>Encargado</b>) es de <b>solo lectura</b> en este módulo. Solo el administrador puede crear, aprobar o eliminar cuentas.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Formulario admin-only para creación directa — 2 columnas */}
        {currentRole === "admin" && (
          <section className="lg:col-span-2 bg-[#121212] border border-zinc-850 p-5">
            <div className="flex items-center gap-2 mb-4 border-b border-zinc-900 pb-3">
              <UserPlus className="w-5 h-5 text-amber-500" />
              <h2 className="text-sm font-bold font-mono-terminal uppercase tracking-wider text-white">
                Crear Directo
              </h2>
              <span className="ml-auto text-[9px] text-zinc-600 font-mono-terminal uppercase tracking-widest">
                sin aprobación
              </span>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="flex flex-col">
                <label className="text-[10px] font-semibold text-zinc-400 font-mono-terminal uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-zinc-500" />
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. María Pérez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 text-white rounded-none focus:border-amber-500 font-mono-terminal"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] font-semibold text-zinc-400 font-mono-terminal uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <AtSign className="w-3.5 h-3.5 text-zinc-500" />
                  Usuario de Acceso
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  pattern="[a-z0-9._\-]+"
                  placeholder="ej. ramon, maria.perez"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 text-white rounded-none focus:border-amber-500 font-mono-terminal"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] font-semibold text-zinc-400 font-mono-terminal uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-zinc-500" />
                  Contraseña Provisional
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={3}
                    placeholder="mínimo 3 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 text-sm bg-zinc-950 border border-zinc-800 text-white rounded-none focus:border-amber-500 font-mono-terminal"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-amber-500 transition-colors p-1"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] font-semibold text-zinc-400 font-mono-terminal uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-zinc-500" />
                  Rol Asignado
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {(Object.keys(ROLE_META) as UserRole[]).map((r) => {
                    const meta = ROLE_META[r];
                    const active = role === r;
                    return (
                      <button
                        type="button"
                        key={r}
                        onClick={() => setRole(r)}
                        className={`flex items-center gap-3 px-3 py-2 border text-left transition-all rounded-none ${
                          active
                            ? "border-amber-500 bg-amber-500/10 text-amber-300"
                            : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"
                        }`}
                      >
                        <span className={active ? "text-amber-400" : "text-zinc-500"}>
                          {meta.icon}
                        </span>
                        <div className="flex-1">
                          <div className="text-xs font-mono-terminal uppercase tracking-wider font-bold">
                            {meta.label}
                          </div>
                        </div>
                        {active && <div className="w-2 h-2 bg-amber-500 rounded-none" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-mono-terminal text-xs uppercase tracking-wider font-bold transition-all rounded-none cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>CREANDO...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>CREAR USUARIO</span>
                  </>
                )}
              </button>
            </form>
          </section>
        )}

        {/* Lista con pestañas — 3 columnas (o 5 si no sos admin) */}
        <section className={`bg-[#121212] border border-zinc-850 p-5 ${currentRole === "admin" ? "lg:col-span-3" : "lg:col-span-5"}`}>
          {/* Tabs */}
          <div className="flex items-center gap-1 mb-4 border-b border-zinc-900 pb-0">
            <button
              onClick={() => setActiveTab("activos")}
              className={`flex items-center gap-2 px-3 py-2.5 font-mono-terminal text-xs uppercase tracking-wider transition-all border-b-2 -mb-px ${
                activeTab === "activos"
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Activos</span>
              <span className="text-[10px] text-zinc-600">({activeUsers.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("pendientes")}
              className={`flex items-center gap-2 px-3 py-2.5 font-mono-terminal text-xs uppercase tracking-wider transition-all border-b-2 -mb-px ${
                activeTab === "pendientes"
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Pendientes</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-none font-bold ${
                  pendingUsers.length > 0
                    ? "bg-amber-500 text-black"
                    : "text-zinc-600 bg-zinc-900"
                }`}
              >
                {pendingUsers.length}
              </span>
            </button>
          </div>

          {isLoading ? (
            <div className="py-10 text-center text-zinc-500 font-mono-terminal text-xs uppercase tracking-widest">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
              Sincronizando...
            </div>
          ) : activeTab === "activos" ? (
            activeUsers.length === 0 ? (
              <div className="py-10 text-center text-zinc-600 font-mono-terminal text-xs uppercase tracking-widest">
                No hay usuarios activos.
              </div>
            ) : (
              <div className="space-y-2">
                {activeUsers.map((u) => {
                  const meta = ROLE_META[u.role];
                  const isAdmin = currentRole === "admin";
                  return (
                    <div
                      key={u.id}
                      className="border border-zinc-850 bg-zinc-950 p-3 flex flex-col md:flex-row md:items-center gap-3 hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 border border-zinc-800 bg-zinc-900 flex items-center justify-center text-amber-500 font-mono-terminal font-bold rounded-none shrink-0">
                          {u.name.substring(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-white font-mono-terminal font-bold truncate flex items-center gap-2">
                            {u.name}
                            <span className="inline-flex items-center gap-1 text-[9px] text-emerald-400 font-mono-terminal uppercase tracking-widest font-normal">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                              activo
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-500 font-mono-terminal truncate">
                            @{u.username}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 border text-[10px] font-mono-terminal uppercase tracking-wider font-bold ${meta.color} rounded-none shrink-0`}
                      >
                        {meta.icon}
                        <span>{meta.label}</span>
                      </div>

                      {isAdmin ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <select
                            value={u.role}
                            onChange={(e) => handleChangeRole(u, e.target.value as UserRole)}
                            className="text-[10px] font-mono-terminal uppercase tracking-wider bg-zinc-900 border border-zinc-800 text-zinc-300 px-2 py-1.5 rounded-none cursor-pointer focus:border-amber-500"
                            title="Cambiar rol"
                          >
                            <option value="admin">Admin</option>
                            <option value="encargado">Encargado</option>
                          </select>
                          <button
                            onClick={() => handleDelete(u)}
                            className="inline-flex items-center justify-center p-1.5 border border-red-950/40 bg-red-950/10 hover:bg-red-950/30 text-red-400 hover:text-red-300 rounded-none transition-all"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleResync(u)}
                            className="inline-flex items-center justify-center p-1.5 border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-amber-400 rounded-none transition-all"
                            title="Re-sincronizar con Supabase Auth"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-[9px] text-zinc-700 font-mono-terminal uppercase tracking-widest shrink-0">
                          Solo admin
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : pendingUsers.length === 0 ? (
            <div className="py-10 text-center text-zinc-600 font-mono-terminal text-xs uppercase tracking-widest">
              <Bell className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
              No hay solicitudes pendientes.
            </div>
          ) : (
            <div className="space-y-2">
              {pendingUsers.map((u) => {
                const meta = ROLE_META[u.role];
                const isAdmin = currentRole === "admin";
                return (
                  <div
                    key={u.id}
                    className="border border-amber-500/30 bg-amber-500/5 p-3 flex flex-col md:flex-row md:items-center gap-3"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 border border-amber-500/40 bg-amber-500/10 flex items-center justify-center text-amber-400 font-mono-terminal font-bold rounded-none shrink-0">
                        {u.name.substring(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-white font-mono-terminal font-bold truncate flex items-center gap-2">
                          {u.name}
                          <span className="inline-flex items-center gap-1 text-[9px] text-amber-400 font-mono-terminal uppercase tracking-widest font-normal">
                            <Bell className="w-2.5 h-2.5" />
                            pendiente
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono-terminal truncate">
                          @{u.username} · pidió: {meta.label}
                        </div>
                      </div>
                    </div>

                    {isAdmin ? (
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Selector del rol final al aprobar (se lee en el click de Aprobar) */}
                        <select
                          defaultValue={u.role}
                          id={`role-${u.id}`}
                          className="text-[10px] font-mono-terminal uppercase tracking-wider bg-zinc-900 border border-zinc-800 text-zinc-300 px-2 py-1.5 rounded-none cursor-pointer focus:border-amber-500"
                          title="Rol final al aprobar"
                        >
                          <option value="admin">Admin</option>
                          <option value="encargado">Encargado</option>
                        </select>
                        <button
                          onClick={() => {
                            const selectEl = document.getElementById(`role-${u.id}`) as HTMLSelectElement | null;
                            const finalRole = selectEl?.value as UserRole | undefined;
                            handleApprove(u, finalRole);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-emerald-700 bg-emerald-600 hover:bg-emerald-700 text-white font-mono-terminal text-[10px] uppercase tracking-wider font-bold transition-all rounded-none"
                          title="Aprobar solicitud"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Aprobar</span>
                        </button>
                        <button
                          onClick={() => handleReject(u)}
                          className="inline-flex items-center justify-center p-1.5 border border-red-950/40 bg-red-950/10 hover:bg-red-950/30 text-red-400 hover:text-red-300 rounded-none transition-all"
                          title="Rechazar solicitud"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-[9px] text-zinc-700 font-mono-terminal uppercase tracking-widest shrink-0">
                        Solo admin
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
