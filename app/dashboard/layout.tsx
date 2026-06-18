"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase"; 

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  // ESTADOS DEL MENÚ DE NOTIFICACIONES
  const [showNotif, setShowNotif] = useState(false);
  const [activeTab, setActiveTab] = useState<"logistica" | "abastecimiento">("logistica");
  const [subFilterLogistica, setSubFilterLogistica] = useState<"pedidos" | "entregas">("pedidos");
  
  // ESTADO PARA PASAR ALERTAS (TOASTS)
  const [toast, setToast] = useState<{ mensaje: string; tipo: "success" | "info" } | null>(null);

  // DATOS
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [faltantes, setFaltantes] = useState<any[]>([]);

  useEffect(() => {
    const authData = localStorage.getItem("auth");
    if (!authData) { router.push("/login"); return; }
    try {
      const user = JSON.parse(authData);
      if (user.userRole !== "admin") router.push("/registro");
    } catch (error) { localStorage.removeItem("auth"); router.push("/login"); }
  }, [router]);

  // FUNCIÓN PARA MOSTRAR TOAST AUTOMÁTICO
  const mostrarAlerta = (mensaje: string, tipo: "success" | "info" = "success") => {
    setToast({ mensaje, tipo });
    setTimeout(() => {
      setToast(null);
    }, 3000); // Se oculta tras 3 segundos
  };

  // FETCH: CRONOGRAMA DE PROVEEDORES (LOGÍSTICA)
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
        // --- HOY ---
        if (p.dia_pedido === hoyNombre) {
          nuevasNotifs.push({ 
            id: `h-p-${p.id}`, 
            dbId: p.id,
            msg: `${p.nombre}`, 
            tag: 'HOY', 
            clase: 'pedidos', 
            tipo: 'hoy', 
            orden: 1, 
            icono: '📝', 
            color: p.color, 
            completado: p.pedido_hecho,
            link: `/registro/proveedores?proveedor=${p.nombre}` 
          });
        }
        if (p.dia_entrega === hoyNombre) {
          nuevasNotifs.push({ 
            id: `h-e-${p.id}`, 
            dbId: p.id,
            msg: `Llega: ${p.nombre}`, 
            tag: 'HOY', 
            clase: 'entregas', 
            tipo: 'hoy', 
            orden: 1, 
            icono: '🚚', 
            color: p.color, 
            completado: p.entrega_recibida,
            link: null 
          });
        }
        // --- MAÑANA ---
        if (p.dia_pedido === mañanaNombre) {
          nuevasNotifs.push({ 
            id: `m-p-${p.id}`, 
            dbId: p.id,
            msg: `${p.nombre}`, 
            tag: 'MAÑANA', 
            clase: 'pedidos', 
            tipo: 'mañana', 
            orden: 2, 
            icono: '⏳', 
            color: p.color, 
            completado: p.pedido_hecho,
            link: `/registro/proveedores?proveedor=${p.nombre}` 
          });
        }
        if (p.dia_entrega === mañanaNombre) {
          nuevasNotifs.push({ 
            id: `m-e-${p.id}`, 
            dbId: p.id,
            msg: `Entrega: ${p.nombre}`, 
            tag: 'MAÑANA', 
            clase: 'entregas', 
            tipo: 'mañana', 
            orden: 2, 
            icono: '📦', 
            color: p.color, 
            completado: p.entrega_recibida,
            link: `/registro/proveedores?proveedor=${p.nombre}` 
          });
        }
      });

      nuevasNotifs.sort((a, b) => a.orden - b.orden);
      setNotificaciones(nuevasNotifs);
    }
  };

  // FETCH OPTIMIZADO: Trae los faltantes activos o los gestionados el día de hoy
  const obtenerFaltantes = async () => {
    const { data } = await supabase
      .from("productos_abastecimiento")
      .select("*")
      .or("esta_falta.eq.true,ultima_actualizacion.gte.today")
      .order("esta_falta", { ascending: false })
      .order("id", { ascending: false });
    
    if (data) {
      setFaltantes(data);
    }
  };

  // MANEJADORES DE ACCIÓN MUTABLES CON FEEDBACK INTERNO
  const alternarPedidoHecho = async (id: number, estadoActual: boolean, nombre: string) => {
    const nuevoEstado = !estadoActual;
    const { error } = await supabase
      .from("proveedores")
      .update({ pedido_hecho: nuevoEstado })
      .eq("id", id);

    if (!error) {
      mostrarAlerta(
        nuevoEstado ? `Pedido de ${nombre} marcado listo ✓` : `Se revirtió el pedido de ${nombre} ↩`,
        nuevoEstado ? "success" : "info"
      );
      obtenerAgenda(); // Forzar refresco interno inmediato
    } else {
      console.error("Error al actualizar pedido:", error.message);
    }
  };

  const alternarEntregaRecibida = async (id: number, estadoActual: boolean, nombre: string) => {
    const nuevoEstado = !estadoActual;
    const { error } = await supabase
      .from("proveedores")
      .update({ entrega_recibida: nuevoEstado })
      .eq("id", id);

    if (!error) {
      mostrarAlerta(
        nuevoEstado ? `Entrega de ${nombre} marcada recibida ✓` : `Se revirtió la entrega de ${nombre} ↩`,
        nuevoEstado ? "success" : "info"
      );
      obtenerAgenda(); // Forzar refresco interno inmediato
    } else {
      console.error("Error al actualizar entrega:", error.message);
    }
  };

  const alternarAbastecimiento = async (id: number, estadoActual: boolean, nombre: string) => {
    const nuevoEstado = !estadoActual; // Si estaba falto (true), pasa a no falto (false)
    const { error } = await supabase
      .from("productos_abastecimiento")
      .update({ 
        esta_falta: nuevoEstado,
        ultima_actualizacion: new Date().toISOString()
      })
      .eq("id", id);

    if (!error) {
      mostrarAlerta(
        !nuevoEstado ? `${nombre} abastecido correctamente ✓` : `Se restauró ${nombre} como faltante ↩`,
        !nuevoEstado ? "success" : "info"
      );
      obtenerFaltantes(); // Forzar refresco interno inmediato
    } else {
      console.error("Error al actualizar abastecimiento:", error.message);
    }
  };

  // FORMATEADOR DE FECHAS
  const formatearFechaFalta = (isoString: string) => {
    if (!isoString) return "Desde fecha indefinida";
    const fecha = new Date(isoString);
    const opciones: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
    return `Desde el ${fecha.toLocaleDateString('es-ES', opciones)}`;
  };

  // SUSCRIPCIONES REALTIME
  useEffect(() => {
    obtenerAgenda();
    obtenerFaltantes();

    const channelProveedores = supabase
      .channel('realtime-prov')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proveedores' }, () => { obtenerAgenda(); })
      .subscribe();

    const channelFaltantes = supabase
      .channel('realtime-abast')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos_abastecimiento' }, () => { obtenerFaltantes(); })
      .subscribe();

    return () => { 
      supabase.removeChannel(channelProveedores); 
      supabase.removeChannel(channelFaltantes); 
    };
  }, []);

  // Contadores dinámicos activos
  const totalActivoLogistica = notificaciones.filter(n => !n.completado).length;
  const totalActivoFaltantes = faltantes.filter(f => f.esta_falta).length;
  const totalNotificaciones = totalActivoLogistica + totalActivoFaltantes;

  const notificacionesFiltradas = notificaciones.filter(n => n.clase === subFilterLogistica);

  const isActive = (path: string) =>
    pathname === path ? "bg-indigo-600 text-white shadow-lg scale-105" : "hover:bg-slate-800 text-slate-400";

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col md:flex-row relative">
      
      {/* COMPONENTE NOTIFICACIÓN FLOTANTE (TOAST) */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-2xl shadow-2xl text-xs font-black uppercase tracking-wide text-white border animate-in slide-in-from-bottom-5 duration-300 flex items-center gap-2 ${toast.tipo === 'success' ? 'bg-slate-900 border-emerald-500/30' : 'bg-slate-800 border-blue-500/30'}`}>
          <span>{toast.tipo === 'success' ? '⚡' : '🔄'}</span>
          {toast.mensaje}
        </div>
      )}

      {/* SIDEBAR */}
      <aside className="w-full md:w-64 bg-slate-900 text-white p-6 flex flex-col shadow-xl z-20">
        <div className="mb-10">
          <Link href="/dashboard" className="block">
            <h1 className="text-2xl font-black tracking-tighter italic">REG. <span className="text-blue-500">PAYAYA</span></h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Admin Panel</p>
          </Link>
        </div>
        <nav className="space-y-2 flex-1">
          <Link href="/dashboard/envases" className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-xs transition-all ${isActive("/dashboard/envases")}`}>🍾 CONTROL ENVASES</Link>
          <Link href="/dashboard/productos" className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-xs transition-all ${isActive("/dashboard/productos")}`}>🥨 PRODUCTOS FYS</Link>
          <Link href="/dashboard/dsobrante" className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-xs transition-all ${isActive("/dashboard/dsobrante")}`}>💵 DINERO SOBRANTE</Link>
          <Link href="/dashboard/proveedores" className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-xs transition-all ${isActive("/dashboard/proveedores")}`}>🚚 PROVEEDORES</Link>
        </nav>
        <button onClick={() => { localStorage.removeItem("auth"); router.push("/login"); }} className="mt-auto w-full bg-slate-800 text-slate-400 py-4 rounded-2xl text-[10px] font-black uppercase">Cerrar Sesión 🚪</button>
      </aside>

      {/* ÁREA DE TRABAJO */}
      <section className="flex-1 h-screen overflow-y-auto bg-slate-50 relative">
        <div className="fixed top-6 right-8 z-50">
          <div className="relative">
            
            {/* BOTÓN CAMPANA */}
            <button 
              onClick={() => setShowNotif(!showNotif)}
              className={`p-4 rounded-2xl border transition-all relative ${showNotif ? 'bg-slate-900 text-white shadow-none border-transparent' : 'bg-white text-slate-900 shadow-xl border-slate-100 hover:scale-105'}`}
            >
              <span className="text-xl">🔔</span>
              {totalNotificaciones > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-rose-600 border-2 border-white rounded-full flex items-center justify-center px-1 text-[10px] font-black text-white shadow-md">
                  {totalNotificaciones}
                </span>
              )}
            </button>

            {/* PANEL DE NOTIFICACIONES */}
            {showNotif && (
              <div className="absolute right-0 mt-4 w-96 bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 origin-top-right flex flex-col z-50">
                
                {/* PESTAÑAS PRINCIPALES */}
                <div className="bg-slate-900 p-4 pb-2 shrink-0">
                  <div className="flex bg-slate-800 p-1 rounded-xl">
                    <button 
                      onClick={() => setActiveTab("logistica")}
                      className={`flex-1 py-2 text-center text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === "logistica" ? "bg-white text-slate-900 shadow" : "text-slate-400 hover:text-white"}`}
                    >
                      🗓️ Logística ({notificaciones.length})
                    </button>
                    <button 
                      onClick={() => setActiveTab("abastecimiento")}
                      className={`flex-1 py-2 text-center text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === "abastecimiento" ? "bg-rose-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
                    >
                      ⚠️ Abastecimiento ({faltantes.length})
                    </button>
                  </div>
                </div>

                {/* SUB-FILTROS LOGÍSTICA */}
                {activeTab === "logistica" && (
                  <div className="bg-slate-900 px-4 pb-4 pt-1 flex gap-2 shrink-0">
                    <button
                      onClick={() => setSubFilterLogistica("pedidos")}
                      className={`flex-1 py-1 text-[9px] font-bold uppercase tracking-tight rounded-md border text-center transition-all ${subFilterLogistica === "pedidos" ? "bg-indigo-600 border-indigo-600 text-white font-black" : "border-slate-700 text-slate-400 hover:text-slate-200"}`}
                    >
                      📝 Pedidos ({notificaciones.filter(n => n.clase === 'pedidos').length})
                    </button>
                    <button
                      onClick={() => setSubFilterLogistica("entregas")}
                      className={`flex-1 py-1 text-[9px] font-bold uppercase tracking-tight rounded-md border text-center transition-all ${subFilterLogistica === "entregas" ? "bg-emerald-600 border-emerald-600 text-white font-black" : "border-slate-700 text-slate-400 hover:text-slate-200"}`}
                    >
                      🚚 Entregas ({notificaciones.filter(n => n.clase === 'entregas').length})
                    </button>
                  </div>
                )}

                {/* CUERPO PRINCIPAL */}
                <div className="max-h-96 overflow-y-auto bg-slate-50/50 divide-y divide-slate-100">
                  
                  {/* CONTENIDO PESTAÑA: LOGÍSTICA */}
                  {activeTab === "logistica" && (
                    notificacionesFiltradas.length === 0 ? (
                      <div className="p-10 text-center text-slate-400">
                        <p className="text-[10px] font-bold uppercase italic tracking-wider">Sin {subFilterLogistica} programados para hoy o mañana</p>
                      </div>
                    ) : (
                      notificacionesFiltradas.map((n) => {
                        const esPedido = n.clase === 'pedidos';
                        const esHoyEntrega = n.clase === 'entregas' && n.tipo === 'hoy';

                        let bgFilaColor = "bg-white hover:bg-slate-50";
                        if (n.completado) {
                          bgFilaColor = "bg-slate-100/80 opacity-60 line-through";
                        } else if (esPedido) {
                          bgFilaColor = "bg-indigo-50/70 hover:bg-indigo-100/70";
                        } else if (esHoyEntrega) {
                          bgFilaColor = "bg-emerald-50/70 border-l-4 border-emerald-500";
                        }

                        return (
                          <div key={n.id} className={`p-4 flex items-center justify-between gap-4 transition-colors ${bgFilaColor}`}>
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                              <div className={`w-1.5 h-11 rounded-full shrink-0 ${n.completado ? 'bg-slate-400' : (n.color || 'bg-slate-300')}`}></div>
                              <span className="text-xl bg-white p-2 rounded-xl shadow-sm">{n.completado ? '✅' : n.icono}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${n.completado ? 'bg-slate-200 text-slate-600' : n.tipo === 'hoy' ? 'bg-amber-100 text-amber-900' : 'bg-slate-200 text-slate-700'}`}>
                                    {n.tag}
                                  </span>
                                </div>
                                <p className={`text-xs font-black uppercase tracking-tight truncate ${n.completado ? 'text-slate-400' : n.tipo === 'hoy' ? 'text-slate-900' : 'text-slate-500'}`}>
                                  {esPedido ? `${n.msg}` : n.msg}
                                </p>
                              </div>
                            </div>

                            {/* BOTÓN REVERTIBLE */}
                            <div className="shrink-0">
                              {esPedido && (
                                <button
                                  onClick={() => alternarPedidoHecho(n.dbId, n.completado, n.msg)}
                                  className={`px-2 py-1 text-[9px] font-black uppercase rounded-lg shadow transition-all ${n.completado ? 'bg-slate-600 hover:bg-slate-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                                >
                                  {n.completado ? 'Deshacer ↩' : 'Listo ✓'}
                                </button>
                              )}
                              {n.clase === 'entregas' && (
                                <button
                                  onClick={() => alternarEntregaRecibida(n.dbId, n.completado, n.msg)}
                                  className={`px-2 py-1 text-[9px] font-black uppercase rounded-lg shadow transition-all ${n.completado ? 'bg-slate-600 hover:bg-slate-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                                >
                                  {n.completado ? 'Deshacer ↩' : 'Recibido ✓'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )
                  )}

                  {/* CONTENIDO PESTAÑA: ABASTECIMIENTO */}
                  {activeTab === "abastecimiento" && (
                    faltantes.length === 0 ? (
                      <div className="p-10 text-center text-slate-400">
                        <p className="text-[10px] font-bold uppercase italic tracking-wider">¡Todo completo! No hay quiebres de stock</p>
                      </div>
                    ) : (
                      faltantes.map((f) => {
                        const estaSurtido = !f.esta_falta;

                        let bgFilaFalta = "bg-white hover:bg-rose-50/40";
                        if (estaSurtido) {
                          bgFilaFalta = "bg-slate-100/80 opacity-60 line-through select-none";
                        }

                        return (
                          <div
                            key={f.id}
                            className={`p-4 flex items-center justify-between gap-4 transition-colors group ${bgFilaFalta}`}
                          >
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                              <div className={`w-1.5 h-11 rounded-full shrink-0 ${estaSurtido ? 'bg-slate-400' : 'bg-rose-500'}`}></div>
                              <span className="text-xl bg-rose-50 p-2 rounded-xl text-rose-600">
                                {estaSurtido ? '✅' : (f.icono || '🚨')}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-black uppercase tracking-tight truncate ${estaSurtido ? 'text-slate-400' : 'text-slate-900'}`}>
                                  {f.nombre}
                                </p>
                                <div className="flex flex-col gap-0.5 mt-1">
                                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 w-max">
                                    {f.categoria}
                                  </span>
                                  <span className={`text-[10px] font-bold italic mt-0.5 ${estaSurtido ? 'text-slate-400' : 'text-rose-600'}`}>
                                    {estaSurtido ? 'Abastecido hoy' : formatearFechaFalta(f.ultima_actualizacion)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* BOTÓN REVERTIBLE PARA ABASTECIMIENTO */}
                            <div className="shrink-0">
                              <button
                                onClick={() => alternarAbastecimiento(f.id, f.esta_falta, f.nombre)}
                                className={`px-2 py-1 text-[9px] font-black uppercase rounded-lg shadow transition-all ${estaSurtido ? 'bg-slate-600 hover:bg-slate-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'}`}
                              >
                                {estaSurtido ? 'Deshacer ↩' : 'Surtido ✓'}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )
                  )}

                </div>
              </div>
            )}
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="p-4 md:p-8 pt-24 md:pt-8">
          {children}
        </div>
      </section>
    </main>
  );
}