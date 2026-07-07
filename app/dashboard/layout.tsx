"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase"; 

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

useEffect(() => {
    const authData = localStorage.getItem("auth");
    if (!authData) { router.push("/login"); return; }
    try {
      const user = JSON.parse(authData);
      if (user.userRole !== "admin") router.push("/registro");
    } catch (error) { localStorage.removeItem("auth"); router.push("/login"); }
  }, [router]);
  
  // ESTADOS DEL MENÚ
  const [showNotif, setShowNotif] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // ESTADOS GAMIFICACION
  const [xp, setXp] = useState(0);

  const getRango = (puntos: number) => {
    if (puntos < 100) return { nombre: "Aprendiz", color: "text-slate-400" };
    if (puntos < 500) return { nombre: "Bodeguero Pro", color: "text-blue-500" };
    return { nombre: "Maestro Bodeguero", color: "text-amber-500" };
  };

  const sumarXP = async (cantidad: number) => {
    setXp(prev => prev + cantidad);
  };

  // ESTADO ALERTAS (TOASTS)
  const [toast, setToast] = useState<{ mensaje: string; tipo: "success" | "info" } | null>(null);
  const [notificaciones, setNotificaciones] = useState<any[]>([]);

  useEffect(() => {
    const authData = localStorage.getItem("auth");
    if (!authData) { 
      router.push("/login"); 
      return; 
    }
  }, [router]);

  const mostrarAlerta = (mensaje: string, tipo: "success" | "info" = "success") => {
    setToast({ mensaje, tipo });
    setTimeout(() => { setToast(null); }, 3000);
  };

  const obtenerAgenda = async () => {
    const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const hoyIdx = new Date().getDay();
    const mañanaIdx = (hoyIdx + 1) % 7;

    const { data } = await supabase
      .from("proveedores")
      .select("*")
      .or(`dia_pedido.eq.${dias[hoyIdx]},dia_entrega.eq.${dias[hoyIdx]},dia_pedido.eq.${dias[mañanaIdx]},dia_entrega.eq.${dias[mañanaIdx]}`);

    if (data) {
      const nuevasNotifs: any[] = [];
      data.forEach(p => {
        if (p.dia_pedido === dias[hoyIdx]) nuevasNotifs.push({ id: `h-p-${p.id}`, dbId: p.id, msg: p.nombre, tag: 'HOY', clase: 'pedidos', icono: '📝', completado: p.pedido_hecho, link: `/registro/proveedores?proveedor=${p.nombre}` });
        if (p.dia_entrega === dias[hoyIdx]) nuevasNotifs.push({ id: `h-e-${p.id}`, dbId: p.id, msg: p.nombre, tag: 'HOY', clase: 'entregas', icono: '🚚', completado: p.entrega_recibida, link: null });
        if (p.dia_pedido === dias[mañanaIdx]) nuevasNotifs.push({ id: `m-p-${p.id}`, dbId: p.id, msg: p.nombre, tag: 'MAÑANA', clase: 'pedidos', icono: '⏳', completado: p.pedido_hecho, link: `/registro/proveedores?proveedor=${p.nombre}` });
        if (p.dia_entrega === dias[mañanaIdx]) nuevasNotifs.push({ id: `m-e-${p.id}`, dbId: p.id, msg: p.nombre, tag: 'MAÑANA', clase: 'entregas', icono: '📦', completado: p.entrega_recibida, link: `/registro/proveedores?proveedor=${p.nombre}` });
      });
      setNotificaciones(nuevasNotifs);
    }
  };

  useEffect(() => {
    obtenerAgenda();
    const channel = supabase.channel('realtime-prov').on('postgres_changes', { event: '*', schema: 'public', table: 'proveedores' }, () => { obtenerAgenda(); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const isActiveMobile = (path: string) => pathname === path ? "text-blue-600 border-b-2 border-blue-600 font-bold" : "text-slate-500 hover:bg-slate-100 rounded-lg";
  const isActiveDesktop = (path: string) => pathname === path ? "bg-indigo-600 text-white shadow-lg scale-105" : "hover:bg-slate-800 text-slate-400";

  return (
    <main className="min-h-screen bg-slate-100 flex flex-col md:flex-row relative font-sans antialiased text-slate-900">
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-2xl shadow-2xl text-xs font-black uppercase tracking-wide text-white border bg-slate-900 border-emerald-500/30 flex items-center gap-2">
          <span>⚡</span>{toast.mensaje}
        </div>
      )}

      <aside className="hidden md:flex w-64 bg-slate-900 text-white p-6 flex-col shadow-xl z-20 shrink-0">
        <div className="mb-10">
          <Link href="/dashboard" className="block">
            <h1 className="text-2xl font-black tracking-tighter italic">SYS. <span className="text-blue-500">ADMIN</span></h1>
          </Link>
        </div>
        <nav className="space-y-2 flex-1">
          <Link href="/dashboard/envases" className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-xs ${isActiveDesktop("/dashboard/envases")}`}>🍾 CONTROL ENVASES</Link>
          <Link href="/dashboard/productos" className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-xs ${isActiveDesktop("/dashboard/productos")}`}>🥨 PRODUCTOS FYS</Link>
          <Link href="/dashboard/vencimientos" className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-xs ${isActiveDesktop("/dashboard/vencimientos")}`}>📅 VENCIMIENTOS</Link>
          <Link href="/dashboard/dsobrante" className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-xs ${isActiveDesktop("/dashboard/dsobrante")}`}>💵 DINERO SOBRANTE</Link>
          <Link href="/dashboard/proveedores/pedidos" className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-xs ${isActiveDesktop("/dashboard/proveedores/pedidos")}`}>🚚 PEDIDOS</Link>
          <Link href="/dashboard/proveedores" className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-xs ${isActiveDesktop("/dashboard/proveedores")}`}>🚚 ADMIN PROVEEDORES</Link>
          <Link href="/dashboard/horarios" className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-xs ${isActiveDesktop("/dashboard/horarios")}`}>🕰️ HORARIOS ADMIN</Link>
        </nav>
        <button onClick={() => { localStorage.removeItem("auth"); router.push("/login"); }} className="mt-auto w-full bg-slate-800 text-slate-400 py-4 rounded-2xl text-[10px] font-black uppercase">Cerrar Sesión 🚪</button>
      </aside>

      <section className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 py-2.5 flex flex-col shadow-sm">
          <div className="flex items-center justify-between w-full">
            <Link href="/dashboard" className="text-2xl font-black tracking-tighter italic"><span className="text-blue-500">PAYAYA ADMIN</span></Link>
            <div className="flex items-center gap-2">
              <Link href="/dashboard" className="block">
              <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs rounded-full flex items-center justify-center">PA</div>
              </Link>
            </div>
          </div>

          <nav className="md:hidden flex justify-around items-center w-full mt-3 border-t pt-1.5">
            <Link title="ENVASES" href="/dashboard/envases" className={`flex-1 flex justify-center py-2 ${isActiveMobile("/registro/envases")}`}>
              🍾
            </Link>
            <Link title="DINERO" href="/dashboard/dsobrante" className={`flex-1 flex justify-center py-2 ${isActiveMobile("/registro/dsobrante")}`}>
              💵  
            </Link>
            <Link title="PRODUCTOS" href="/dashboard/productos" className={`flex-1 flex justify-center py-2 ${isActiveMobile("/registro/productos")}`}>
              🥨
            </Link>
            <Link title="VENCIMIENTOS" href="/dashboard/vencimientos" className={`flex-1 flex justify-center py-2 ${isActiveMobile("/registro/vencimientos")}`}>
              📅  
            </Link>
            <Link title="PROVEEDORES" href="/dashboard/proveedores/pedidos" className={`flex-1 flex justify-center py-2 ${isActiveMobile("/registro/proveedores")}`}>
              🚚
            </Link>
            <Link title="HORARIOS" href="/dashboard/horarios" className={`flex-1 flex justify-center py-2 ${isActiveMobile("/registro/horarios")}`}>
              🕰️ 
            </Link>
            <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="flex-1 flex justify-center py-2"><svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"></path></svg></button>
          </nav>
        </header>

        {showMobileMenu && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 md:hidden" onClick={() => setShowMobileMenu(false)}>
            <div className="absolute right-0 w-72 h-full bg-white p-5 flex flex-col justify-between">
              <nav className="flex flex-col gap-2">
                <Link href="/dashboard/envases" className="p-3 bg-slate-50 rounded-xl text-xs font-bold">🍾 Control Envases</Link>
                <Link href="/dashboard/dsobrante" className="p-3 bg-slate-50 rounded-xl text-xs font-bold">💵 Dinero Sobrante</Link>
                <Link href="/dashboard/productos" className="p-3 bg-slate-50 rounded-xl text-xs font-bold">🥨 Productos FYS</Link>
                <Link href="/dashboard/vencimientos" className="p-3 bg-slate-50 rounded-xl text-xs font-bold">📅 Vencimientos</Link>
                <Link href="/dashboard/proveedores/pedidos" className="p-3 bg-slate-50 rounded-xl text-xs font-bold">🚚 Pedidos</Link>
                <Link href="/dashboard/proveedores" className="p-3 bg-slate-50 rounded-xl text-xs font-bold">🚚 Proveedores Admin</Link>
                <Link href="/dashboard/horarios" className="p-3 bg-slate-50 rounded-xl text-xs font-bold">🕰️ Horarios Admin</Link>

              </nav>
              <button onClick={() => { localStorage.removeItem("auth"); router.push("/login"); }} className="w-full bg-slate-900 text-white py-3 rounded-xl text-xs font-black">Cerrar Sesión 🚪</button>
            </div>
          </div>
        )}

        {showNotif && (
          <div className="absolute right-4 top-16 w-80 bg-white rounded-2xl shadow-xl border p-4 z-50">
            <h3 className="text-xs font-black uppercase text-slate-400 mb-2">Logística</h3>
            {notificaciones.map(n => (
              <div key={n.id} className="p-2 border-b text-xs font-bold text-slate-700">{n.msg}</div>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-8">{children}</div>
      </section>
    </main>
  );
}