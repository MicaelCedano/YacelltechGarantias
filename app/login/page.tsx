"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "../actions";
import { Terminal, ShieldAlert, Key, Mail } from "lucide-react";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error("Por favor, ingrese el correo y la contraseña.");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Autenticando credenciales de acceso...");

    try {
      const response = await loginUser(email, password);

      if (!response.success) {
        throw new Error(response.error || "Acceso denegado.");
      }

      toast.success("Credenciales validadas. Redirigiendo...", { id: toastId });
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Fallo la conexión con el servidor de seguridad";
      toast.error(message, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4 min-h-screen">
      <div className="w-full max-w-md bg-[#121212] border border-zinc-850 p-6 md:p-8 shadow-2xl relative">
        
        {/* Cabecera estilo Consola */}
        <div className="flex items-center gap-3 mb-6 border-b border-zinc-900 pb-4">
          <div className="bg-amber-500 text-black p-2 border border-amber-600 rounded-none">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-mono-terminal tracking-wider text-white">
              YACELLTECH
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono-terminal uppercase tracking-widest">
              AUTENTICACIÓN DE SEGURIDAD
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          
          {/* Email o Usuario */}
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-zinc-400 font-mono-terminal uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-zinc-500" />
              Email o Usuario
            </label>
            <input
              type="text"
              required
              placeholder="ej. admin o admin@yacelltech.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-zinc-950 border border-zinc-800 text-white rounded-none focus:border-amber-500"
              disabled={isSubmitting}
            />
          </div>

          {/* Password */}
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-zinc-400 font-mono-terminal uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-zinc-500" />
              Contraseña de Acceso
            </label>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-zinc-950 border border-zinc-800 text-white rounded-none font-mono-terminal focus:border-amber-500"
              disabled={isSubmitting}
            />
          </div>

          {/* Advertencia Utilitaria */}
          <div className="flex items-start gap-2.5 p-3 bg-amber-500/5 border border-amber-500/20 text-[10px] text-amber-500 font-mono-terminal leading-relaxed uppercase select-none">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            <span>
              Acceso restringido únicamente a personal técnico y administrativo autorizado de YacellTech.
            </span>
          </div>

          {/* Botón Ingresar */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-800 disabled:text-zinc-650 text-black font-mono-terminal text-xs uppercase tracking-wider font-bold transition-all rounded-none cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                <span>VERIFICANDO ACCESO...</span>
              </>
            ) : (
              <span>INGRESAR AL TALLER</span>
            )}
          </button>
        </form>
      </div>

      <footer className="text-center text-[9px] text-zinc-700 font-mono-terminal uppercase tracking-widest mt-6">
        YACELLTECH SECURE GATEWAY &copy; 2026.
      </footer>
    </main>
  );
}
