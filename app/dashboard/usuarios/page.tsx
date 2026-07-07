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
  HardHat,
  KeyRound,
  Eye,
  EyeOff,
  RefreshCw,
  AtSign,
  User as UserIcon,
} from "lucide-react";
import { Header } from "@/components/Header";
import { createUser, removeUser, changeUserRole } from "@/app/actions";
import { getCurrentRole } from "@/app/actions";
import type { UserRole } from "@/lib/usersDb";

interface UserRow {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

const ROLE_META: Record<UserRole, { label: string; color: string; icon: React.ReactNode }> = {
  admin: {
    label: "Administrador",
    color: "text-red-400 border-red-500/30 bg-red-500/10",
    icon: <Shield className="w-3.5 h-3.5" />,
  },
  soporte: {
    label: "Soporte Técnico",
    color: "text-blue-400 border-blue-500/30 bg-blue-500/10",
    icon: <Wrench className="w-3.5 h-3.5" />,
  },
  taller: {
    label: "Encargado de Taller",
    color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    icon: <HardHat className="w-3.5 h-3.5" />,
  },
};

export default function UsuariosPage() {
  const router = useRouter();
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // form
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("taller");
  const [showPassword, setShowPassword] = useState(false);

  // Cargar rol y lista
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
      toast.success(`Usuario ${name} creado con rol ${ROLE_META[role].label}.`, { id: toastId });
      // Reset
      setUsername("");
      setName("");
      setPassword("");
      setRole("taller");
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
      `¿Eliminar al usuario ${user.name} (${user.username})? Esta acción no se puede deshacer.`
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

  // Si no hay rol válido, no mostrar la página
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
              Solo personal autorizado puede crear cuentas en el sistema
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

      {/* Aviso de permisos según rol */}
      <div
        className={`mb-6 p-3 border font-mono-terminal text-[10px] uppercase tracking-wider leading-relaxed ${
          currentRole === "admin"
            ? "border-red-500/20 bg-red-500/5 text-red-300"
            : "border-amber-500/20 bg-amber-500/5 text-amber-300"
        }`}
      >
        {currentRole === "admin" ? (
          <span>
            <Shield className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
            Eres <b>Administrador</b>: puedes crear, eliminar y cambiar el rol de cualquier usuario.
          </span>
        ) : (
          <span>
            <Shield className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
            Tu rol actual (<b>{currentRole ? ROLE_META[currentRole].label : ""}</b>) permite
            <b> crear usuarios</b>, pero solo el administrador puede borrarlos o cambiar su rol.
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Formulario de alta — 2 columnas */}
        <section className="lg:col-span-2 bg-[#121212] border border-zinc-850 p-5">
          <div className="flex items-center gap-2 mb-4 border-b border-zinc-900 pb-3">
            <UserPlus className="w-5 h-5 text-amber-500" />
            <h2 className="text-sm font-bold font-mono-terminal uppercase tracking-wider text-white">
              Crear Usuario
            </h2>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            {/* Nombre */}
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

            {/* Usuario de acceso (sin correo electronico) */}
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

            {/* Password */}
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

            {/* Rol */}
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
                      className={`flex items-center gap-3 px-3 py-2.5 border text-left transition-all rounded-none ${
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
                        <div className="text-[9px] text-zinc-500 font-mono-terminal normal-case tracking-normal">
                          {r === "admin"
                            ? "Control total del sistema"
                            : r === "soporte"
                            ? "Técnico especializado"
                            : "Encargado de taller"}
                        </div>
                      </div>
                      {active && (
                        <div className="w-2 h-2 bg-amber-500 rounded-none" />
                      )}
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
                  <span>CREANDO USUARIO...</span>
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

        {/* Lista — 3 columnas */}
        <section className="lg:col-span-3 bg-[#121212] border border-zinc-850 p-5">
          <div className="flex items-center justify-between gap-3 mb-4 border-b border-zinc-900 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              <h2 className="text-sm font-bold font-mono-terminal uppercase tracking-wider text-white">
                Usuarios Registrados
              </h2>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono-terminal uppercase tracking-widest">
              {users.length} {users.length === 1 ? "cuenta" : "cuentas"}
            </span>
          </div>

          {isLoading ? (
            <div className="py-10 text-center text-zinc-500 font-mono-terminal text-xs uppercase tracking-widest">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
              Sincronizando...
            </div>
          ) : users.length === 0 ? (
            <div className="py-10 text-center text-zinc-600 font-mono-terminal text-xs uppercase tracking-widest">
              No hay usuarios registrados.
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((u) => {
                const meta = ROLE_META[u.role];
                const isAdmin = currentRole === "admin";
                return (
                  <div
                    key={u.id}
                    className="border border-zinc-850 bg-zinc-950 p-3 flex flex-col md:flex-row md:items-center gap-3 hover:border-zinc-700 transition-colors"
                  >
                    {/* Avatar + datos */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 border border-zinc-800 bg-zinc-900 flex items-center justify-center text-amber-500 font-mono-terminal font-bold rounded-none shrink-0">
                        {u.name.substring(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-white font-mono-terminal font-bold truncate">
                          {u.name}
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono-terminal truncate">
                          @{u.username}
                        </div>
                      </div>
                    </div>

                    {/* Rol badge */}
                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 border text-[10px] font-mono-terminal uppercase tracking-wider font-bold ${meta.color} rounded-none shrink-0`}
                    >
                      {meta.icon}
                      <span>{meta.label}</span>
                    </div>

                    {/* Acciones admin-only */}
                    {isAdmin ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <select
                          value={u.role}
                          onChange={(e) => handleChangeRole(u, e.target.value as UserRole)}
                          className="text-[10px] font-mono-terminal uppercase tracking-wider bg-zinc-900 border border-zinc-800 text-zinc-300 px-2 py-1.5 rounded-none cursor-pointer focus:border-amber-500"
                          title="Cambiar rol"
                        >
                          <option value="admin">Admin</option>
                          <option value="soporte">Soporte</option>
                          <option value="taller">Taller</option>
                        </select>
                        <button
                          onClick={() => handleDelete(u)}
                          className="inline-flex items-center justify-center p-1.5 border border-red-950/40 bg-red-950/10 hover:bg-red-950/30 text-red-400 hover:text-red-300 rounded-none transition-all"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
