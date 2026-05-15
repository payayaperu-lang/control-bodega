"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase"; // Verifica que la ruta a tu cliente de supabase sea correcta

export default function RegistroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [showNotif, setShowNotif] = useState(false);
  const [notificaciones, setNotificaciones] = useState<any[]>([]);

  // --- LÓGICA DE PROTECCIÓN ---
  useEffect(() => {
    const auth = localStorage.getItem("auth");
    if (!auth) {
      router.push("/login");
    }
  }, [router]);

  // --- LÓGICA DE NOTIFICACIONES REALES (Igual que Admin) ---
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
          nuevasNotifs.push({ id: `h-p-${p.id}`, msg: `HOY: Nota a ${p.nombre}`, tipo: 'hoy', icono: '🚨', color: p.color });
        }
        if (p.dia_entrega === hoyNombre) {
          nuevasNotifs.push({ id: `h-e-${p.id}`, msg: `HOY: Llega ${p.nombre}`, tipo: 'hoy', icono: '🚚', color: p.color });
        }
        // MAÑANA
        if (p.dia_pedido === mañanaNombre) {
          nuevasNotifs.push({ id: `m-p-${p.id}`, msg: `MAÑANA: Nota ${p.nombre}`, tipo: 'mañana', icono: '⏳', color: p.color });
        }
        if (p.dia_entrega === mañanaNombre) {
          nuevasNotifs.push({ id: `m-e-${p.id}`, msg: `MAÑANA: Llega ${p.nombre}`, tipo: 'mañana', icono: '📦', color: p.color });
        }
      });
      setNotificaciones(nuevasNotifs);
    }
  };

  useEffect(() => {
    obtenerAgenda();
    const channel = supabase
      .channel('registro-logistica')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proveedores' }, () => {
        obtenerAgenda();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

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
        <Link href="/registro" className="group">
          <div className="mb-10 text-center md:text-left transition-transform group-hover:scale-105">
            <h1 className="text-2xl font-black tracking-tighter italic">
              REG. <span className="text-blue-500">PAYAYA</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
              Panel de Registro
            </p>
          </div>
        </Link>

        <nav className="space-y-2 flex-1">
          <Link href="/registro/envases" className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-xs transition-all ${isActive("/registro/envases")}`}>
            <span className="text-lg">🍾</span> CONTROL ENVASES
          </Link>
          
          <Link href="/registro/pfaltantes" className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-xs transition-all ${isActive("/registro/pfaltantes")}`}>
            <span className="text-lg">🍪</span> PROD. FALTANTES
          </Link>
          <Link href="/registro/psobrantes" className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-xs transition-all ${isActive("/registro/psobrantes")}`}>
            <span className="text-lg">🥨</span> PROD. SOBRANTE
          </Link>
          <Link href="/registro/dsobrantes" className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-xs transition-all ${isActive("/registro/dsobrantes")}`}>
            <span className="text-lg">💵</span> DINERO SOBRANTE
          </Link>
          <Link href="/registro/proveedores" className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-xs transition-all ${isActive("/registro/proveedores")}`}>
            <span className="text-lg">🚚</span> PROVEEDORES
          </Link>
        </nav>

        <div className="mt-auto pt-6 border-t border-white/5">
          <button onClick={logout} className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-200 py-4 rounded-2xl text-[10px] font-black transition-all uppercase">
            Cerrar Turno 🚪
          </button>
        </div>
      </aside>

      {/* ÁREA DE TRABAJO */}
      <section className="flex-1 h-screen overflow-y-auto bg-slate-50 relative pb-20">
        
        {/* CAMPANA FLOTANTE ACTUALIZADA */}
        <div className="fixed top-6 right-8 z-50">
          <div className="relative">
            <button 
              onClick={() => setShowNotif(!showNotif)}
              className={`p-4 rounded-2xl shadow-2xl transition-all border ${showNotif ? 'bg-slate-900 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-100 hover:scale-105'}`}
            >
              <span className="text-xl">🔔</span>
              {notificaciones.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-black text-white">
                  {notificaciones.length}
                </span>
              )}
            </button>

            {/* PANEL DESPLEGABLE */}
            {showNotif && (
              <div className="absolute right-0 mt-4 w-80 bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 origin-top-right">
                <div className="bg-slate-900 p-5">
                  <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] text-center italic">Hoja de Ruta de Turno</h3>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {notificaciones.length === 0 ? (
                    <div className="p-10 text-center text-slate-300">
                      <p className="text-[10px] font-bold uppercase italic text-center">No hay pendientes<br/>próximos</p>
                    </div>
                  ) : (
                    notificaciones.map((n) => (
                      <Link 
                        key={n.id} 
                        href={`/registro/proveedores?proveedor=${n.msg.split(' ').pop()}`} // Extrae el nombre del final del msg
                        onClick={() => setShowNotif(false)}
                        className={`p-4 border-b border-slate-50 flex items-center gap-4 transition-colors hover:bg-slate-50 ${n.tipo === 'hoy' ? 'bg-indigo-50/30' : ''}`}
                      >
                        {/* BARRA COLOR */}
                        <div className={`w-1.5 h-10 rounded-full shrink-0 ${n.color}`}></div>
                        
                        {/* ICONO */}
                        <span className="text-lg shrink-0">{n.icono}</span>
                        
                        {/* TEXTO */}
                        <div className="flex flex-col">
                           <p className={`text-[11px] font-black uppercase leading-tight ${n.tipo === 'hoy' ? 'text-slate-900' : 'text-slate-400'}`}>
                            {n.msg}
                           </p>
                           <span className="text-[8px] font-bold text-indigo-600 uppercase mt-1">
                             {n.tipo === 'hoy' ? '● Toca hoy' : 'Para mañana'}
                           </span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
                <Link 
                  href="/registro/proveedores" 
                  onClick={() => setShowNotif(false)}
                  className="block text-center p-5 text-[9px] font-black bg-slate-50 text-slate-900 hover:bg-slate-900 hover:text-white transition-all uppercase tracking-widest"
                >
                  Ver todos los proveedores
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 md:p-8">
          {children}
        </div>
      </section>
    </main>
  );
}