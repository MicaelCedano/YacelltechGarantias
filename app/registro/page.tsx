"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerUser } from "@/app/actions";
import { Terminal, ShieldAlert, KeyRound, User, AtSign, UserPlus, ArrowLeft, Shield, Wrench, HardHat, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import type { UserRole } from "@/lib/usersDb";

const ROLE_META: Record<UserRole, { label: string; icon: React.ReactNode; description: string; color: string }> = {
  admin: {
    label: "Administrador",
    icon: <Shield className="w-3.5 h-3.5" />,
    description: "Control total del sistema",
    color: "border-red-500/30 text-red-300",
  },
  soporte: {
    label: "Soporte Técnico",
    icon: <Wrench className="w-3.5 h-3.5" />,
    description: "Técnico especializado",
    color: "border-blue-500/30 text-blue-300",
  },
  taller: {
    label: "Encargado de Taller",
    icon: <HardHat className="w-3.5 h-3.5" />,
    description: "Encargado de taller",
    color: "border-amber-500/30 text-amber-300",
  },
};

export default function RegistroPage() {
  const router = useRouter();

  // form
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserRole>("taller");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Enviando solicitud...");

    try {
      const res = await registerUser({ username, password, name, role });
      if (!res.success) throw new Error(res.error || "No se pudo enviar la solicitud.");
      setIsSuccess(true);
      toast.success("Solicitud enviada. Espera la aprobación del administrador.", { id: toastId });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al registrar";
      toast.error(message, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4 min-h-screen">
      <div className="w-full max-w-md bg-[#121212] border border-zinc-850 p-6 md:p-8 shadow-2xl relative">

        {/* Cabecera */}
        <div className="flex items-center gap-3 mb-6 border-b border-zinc-900 pb-4">
          <div className="bg-amber-500 text-black p-2 border border-amber-600 rounded-none">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-mono-terminal tracking-wider text-white">
              CREAR CUENTA
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono-terminal uppercase tracking-widest">
              SOLICITUD DE ACCESO AL TALLER
            </p>
          </div>
        </div>

        {isSuccess ? (
          // PANTALLA DE ÉXITO
          <div className="py-6 text-center">
            <div className="w-16 h-16 mx-auto bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center rounded-none mb-4">
              <CheckCircle2 className="w-9 h-9 text-emerald-400" />
            </div>
            <h2 className="text-base font-bold text-emerald-300 font-mono-terminal uppercase tracking-wider mb-2">
              Solicitud Enviada
            </h2>
            <p className="text-xs text-zinc-400 font-mono-terminal leading-relaxed mb-5">
              Tu cuenta <b>@{username}</b> fue creada y está <b>pendiente de aprobación</b> por el administrador. Te avisaremos cuando esté activa para que puedas iniciar sesión.
            </p>
            <Link
              href="/login"
              className="w-full h-11 border border-amber-500 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-mono-terminal text-xs uppercase tracking-wider font-bold transition-all rounded-none cursor-pointer flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al Login</span>
            </Link>
          </div>
        ) : (
          // FORMULARIO
          <>
            <form onSubmit={handleRegister} className="space-y-4">

              {/* Nombre */}
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-zinc-400 font-mono-terminal uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-zinc-500" />
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. María Pérez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-zinc-950 border border-zinc-800 text-white rounded-none focus:border-amber-500"
                  disabled={isSubmitting}
                />
              </div>

              {/* Usuario */}
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-zinc-400 font-mono-terminal uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <AtSign className="w-4 h-4 text-zinc-500" />
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
                  className="w-full px-3 py-2.5 text-sm bg-zinc-950 border border-zinc-800 text-white rounded-none focus:border-amber-500 font-mono-terminal"
                  disabled={isSubmitting}
                />
              </div>

              {/* Contraseña */}
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-zinc-400 font-mono-terminal uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-zinc-500" />
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={3}
                    placeholder="mínimo 3 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2.5 pr-10 text-sm bg-zinc-950 border border-zinc-800 text-white rounded-none focus:border-amber-500 font-mono-terminal"
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

              {/* Confirmar contraseña */}
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-zinc-400 font-mono-terminal uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-zinc-500" />
                  Confirmar Contraseña
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={3}
                  placeholder="repetir contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-zinc-950 border border-zinc-800 text-white rounded-none focus:border-amber-500 font-mono-terminal"
                  disabled={isSubmitting}
                />
              </div>

              {/* Rol */}
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-zinc-400 font-mono-terminal uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-zinc-500" />
                  Rol Solicitado
                </label>
                <div className="grid grid-cols-1 gap-1.5">
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
                            : `border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700`
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
                            {meta.description}
                          </div>
                        </div>
                        {active && <div className="w-2 h-2 bg-amber-500 rounded-none" />}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[9px] text-zinc-600 font-mono-terminal mt-1.5 leading-relaxed">
                  El administrador puede ajustar el rol final al aprobar tu solicitud.
                </p>
              </div>

              {/* Aviso de aprobación */}
              <div className="flex items-start gap-2.5 p-3 bg-amber-500/5 border border-amber-500/20 text-[10px] text-amber-500 font-mono-terminal leading-relaxed uppercase select-none">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                <span>
                  Tu cuenta quedará <b>pendiente de aprobación</b> por el administrador. No podrás iniciar sesión hasta que sea aprobada.
                </span>
              </div>

              {/* Botón Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-mono-terminal text-xs uppercase tracking-wider font-bold transition-all rounded-none cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>ENVIANDO SOLICITUD...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>SOLICITAR ACCESO</span>
                  </>
                )}
              </button>
            </form>

            {/* Separador */}
            <div className="my-5 flex items-center gap-3">
              <div className="flex-1 h-px bg-zinc-900" />
              <span className="text-[9px] text-zinc-700 font-mono-terminal uppercase tracking-widest">o</span>
              <div className="flex-1 h-px bg-zinc-900" />
            </div>

            <Link
              href="/login"
              className="w-full h-10 border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-amber-500 font-mono-terminal text-xs uppercase tracking-wider transition-all rounded-none cursor-pointer flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Ya tengo cuenta</span>
            </Link>
          </>
        )}
      </div>

      <footer className="text-center text-[9px] text-zinc-700 font-mono-terminal uppercase tracking-widest mt-6">
        YACELLTECH SECURE GATEWAY &copy; 2026.
      </footer>
    </main>
  );
}
