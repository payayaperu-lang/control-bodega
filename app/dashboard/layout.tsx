"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function dashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // 🔐 PROTECCIÓN DE RUTA Y ROL
  useEffect(() => {
    const authData = localStorage.getItem("auth");

    // 1. Si no existe sesión, al login
    if (!authData) {
      router.push("/login");
      return;
    }

    try {
      // 2. Convertimos el string de localStorage a objeto
      const user = JSON.parse(authData);

      // 3. Verificamos si es admin. Si no lo es, al área de registro
      if (user.userRole !== "admin") {
        router.push("/registro"); // Redirige a los trabajadores fuera del dashboard admin
      }
    } catch (error) {
      // Si el JSON está mal formateado, limpiamos y mandamos a login
      localStorage.removeItem("auth");
      router.push("/login");
    }
  }, [router]);

  const isActive = (path: string) =>
    pathname === path
      ? "bg-indigo-600 text-white shadow-lg scale-105"
      : "hover:bg-slate-800 text-slate-400";

  function logout() {
    localStorage.removeItem("auth");
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* SIDEBAR */}
      <aside className="w-full md:w-64 bg-slate-900 text-white p-6 flex flex-col shadow-xl z-20">
        
        <Link href="/dashboard" className="group">
          <div className="mb-10 text-center md:text-left transition-transform group-hover:scale-105">
            <h1 className="text-2xl font-black tracking-tighter">
              REG. <span className="text-blue-500">PAYAYA</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
              Panel de dashboard
            </p>
          </div>
        </Link>

        {/* MENU DE NAVEGACIÓN */}
        <nav className="space-y-2 flex-1">
          <Link
            href="/dashboard/envases"
            className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-xs transition-all ${isActive("/dashboard/envases")}`}
          >
            <span className="text-lg">🍾</span> CONTROL ENVASES
          </Link>

          <Link
            href="/dashboard/pfaltantes"
            className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-xs transition-all ${isActive("/dashboard/pfaltantes")}`}
          >
            <span className="text-lg">🍪</span> PROD. FALTANTES
          </Link>

          <Link
            href="/dashboard/psobrantes"
            className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-xs transition-all ${isActive("/dashboard/psobrantes")}`}
          >
            <span className="text-lg">🥨</span> PROD. SOBRANTE
          </Link>

          <Link
            href="/dashboard/dsobrante"
            className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-xs transition-all ${isActive("/dashboard/dsobrante")}`}
          >
            <span className="text-lg">💵</span> DINERO SOBRANTE
          </Link>
        </nav>

        {/* BOTÓN SALIR */}
        <div className="mt-auto pt-6 border-t border-white/5">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-200 py-4 rounded-2xl text-[10px] font-black transition-all uppercase"
          >
            Cerrar Turno 🚪
          </button>
          
          <div className="mt-4 p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
             <p className="text-[9px] font-bold text-slate-500 uppercase">Sesión Activa</p>
             <p className="text-xs font-bold text-indigo-400">Administrador</p>
          </div>
        </div>
      </aside>

      {/* ÁREA DE TRABAJO */}
      <section className="flex-1 h-screen overflow-y-auto bg-slate-50">
        <div className="p-4 md:p-8">
          {children}
        </div>
      </section>
    </main>
  );
}