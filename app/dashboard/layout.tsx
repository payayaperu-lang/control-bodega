"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase"; 

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [showNotif, setShowNotif] = useState(false);
  const [notificaciones, setNotificaciones] = useState<any[]>([]);

  useEffect(() => {
    const authData = localStorage.getItem("auth");
    if (!authData) { router.push("/login"); return; }
    try {
      const user = JSON.parse(authData);
      if (user.userRole !== "admin") router.push("/registro");
    } catch (error) { localStorage.removeItem("auth"); router.push("/login"); }
  }, [router]);

  const obtenerAgenda = async () => {
    const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const fechaActual = new Date();
    const hoyIdx = fechaActual.getDay();
    const mañanaIdx = (hoyIdx + 1) % 7;

    const hoyNombre = dias[hoyIdx];
    const mañanaNombre = dias[mañanaIdx];

    const { data } = await supabase
      .from("proveedores")
      .select("*")
      .or(`dia_pedido.eq.${hoyNombre},dia_entrega.eq.${hoyNombre},dia_pedido.eq.${mañanaNombre},dia_entrega.eq.${mañanaNombre}`);

    if (data) {
      const nuevasNotifs: any[] = [];
      data.forEach(p => {
        // HOY
        if (p.dia_pedido === hoyNombre) {
          nuevasNotifs.push({ id: `h-p-${p.id}`, msg: `HOY: Nota a ${p.nombre}`, tipo: 'hoy', icono: '🚨', color: p.color, link: `/dashboard/proveedores?proveedor=${p.nombre}` });
        }
        if (p.dia_entrega === hoyNombre) {
          nuevasNotifs.push({ id: `h-e-${p.id}`, msg: `HOY: Llega ${p.nombre}`, tipo: 'hoy', icono: '🚚', color: p.color, link: `/dashboard/proveedores?proveedor=${p.nombre}` });
        }
        // MAÑANA
        if (p.dia_pedido === mañanaNombre) {
          nuevasNotifs.push({ id: `m-p-${p.id}`, msg: `MAÑANA: Nota ${p.nombre}`, tipo: 'mañana', icono: '⏳', color: p.color, link: `/dashboard/proveedores?proveedor=${p.nombre}` });
        }
        if (p.dia_entrega === mañanaNombre) {
          nuevasNotifs.push({ id: `m-e-${p.id}`, msg: `MAÑANA: Llega ${p.nombre}`, tipo: 'mañana', icono: '📦', color: p.color, link: `/dashboard/proveedores?proveedor=${p.nombre}` });
        }
      });
      setNotificaciones(nuevasNotifs);
    }
  };

  useEffect(() => {
    obtenerAgenda();
    const channel = supabase
      .channel('logistica-v3')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proveedores' }, () => {
        obtenerAgenda();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const isActive = (path: string) =>
    pathname === path ? "bg-indigo-600 text-white shadow-lg scale-105" : "hover:bg-slate-800 text-slate-400";

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* SIDEBAR */}
      <aside className="w-full md:w-64 bg-slate-900 text-white p-6 flex flex-col shadow-xl z-20">
        <div className="mb-10">
          <Link href="/dashboard/" className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-xs transition-all ${isActive("/dashboard/envases")}`}>
          <h1 className="text-2xl font-black tracking-tighter italic">REG. <span className="text-blue-500">PAYAYA</span></h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Admin Panel</p>
          </Link>
        </div>
        <nav className="space-y-2 flex-1">
          <Link href="/dashboard/envases" className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-xs transition-all ${isActive("/dashboard/envases")}`}>🍾 CONTROL ENVASES</Link>
          <Link href="/dashboard/pfaltantes" className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-xs transition-all ${isActive("/dashboard/pfaltantes")}`}>🍪 PROD. FALTANTES</Link>
          <Link href="/dashboard/psobrantes" className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-xs transition-all ${isActive("/dashboard/psobrantes")}`}>🥨 PROD. SOBRANTE</Link>
          <Link href="/dashboard/dsobrante" className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-xs transition-all ${isActive("/dashboard/dsobrante")}`}>💵 DINERO SOBRANTE</Link>
          <Link href="/dashboard/proveedores" className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-xs transition-all ${isActive("/dashboard/proveedores")}`}>🚚 GESTIÓN PROVEEDORES</Link>
          <Link href="/dashboard/abastecimiento" className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-xs transition-all ${isActive("/dashboard/abastecimiento")}`}>🚚 ABASTECIMIENTO</Link>
        </nav>
        <button onClick={() => { localStorage.removeItem("auth"); router.push("/login"); }} className="mt-auto w-full bg-slate-800 text-slate-400 py-4 rounded-2xl text-[10px] font-black uppercase">Cerrar Sesión 🚪</button>
      </aside>

      {/* ÁREA DE TRABAJO */}
      <section className="flex-1 h-screen overflow-y-auto bg-slate-50 relative">
        <div className="fixed top-6 right-8 z-50">
          <div className="relative">
            <button 
              onClick={() => setShowNotif(!showNotif)}
              className={`p-4 rounded-2xl border transition-all ${showNotif ? 'bg-slate-900 text-white shadow-none' : 'bg-white text-slate-900 shadow-xl border-slate-100'}`}
            >
              <span className="text-xl">🔔</span>
              {notificaciones.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-black text-white">
                  {notificaciones.length}
                </span>
              )}
            </button>

            {showNotif && (
              <div className="absolute right-0 mt-4 w-80 bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 origin-top-right">
                <div className="bg-slate-900 p-5">
                  <h4 className="text-[10px] font-black text-white uppercase tracking-widest text-center italic">Hoja de Ruta Logística</h4>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notificaciones.length === 0 ? (
                    <div className="p-10 text-center text-slate-300">
                      <p className="text-[10px] font-bold uppercase italic">Sin tareas próximas</p>
                    </div>
                  ) : (
                    notificaciones.map((n) => (
                      <Link 
                        key={n.id} 
                        href={n.link}
                        onClick={() => setShowNotif(false)}
                        className={`p-4 border-b border-slate-50 flex items-center gap-4 transition-colors hover:bg-slate-50 ${n.tipo === 'hoy' ? 'bg-indigo-50/20' : ''}`}
                      >
                        <div className={`w-1.5 h-10 rounded-full shrink-0 ${n.color}`}></div>
                        <span className="text-lg shrink-0">{n.icono}</span>
                        <div className="flex flex-col">
                           <p className={`text-[11px] font-black uppercase leading-tight ${n.tipo === 'hoy' ? 'text-slate-900' : 'text-slate-400'}`}>
                            {n.msg}
                           </p>
                           <span className="text-[8px] font-bold text-indigo-600 uppercase mt-1">
                             {n.tipo === 'hoy' ? '● Ir a proveedores' : 'Ver agenda'}
                           </span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 md:p-8 pt-24 md:pt-8">
          {children}
        </div>
      </section>
    </main>
  );
}