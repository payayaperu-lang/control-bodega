"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem("auth");
    const role = localStorage.getItem("userRole");

    if (auth && role) {
      // Redirección inteligente si ya está logueado
      if (role === "admin") router.replace("/dashboard");
      else router.replace("/registro"); // Ajusta esta ruta según tu archivo de Registro
    }
  }, [router]);

  const manejarLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    setCargando(true);

    // Simulación de carga para realismo
    setTimeout(() => {
      let userRole = "";
      let userName = "";
      let destiny = "";

      if (usuario.toLowerCase() === "admin" && password === "1234") {
        userRole = "admin";
        userName = "Administrador";
        destiny = "/dashboard";
      } else if (usuario.toLowerCase() === "cajero" && password === "5678") {
        userRole = "cajero";
        userName = "Cajero";
        destiny = "/registro"; // Cambia "/Registro" por la ruta exacta de tu página de Registro
      }

      if (userRole) {
        localStorage.setItem("auth", "true");
        localStorage.setItem("userRole", userRole);
        localStorage.setItem("userName", userName);
        router.replace(destiny);
      } else {
        setError(true);
        setCargando(false);
      }
    }, 800);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      {/* Decoración de fondo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[120px] opacity-50"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-[120px] opacity-50"></div>

      <div className="w-full max-w-md relative">
        <form
          onSubmit={manejarLogin}
          className="bg-white p-10 rounded-[3.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 relative z-10"
        >
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-block bg-blue-600 text-white p-4 rounded-3xl mb-4 shadow-lg shadow-blue-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.5em] mb-2">Acceso Protegido</h2>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">
              SYS<span className="text-blue-600">.PAYAYA</span>
            </h1>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest ml-1">Usuario</label>
              <input
                autoFocus
                type="text"
                placeholder="USUARIO..."
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className={`w-full border-2 p-4 rounded-2xl text-sm font-black text-slate-900 outline-none transition-all uppercase ${
                  error ? "border-red-200 bg-red-50 focus:border-red-500" : "border-slate-100 bg-slate-50 focus:border-blue-600 focus:bg-white"
                }`}
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest ml-1">Contraseña</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full border-2 p-4 rounded-2xl text-sm font-black text-slate-900 outline-none transition-all ${
                  error ? "border-red-200 bg-red-50 focus:border-red-500" : "border-slate-100 bg-slate-50 focus:border-blue-600 focus:bg-white"
                }`}
              />
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-[10px] font-black uppercase tracking-wider mt-4 text-center animate-bounce">
              ⚠️ Datos incorrectos
            </p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className={`w-full mt-8 bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl uppercase text-xs tracking-widest border-b-4 border-slate-700 active:border-b-0 transition-all flex items-center justify-center gap-2 ${
              cargando ? "opacity-70 cursor-not-allowed" : "hover:bg-blue-600 hover:border-blue-800"
            }`}
          >
            {cargando ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              "INICIAR SESIÓN"
            )}
          </button>

          
        </form>

        <p className="text-center mt-8 text-slate-400 text-[10px] font-black uppercase tracking-widest">
          Sistema de Control &copy; 2026
        </p>
      </div>
    </main>
  );
}