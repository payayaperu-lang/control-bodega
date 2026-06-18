"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase"; 

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  // ESTADOS DEL MENÚ DE NOTIFICACIONES Y DIALOGOS
  const [showNotif, setShowNotif] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<"logistica" | "abastecimiento">("logistica");
  const [subFilterLogistica, setSubFilterLogistica] = useState<"pedidos" | "entregas">("pedidos");
  
  // ESTADOS DEL BUSCADOR INTELIGENTE
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Mapeo de rutas para el buscador interno
  const paginasDisponibles = [
    { nombres: ["envases", "botellas", "cajas", "control envases"], url: "/registro/envases" },
    { nombres: ["productos", "fys", "frutos y snacks", "snacks", "piqueos"], url: "/registro/productos" },
    { nombres: ["dinero", "sobrante", "plata", "caja", "dinero sobrante"], url: "/registro/dsobrante" },
    { nombres: ["proveedores", "gestion proveedores", "pedidos", "entregas", "agenda"], url: "/registro/proveedores" },
    { nombres: ["abastecimiento", "faltantes", "almacen", "stock", "surtir"], url: "/registro/abastecimiento" },
  ];

  // Ejecutar búsqueda por coincidencia
  const manejarBusqueda = (e: React.FormEvent) => {
    e.preventDefault();
    const queryLimpio = searchQuery.toLowerCase().trim();
    if (!queryLimpio) return;

    const resultado = paginasDisponibles.find(p => 
      p.nombres.some(keyword => keyword.includes(queryLimpio))
    );

    if (resultado) {
      router.push(resultado.url);
      setShowSearch(false);
      setSearchQuery("");
    } else {
      alert("No se encontró ninguna pestaña con ese nombre. Prueba con: envases, productos, dinero, proveedores o abastecimiento.");
    }
  };

  // Foco automático al abrir el buscador
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);
  
  // ESTADOS GAMIFICACION
  const [xp, setXp] = useState(0);

  // Función para calcular rango
  const getRango = (puntos: number) => {
    if (puntos < 100) return { nombre: "Aprendiz", color: "text-slate-400" };
    if (puntos < 500) return { nombre: "Bodeguero Pro", color: "text-blue-500" };
    return { nombre: "Maestro Bodeguero", color: "text-amber-500" };
  };

  const sumarXP = async (cantidad: number) => {
    const nuevaXP = xp + cantidad;
    setXp(nuevaXP);
  };

  // ESTADO PARA PASAR ALERTAS (TOASTS)
  const [toast, setToast] = useState<{ mensaje: string; tipo: "success" | "info" } | null>(null);

  // DATOS
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [faltantes, setFaltantes] = useState<any[]>([]);

  useEffect(() => {
    const authData = localStorage.getItem("auth");
    if (!authData) { 
      router.push("/login"); 
      return; 
    }
    try {
      JSON.parse(authData);
    } catch (error) { 
      localStorage.removeItem("auth"); 
      router.push("/login"); 
    }
  }, [router]);

  const mostrarAlerta = (mensaje: string, tipo: "success" | "info" = "success") => {
    setToast({ mensaje, tipo });
    setTimeout(() => { setToast(null); }, 3000);
  };

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
        if (p.dia_pedido === hoyNombre) {
          nuevasNotifs.push({ 
            id: `h-p-${p.id}`, dbId: p.id,msg: `${p.nombre}`, tag: 'HOY', clase: 'pedidos', tipo: 'hoy', orden: 1, icono: '📝', completado: p.pedido_hecho, link: `/registro/proveedores?proveedor=${p.nombre}` 
          });
        }
        if (p.dia_entrega === hoyNombre) {
          nuevasNotifs.push({ 
            id: `h-e-${p.id}`, dbId: p.id,msg: `${p.nombre}`, tag: 'HOY', clase: 'entregas', tipo: 'hoy', orden: 1, icono: '🚚', completado: p.entrega_recibida,link: null 
          });
        }
        if (p.dia_pedido === mañanaNombre) {
          nuevasNotifs.push({ 
            id: `m-p-${p.id}`, dbId: p.id,msg: `${p.nombre}`, tag: 'MAÑANA', clase: 'pedidos', tipo: 'mañana', orden: 2, icono: '⏳', completado: p.pedido_hecho, link: `/registro/proveedores?proveedor=${p.nombre}` 
          });
        }
        if (p.dia_entrega === mañanaNombre) {
          nuevasNotifs.push({ 
            id: `m-e-${p.id}`, dbId: p.id, msg: `${p.nombre}`, tag: 'MAÑANA', clase: 'entregas', tipo: 'mañana', orden: 2, icono: '📦', completado: p.entrega_recibida, link: `/registro/proveedores?proveedor=${p.nombre}` 
          });
        }
      });

      nuevasNotifs.sort((a, b) => a.orden - b.orden);
      setNotificaciones(nuevasNotifs);
    }
  };

  const obtenerFaltantes = async () => {
    const { data } = await supabase
      .from("productos_abastecimiento")
      .select("*")
      .or("esta_falta.eq.true,ultima_actualizacion.gte.today")
      .order("esta_falta", { ascending: false }) 
      .order("ultima_actualizacion", { ascending: false });

    if (data) setFaltantes(data);
  };

  const alternarPedidoHecho = async (id: number, estadoActual: boolean, nombre: string) => {
    const nuevoEstado = !estadoActual;
    const { error } = await supabase
      .from("proveedores")
      .update({ pedido_hecho: nuevoEstado })
      .eq("id", id);

    if (!error) {
      if (!estadoActual) sumarXP(20);
      mostrarAlerta(nuevoEstado ? `¡+20 XP! Pedido de ${nombre} listo` : "Se revirtió el pedido");
      obtenerAgenda();
    }
  };

  const alternarEntregaRecibida = async (id: number, estadoActual: boolean, nombre: string) => {
    const nuevoEstado = !estadoActual;
    const { error } = await supabase
      .from("proveedores")
      .update({ entrega_recibida: nuevoEstado })
      .eq("id", id);

    if (!error) {
      mostrarAlerta(nuevoEstado ? `Entrega de ${nombre} marcada recibida ✓` : `Se revirtió la entrega de ${nombre} ↩`, nuevoEstado ? "success" : "info");
      obtenerAgenda();
    }
  };

  const alternarAbastecimiento = async (id: number, estadoActual: boolean, nombre: string) => {
    const nuevoEstado = !estadoActual;
    const ahora = new Date().toISOString();

    setFaltantes((prevFaltantes) => {
      const nuevosFaltantes = prevFaltantes.map(item => 
        item.id === id ? { ...item, esta_falta: nuevoEstado, ultima_actualizacion: ahora } : item
      );
      return nuevosFaltantes.sort((a, b) => {
        if (a.esta_falta !== b.esta_falta) return a.esta_falta ? -1 : 1;
        return new Date(b.ultima_actualizacion).getTime() - new Date(a.ultima_actualizacion).getTime();
      });
    });

    const { error } = await supabase
      .from("productos_abastecimiento")
      .update({ esta_falta: nuevoEstado, ultima_actualizacion: ahora })
      .eq("id", id);

    if (!error) {
      mostrarAlerta(!nuevoEstado ? `${nombre} abastecido ✓` : `Se restauró ${nombre} ↩`, !nuevoEstado ? "success" : "info");
    }
  };

  const formatearFechaFalta = (isoString: string) => {
    if (!isoString) return "Desde fecha indefinida";
    const fecha = new Date(isoString);
    const opciones: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
    return `Desde el ${fecha.toLocaleDateString('es-ES', opciones)}`;
  };

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

  const totalActivoLogistica = notificaciones.filter(n => !n.completado).length;
  const totalActivoFaltantes = faltantes.filter(f => f.esta_falta).length;
  const totalNotificaciones = totalActivoLogistica + totalActivoFaltantes;

  const notificacionesFiltradas = notificaciones.filter(n => n.clase === subFilterLogistica);

  const isActiveMobile = (path: string) => 
    pathname === path ? "text-blue-600 border-b-2 border-blue-600 font-bold" : "text-slate-500 hover:bg-slate-100 rounded-lg";

  const isActiveDesktop = (path: string) =>
    pathname === path ? "bg-indigo-600 text-white shadow-lg scale-105" : "hover:bg-slate-800 text-slate-400";

  return (
    <main className="min-h-screen bg-slate-100 flex flex-col md:flex-row relative font-sans antialiased text-slate-900">
      
      {/* COMPONENTE NOTIFICACIÓN FLOTANTE (TOAST) */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-2xl shadow-2xl text-xs font-black uppercase tracking-wide text-white border bg-slate-900 border-emerald-500/30 animate-in slide-in-from-bottom-5 flex items-center gap-2">
          <span>⚡</span>{toast.mensaje}
        </div>
      )}

      {/* SIDEBAR (SOLO ESCRITORIO) */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-white p-6 flex-col shadow-xl z-20 shrink-0">
        <div className="mb-10">
          <Link href="/registro" className="block">
            <h1 className="text-2xl font-black tracking-tighter italic">SYS. <span className="text-blue-500">BODEGA</span></h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Registro Panel</p>
          </Link>
        </div>
        <nav className="space-y-2 flex-1">
          <Link href="/registro/envases" className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-xs transition-all ${isActiveDesktop("/registro/envases")}`}>🍾 CONTROL ENVASES</Link>
          <Link href="/registro/productos" className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-xs transition-all ${isActiveDesktop("/registro/productos")}`}>🥨 PRODUCTOS FYS</Link>
          <Link href="/registro/dsobrante" className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-xs transition-all ${isActiveDesktop("/registro/dsobrante")}`}>💵 DINERO SOBRANTE</Link>
          <Link href="/registro/proveedores" className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-xs transition-all ${isActiveDesktop("/registro/proveedores")}`}>🚚 PROVEEDORES</Link>
        </nav>
        <button onClick={() => { localStorage.removeItem("auth"); router.push("/login"); }} className="mt-auto w-full bg-slate-800 text-slate-400 py-4 rounded-2xl text-[10px] font-black uppercase">Cerrar Sesión 🚪</button>
      </aside>

      {/* HEADER SUPERIOR INTERFAZ FACEBOOK (MOBILE Y DESK INTERNO) */}
      <section className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        
        {/* TOP BAR ESTILO FACEBOOK APP */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 py-2.5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between w-full">
            {/* Logo estilo Facebook */}
            <Link href="/registro" className="flex items-center gap-1">
              <h1 className="text-2xl font-black tracking-tighter italic"><span className="text-blue-500">PAYAYA</span></h1>
            </Link>

            {/* Acciones Rápidas Superiores */}
            <div className="flex items-center gap-2">
              {/* Buscador Desplegable estilo Facebook */}
              <div className="relative">
                <button 
                  onClick={() => setShowSearch(!showSearch)} 
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${showSearch ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </button>

                {showSearch && (
                  <form onSubmit={manejarBusqueda} className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex gap-1">
                      <input 
                        ref={searchInputRef}
                        type="text" 
                        placeholder="Buscar pestaña (ej. plata, envases)..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                      />
                      <button type="submit" className="bg-blue-600 text-white text-[10px] font-black uppercase px-2.5 rounded-xl">Ir</button>
                    </div>
                  </form>
                )}
              </div>

              {/* Botón Añadir con Menú Desplegable */}
              <div className="relative">
                <button 
                  onClick={() => { setShowAddMenu(!showAddMenu); setShowNotif(false); }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${showAddMenu ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"></path></svg>
                </button>
                
                {showAddMenu && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <p className="text-[10px] font-black uppercase text-slate-400 px-4 pt-1 pb-2 tracking-wider">Añadir Registro</p>
                    <Link href="/registro/envases" onClick={() => setShowAddMenu(false)} className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">🍾 Control Envases</Link>
                    <Link href="/registro/productos" onClick={() => setShowAddMenu(false)} className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">🥨 Productos FYS</Link>
                    <Link href="/registro/dsobrante" onClick={() => setShowAddMenu(false)} className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">💵 Dinero Sobrante</Link>
                    <Link href="/registro/proveedores" onClick={() => setShowAddMenu(false)} className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">🚚 Nuevo Proveedor</Link>
                  </div>
                )}
              </div>

              {/* Botón Campana Notificaciones */}
              <button 
                onClick={() => { setShowNotif(!showNotif); setShowAddMenu(false); }}
                className={`w-9 h-9 rounded-full flex items-center justify-center relative transition-colors ${showNotif ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                {totalNotificaciones > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-4.5 bg-red-500 text-[9px] font-black text-white rounded-full flex items-center justify-center px-1 border border-white shadow">
                    {totalNotificaciones}
                  </span>
                )}
              </button>

              {/* Avatar Gamificado Usuario */}
              <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200">
                <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs rounded-full flex items-center justify-center shadow-inner uppercase">
                  PA
                </div>
              </div>
            </div>
          </div>

          {/* SUB-BARRA DE NAVEGACIÓN COMPLETA ESTILO FACEBOOK APP (5 ICONOS + HAMBURGUESA) */}
          <nav className="md:hidden flex justify-around items-center w-full mt-3 border-t border-slate-100 pt-1.5 px-1">
            {/* 1. Proveedores */}
            <Link href="/registro/proveedores" className={`flex-1 flex justify-center py-2 transition-all ${isActiveMobile("/registro/proveedores")}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
            </Link>
            {/* 2. Abastecimiento */}
            <Link href="/registro/abastecimiento" className={`flex-1 flex justify-center py-2 transition-all ${isActiveMobile("/registro/abastecimiento")}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 11m8 4V4.5"></path></svg>
            </Link>
            {/* 3. Envases */}
            <Link href="/registro/envases" className={`flex-1 flex justify-center py-2 transition-all ${isActiveMobile("/registro/envases")}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
            </Link>
            {/* 4. Productos FYS */}
            <Link href="/registro/productos" className={`flex-1 flex justify-center py-2 transition-all ${isActiveMobile("/registro/productos")}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M14 12a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            </Link>
            {/* 5. Dinero Sobrante */}
            <Link href="/registro/dsobrante" className={`flex-1 flex justify-center py-2 transition-all ${isActiveMobile("/registro/dsobrante")}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </Link>
            
            {/* Botón Hamburguesa Adicional */}
            <button 
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className={`flex-1 flex justify-center py-2 text-slate-500 transition-all ${showMobileMenu ? 'text-blue-600 border-b-2 border-blue-600' : ''}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
          </nav>
        </header>

        {/* MODAL / SIDE MENU FLOTANTE (MENÚ HAMBURGUESA MÓVIL) */}
        {showMobileMenu && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 md:hidden animate-in fade-in duration-200" onClick={() => setShowMobileMenu(false)}>
            <div className="absolute right-0 top-0 bottom-0 w-72 bg-white shadow-2xl p-5 flex flex-col justify-between animate-in slide-in-from-right duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="text-sm font-black uppercase text-slate-400 tracking-wider">Menú del Sistema</h3>
                  <button onClick={() => setShowMobileMenu(false)} className="p-1 text-slate-400 hover:text-slate-900 font-bold text-sm">✕</button>
                </div>
                
                {/* Marcador XP dentro de Hamburguesa */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Rango Actual</p>
                    <p className={`text-xs font-black uppercase ${getRango(xp).color}`}>{getRango(xp).nombre}</p>
                  </div>
                  <span className="text-xl">🏆 {xp} XP</span>
                </div>

                <nav className="flex flex-col gap-1.5">
                  <Link href="/registro/envases" onClick={() => setShowMobileMenu(false)} className="px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl font-bold text-xs flex items-center gap-3">🍾 Control Envases</Link>
                  <Link href="/registro/productos" onClick={() => setShowMobileMenu(false)} className="px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl font-bold text-xs flex items-center gap-3">🥨 Productos FYS</Link>
                  <Link href="/registro/dsobrante" onClick={() => setShowMobileMenu(false)} className="px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl font-bold text-xs flex items-center gap-3">💵 Dinero Sobrante</Link>
                  <Link href="/registro/abastecimiento" onClick={() => setShowMobileMenu(false)} className="px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl font-bold text-xs flex items-center gap-3">📦 Abastecimiento</Link>
                  <Link href="/registro/proveedores" onClick={() => setShowMobileMenu(false)} className="px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl font-bold text-xs flex items-center gap-3">🚚 Proveedores</Link>
                </nav>
              </div>
              <button onClick={() => { localStorage.removeItem("auth"); router.push("/login"); }} className="w-full bg-slate-900 text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-wider">Cerrar Sesión 🚪</button>
            </div>
          </div>
        )}

        {/* CONTENEDOR DESPLEGABLE NOTIFICACIONES (FACEBOOK STYLE) */}
        {showNotif && (
          <div className="absolute right-4 top-16 w-[92vw] md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 origin-top-right flex flex-col z-50">
            <div className="bg-slate-900 p-4 pb-2 shrink-0">
              <div className="flex bg-slate-800 p-1 rounded-xl">
                <button onClick={() => setActiveTab("logistica")} className={`flex-1 py-2 text-center text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === "logistica" ? "bg-white text-slate-900 shadow" : "text-slate-400 hover:text-white"}`}>🗓️ Logística ({notificaciones.length})</button>
                <button onClick={() => setActiveTab("abastecimiento")} className={`flex-1 py-2 text-center text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === "abastecimiento" ? "bg-rose-600 text-white shadow" : "text-slate-400 hover:text-white"}`}>⚠️ Faltantes ({faltantes.length})</button>
              </div>
            </div>

            {activeTab === "logistica" && (
              <div className="bg-slate-900 px-4 pb-4 pt-1 flex gap-2 shrink-0">
                <button onClick={() => setSubFilterLogistica("pedidos")} className={`flex-1 py-1 text-[9px] font-bold uppercase tracking-tight rounded-md border text-center transition-all ${subFilterLogistica === "pedidos" ? "bg-indigo-600 border-indigo-600 text-white font-black" : "border-slate-700 text-slate-400 hover:text-slate-200"}`}>📝 Pedidos ({notificaciones.filter(n => n.clase === 'pedidos').length})</button>
                <button onClick={() => setSubFilterLogistica("entregas")} className={`flex-1 py-1 text-[9px] font-bold uppercase tracking-tight rounded-md border text-center transition-all ${subFilterLogistica === "entregas" ? "bg-emerald-600 border-emerald-600 text-white font-black" : "border-slate-700 text-slate-400 hover:text-slate-200"}`}>🚚 Entregas ({notificaciones.filter(n => n.clase === 'entregas').length})</button>
              </div>
            )}

            <div className="max-h-96 overflow-y-auto bg-slate-50/50 divide-y divide-slate-100">
              {activeTab === "logistica" && (
                notificacionesFiltradas.length === 0 ? (
                  <div className="p-10 text-center text-slate-400"><p className="text-[10px] font-bold uppercase italic tracking-wider">Sin {subFilterLogistica} agendados</p></div>
                ) : (
                  notificacionesFiltradas.map((n) => (
                    <div key={n.id} className={`p-4 flex items-center justify-between gap-4 transition-colors ${n.completado ? 'bg-slate-100/80 opacity-65 line-through' : 'bg-white hover:bg-slate-50'}`}>
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-lg bg-white p-2 rounded-xl shadow-sm">{n.completado ? '✅' : n.icono}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 mb-1 inline-block">{n.tag}</span>
                          <p className="text-xs font-black uppercase text-slate-900 truncate">{n.msg}</p>
                        </div>
                      </div>
                      <button onClick={() => n.clase === 'pedidos' ? alternarPedidoHecho(n.dbId, n.completado, n.msg) : alternarEntregaRecibida(n.dbId, n.completado, n.msg)} className="px-2 py-1 bg-slate-900 text-white font-black text-[9px] uppercase rounded-lg shadow shrink-0">
                        {n.completado ? 'Deshacer ↩' : 'Listo ✓'}
                      </button>
                    </div>
                  ))
                )
              )}

              {activeTab === "abastecimiento" && (
                faltantes.length === 0 ? (
                  <div className="p-10 text-center text-slate-400"><p className="text-[10px] font-bold uppercase italic tracking-wider">¡Todo completo!</p></div>
                ) : (
                  faltantes.map((f: any) => (
                    <div key={f.id} className={`p-4 flex items-center justify-between gap-4 ${!f.esta_falta ? 'bg-slate-100/80 opacity-60 line-through' : 'bg-white'}`}>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black uppercase text-slate-900 truncate">{f.nombre}</p>
                        <span className="text-[9px] font-bold text-rose-500">{formatearFechaFalta(f.ultima_actualizacion)}</span>
                      </div>
                      <button onClick={() => alternarAbastecimiento(f.id, f.esta_falta, f.nombre)} className="px-2 py-1 bg-rose-600 text-white font-black text-[9px] uppercase rounded-lg shadow shrink-0">
                        {!f.esta_falta ? 'Deshacer' : 'Surtido ✓'}
                      </button>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        )}

        {/* ÁREA DE TRABAJO DINÁMICA DE HIJOS */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-100">
          {children}
        </div>

      </section>
    </main>
  );
}