"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";

export default function EnvasesRegistroPage() {
  const [registros, setRegistros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificacion, setNotificacion] = useState<string | null>(null);
  const [nuevoId, setNuevoId] = useState<number | null>(null);
  
  // Nuevos estados para edición y búsqueda
  const [editando, setEditando] = useState<any | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroPago, setFiltroPago] = useState<string | null>(null);
  
  // --- LÓGICA DE TRABAJADORES Y TURNOS ---
  const [horaActual, setHoraActual] = useState(new Date().getHours());
  const [turnoActual, setTurnoActual] = useState("");

  const determinarTrabajadorTurno = () => {
    const hoy = new Date();
    const hora = hoy.getHours();
    const dia = hoy.getDay(); 

    if (hora < 16) {
      return "Catherine"; 
    } else {
      if (dia === 0 || dia === 6) {
        return "Axel"; 
      } else {
        return "María"; 
      }
    }
  };

// --- LÓGICA DE FECHAS (8 días atrás y 1 día adelante) ---
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 8); // 8 días atrás
    return d.toISOString().split('T')[0];
  });
  
  const [fechaHasta, setFechaHasta] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // 1 día adelante
    return d.toISOString().split('T')[0];
  });

  const [filtroEstado, setFiltroEstado] = useState("pendientes");

  const [nuevo, setNuevo] = useState({ 
    cliente: "", 
    envase: "", 
    cantidad: "1", 
    dinero: "2", 
    pago: "Efectivo",
    trabajador: "" 
  });

  const formularioValido = useMemo(() => {
    return (
      nuevo.cliente.trim() !== "" && 
      nuevo.envase !== "" && 
      nuevo.cantidad !== "" && Number(nuevo.cantidad) > 0 &&
      nuevo.dinero !== "" && Number(nuevo.dinero) >= 0
    );
  }, [nuevo]);

  // --- CÁLCULOS OPTIMIZADOS ---
  const stats = useMemo(() => {
    const cashPendiente = registros
      .filter(r => r.devuelto === 0 && r.pago === "Efectivo")
      .reduce((acc, curr) => acc + (Number(curr.dinero) || 0), 0);
    
    const yapePendiente = registros
      .filter(r => r.devuelto === 0 && r.pago === "Yape")
      .reduce((acc, curr) => acc + (Number(curr.dinero) || 0), 0);

    return { cashPendiente, yapePendiente };
  }, [registros]);

  const registrosFiltrados = useMemo(() => {
    let filtrados = [...registros];
    
    if (filtroEstado === "pendientes") filtrados = filtrados.filter(r => r.devuelto === 0);
    if (filtroEstado === "devueltos") filtrados = filtrados.filter(r => r.devuelto === 1);
    
    if (filtroPago) filtrados = filtrados.filter(r => r.pago === filtroPago);

    if (busqueda.trim() !== "") {
      const q = busqueda.toLowerCase();
      filtrados = filtrados.filter(r => 
        r.cliente.toLowerCase().includes(q) || 
        r.envase.toLowerCase().includes(q)
      );
    }

    return filtrados;
  }, [registros, filtroEstado, filtroPago, busqueda]);

  // --- EFECTOS ---
  useEffect(() => {
    const inicial = determinarTrabajadorTurno();
    setTurnoActual(inicial);
    setNuevo(prev => ({ ...prev, trabajador: inicial }));

    const interval = setInterval(() => {
      setHoraActual(new Date().getHours());
      const nuevoTurno = determinarTrabajadorTurno();
      if (nuevoTurno !== turnoActual) {
        setTurnoActual(nuevoTurno);
        setNuevo(prev => ({ ...prev, trabajador: nuevoTurno }));
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [turnoActual]);

  useEffect(() => { fetchEnvases(); }, [fechaDesde, fechaHasta]);

  async function fetchEnvases() {
    setLoading(true);
    let query = supabase.from("envases").select("*").order("id", { ascending: false });
    if (fechaDesde && fechaHasta) {
      query = query.gte("fecha", `${fechaDesde}T00:00:00`).lte("fecha", `${fechaHasta}T23:59:59`);
    }
    const { data } = await query;
    setRegistros(data || []);
    setLoading(false);
  }

  async function toggleDevuelto(id: number, estadoActual: number) {
    const nuevoEstado = estadoActual === 1 ? 0 : 1;
    const { error } = await supabase.from("envases").update({ devuelto: nuevoEstado }).eq("id", id);
    if (!error) {
      setNotificacion(`Estado actualizado`);
      fetchEnvases();
      setTimeout(() => setNotificacion(null), 3000);
    }
  }

  async function guardarRegistro(e?: React.FormEvent) {
    e?.preventDefault();
    if (!formularioValido) return;

    const { data, error } = await supabase.from("envases").insert([{
      cliente: nuevo.cliente.toUpperCase(),
      envase: nuevo.envase,
      cantidad: Number(nuevo.cantidad),
      dinero: Number(nuevo.dinero),
      pago: nuevo.pago,
      trabajador: nuevo.trabajador,
      fecha: new Date().toISOString(),
      devuelto: 0 
    }]).select();

    if (!error && data) {
      setNotificacion(`Registro guardado exitosamente`);
      setNuevo({ cliente: "", envase: "", cantidad: "1", dinero: "2", pago: "Efectivo", trabajador: nuevo.trabajador });
      setNuevoId(data[0].id);
      fetchEnvases();
      setTimeout(() => setNuevoId(null), 8000);
    }
  }

  async function actualizarRegistro() {
    if (!editando) return;
    const { error } = await supabase.from("envases").update({
      cliente: editando.cliente.toUpperCase(),
      envase: editando.envase,
      cantidad: Number(editando.cantidad),
      dinero: Number(editando.dinero),
      pago: editando.pago
    }).eq("id", editando.id);

    if (!error) {
      setNotificacion("Registro actualizado");
      setEditando(null);
      fetchEnvases();
      setTimeout(() => setNotificacion(null), 3000);
    }
  }

  async function eliminarRegistro() {
    if (!editando) return;
    if (!confirm(`¿Estás seguro de eliminar el registro de ${editando.cliente}?`)) return;
    
    const { error } = await supabase.from("envases").delete().eq("id", editando.id);
    if (!error) {
      setNotificacion("Registro eliminado");
      setEditando(null);
      fetchEnvases();
      setTimeout(() => setNotificacion(null), 3000);
    }
  }

  const formatFechaCorta = (fechaStr: string) => {
    const fecha = new Date(fechaStr);
    const hoy = new Date();
    const esHoy = fecha.getDate() === hoy.getDate() && fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear();
    const dia = fecha.getDate();
    const mes = fecha.toLocaleString('es-ES', { month: 'short' }).replace('.', '').toUpperCase();
    const horaFormateada = fecha.toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'}).toUpperCase();

    return { dia, mes, horaFormateada, esHoy };
  };

  return (
    <>
      {notificacion && (
        <div className="fixed top-6 right-6 z-[1000] animate-in slide-in-from-right duration-500">
          <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border-l-4 border-emerald-500 flex items-center gap-3">
            <p className="text-[11px] font-black uppercase tracking-wider">{notificacion}</p>
          </div>
        </div>
      )}

      {/* POP UP DE EDICIÓN */}
      {editando && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md" onClick={() => setEditando(null)}></div>
          <div className="bg-white rounded-[3rem] p-10 shadow-2xl border-t-[15px] border-slate-900 text-center relative z-10 animate-in zoom-in duration-300 max-w-sm w-full">
            <h2 className="text-4xl font-black text-slate-900 uppercase italic mb-6 leading-none">EDITAR REGISTRO</h2>
            <div className="space-y-4 text-left mb-6">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Cliente</label>
                <input type="text" value={editando.cliente} onChange={(e) => setEditando({ ...editando, cliente: e.target.value })} className="w-full border-2 border-slate-100 bg-slate-50 p-3 rounded-xl text-sm font-bold uppercase outline-none focus:border-slate-400" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Envase</label>
                <select value={editando.envase} onChange={(e) => setEditando({ ...editando, envase: e.target.value })} className="w-full border-2 border-slate-100 bg-slate-50 p-3 rounded-xl text-sm font-bold uppercase outline-none focus:border-slate-400">
                    <option value="Pirañita 192ml">Pirañita 192ml</option>
                    <option value="Envase 296ml">Envase 296ml</option>
                    <option value="Inca Kola 1L">🟡 Inca Kola 1L</option>
                    <option value="Coca Cola 1L">🔴 Coca Cola 1L</option>
                    <option value="Inca K. 1.5L">🟡 Inca K. 1.5L</option>
                    <option value="Coca C. 1.5L">🔴 Coca C. 1.5L</option>
                    <option value="Fanta 1.5L">🟨 Fanta 1.5L</option>
                    <option value="Inca Gordita">🟡 Inca Gordita</option>
                    <option value="Inca K. 2.5L">🟡 Inca K. 2.5L</option>
                    <option value="Coca C. 2.5L">🔴 Coca C. 2.5L</option>
                    <option value="Cerveza 630ML">🍺 Cerveza 630ML</option>
                    <option value="Cerveza 1L">🍺 Cerveza 1L</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Cantidad</label>
                  <input type="number" value={editando.cantidad} onChange={(e) => setEditando({ ...editando, cantidad: e.target.value })} className="w-full border-2 border-slate-100 bg-slate-50 p-3 rounded-xl text-center font-bold outline-none focus:border-slate-400" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Garantía (S/)</label>
                  <input type="number" step="0.5" value={editando.dinero} onChange={(e) => setEditando({ ...editando, dinero: e.target.value })} className="w-full border-2 border-slate-100 bg-slate-50 p-3 rounded-xl text-center font-bold outline-none focus:border-slate-400 font-mono" />
                </div>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button type="button" onClick={() => setEditando({...editando, pago: 'Efectivo'})} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${editando.pago === 'Efectivo' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>EFECTIVO</button>
                <button type="button" onClick={() => setEditando({...editando, pago: 'Yape'})} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${editando.pago === 'Yape' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-400'}`}>YAPE</button>
              </div>
            </div>
            <div className="flex gap-4 mb-4">
              <button onClick={() => setEditando(null)} className="flex-1 bg-slate-100 text-slate-500 font-black py-4 rounded-2xl uppercase text-[11px]">CANCELAR</button>
              <button onClick={actualizarRegistro} className="flex-1 bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl uppercase text-[11px]">ACTUALIZAR</button>
            </div>
            <button onClick={eliminarRegistro} className="text-red-500 text-[10px] font-black uppercase underline decoration-2 underline-offset-4">
              ❌ ELIMINAR ESTE REGISTRO
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6 p-2 animate-in fade-in duration-500 relative">
        <div className="flex flex-col md:flex-row justify-between gap-6 pt-4 px-2">
          <div className="border-b border-slate-200 pb-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mb-1">Control</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
              <span className="text-indigo-600"> Envases</span>
            </h2>
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-3 bg-white p-3 rounded-3xl border border-slate-200 shadow-sm w-full md:w-auto">
            <div className="flex gap-4 px-2 text-left">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-blue-600 uppercase tracking-tighter mb-1">DESDE:</span>
                <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="text-[11px] font-black bg-transparent outline-none text-slate-900 w-24" />
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-blue-600 uppercase tracking-tighter mb-1">HASTA:</span>
                <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="text-[11px] font-black bg-transparent outline-none text-slate-900 w-24" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 pb-10">
          {/* FORMULARIO */}
          <div className="lg:col-span-4 self-start sticky top-4">
            <div className="bg-white p-8 rounded-[3rem] shadow-2xl border-b-[12px] border-blue-600 relative">
              <div className="absolute top-6 right-8 flex items-center gap-1 hover:opacity-100 transition-opacity focus-within:opacity-100">
                <select 
                  value={nuevo.trabajador}
                  onChange={(e) => setNuevo({...nuevo, trabajador: e.target.value})}
                  className="text-[10px] font-black uppercase tracking-wider bg-transparent text-slate-600 outline-none cursor-pointer appearance-none text-right"
                >
                  <option value="Catherine">Catherine</option>
                  <option value="Axel">Axel</option>
                  <option value="Axel">Axel</option>
                </select>
                <svg className="w-3 h-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>

              <form className="space-y-5 mt-2" onSubmit={guardarRegistro}>
                <div className="text-left">
                  <label className="text-[11px] font-black text-blue-600 uppercase mb-2 block tracking-widest ml-1">Cliente *</label>
                  <input 
                    required autoFocus value={nuevo.cliente} 
                    onChange={(e) => setNuevo({ ...nuevo, cliente: e.target.value })} 
                    className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-sm font-black text-slate-900 focus:border-blue-600 outline-none uppercase" 
                  />
                </div>
                <div className="text-left">
                  <label className="text-[11px] font-black text-blue-600 uppercase mb-2 block tracking-widest ml-1">Envase *</label>
                  <select 
                    required value={nuevo.envase} 
                    onChange={(e) => setNuevo({ ...nuevo, envase: e.target.value })} 
                    className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-sm font-black text-slate-900 outline-none focus:border-blue-600 uppercase cursor-pointer"
                  >
                    <option value="">SELECCIONAR...</option>
                    <option value="Pirañita 192ml">Pirañita 192ml</option>
                    <option value="Envase 296ml">Envase 296ml</option>
                    <option value="Inca Kola 1L">🟡 Inca Kola 1L</option>
                    <option value="Coca Cola 1L">🔴 Coca Cola 1L</option>
                    <option value="Inca K. 1.5L">🟡 Inca K. 1.5L</option>
                    <option value="Coca C. 1.5L">🔴 Coca C. 1.5L</option>
                    <option value="Fanta 1.5L">🟨 Fanta 1.5L</option>
                    <option value="Inca Gordita">🟡 Inca Gordita</option>
                    <option value="Inca K. 2.5L">🟡 Inca K. 2.5L</option>
                    <option value="Coca C. 2.5L">🔴 Coca C. 2.5L</option>
                    <option value="Cerveza 630ML">🍺 Cerveza 630ML</option>
                    <option value="Cerveza 1L">🍺 Cerveza 1L</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 text-left">
                    <label className="text-[11px] font-black text-blue-600 block">CANTIDAD *</label>
                    <input 
                      required type="number" value={nuevo.cantidad} 
                      onChange={(e) => setNuevo({ ...nuevo, cantidad: e.target.value })} 
                      className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-center text-xl font-black text-slate-900 focus:border-blue-600 outline-none" 
                    />
                  </div>
                  <div className="space-y-2 text-left">
                    <label className="text-[11px] font-black text-blue-600 text-center block">S/ GARANTÍA *</label>
                    <input 
                      required type="number" min="0.50" step="0.5" value={nuevo.dinero} 
                      onChange={(e) => setNuevo({ ...nuevo, dinero: e.target.value })} 
                      className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-center text-xl font-black text-slate-900 focus:border-blue-600 outline-none font-mono" 
                    />
                  </div>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-2xl">
                  <button type="button" onClick={() => setNuevo({...nuevo, pago: 'Efectivo'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${nuevo.pago === 'Efectivo' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>EFECTIVO</button>
                  <button type="button" onClick={() => setNuevo({...nuevo, pago: 'Yape'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${nuevo.pago === 'Yape' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-400'}`}>YAPE</button>
                </div>
                <button 
                  type="submit" disabled={!formularioValido}
                  className={`w-full font-black py-6 rounded-2xl shadow-xl uppercase text-xs tracking-widest border-b-4 transition-all ${
                    formularioValido 
                    ? 'bg-blue-600 text-white border-blue-900 active:border-b-0 active:translate-y-1' 
                    : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
                  }`}
                >
                  REGISTRAR SALIDA
                </button>
              </form>
            </div>
          </div>

          {/* TABLA RESPONSIVA */}
          <div className="lg:col-span-8 bg-white rounded-[3.5rem] shadow-xl border border-slate-100 flex flex-col overflow-hidden min-h-[600px]">
            <div className="bg-slate-900 p-6 flex flex-col sm:flex-row justify-between items-center gap-6 border-b border-blue-500">
              <div className="text-left w-full sm:w-auto">
                <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">HISTORIAL RECIENTE</h3>
              </div>
              
              {/* FILTROS DE PAGO (EFECTIVO Y YAPE CON ONCLICK) */}
              <div className="flex gap-4">
                <div 
                  onClick={() => setFiltroPago(prev => prev === 'Efectivo' ? null : 'Efectivo')}
                  className={`flex flex-col text-right cursor-pointer px-4 py-2 rounded-2xl transition-all ${filtroPago === 'Efectivo' ? 'bg-emerald-900/50 ring-2 ring-emerald-500' : 'hover:bg-slate-800'}`}
                >
                  <span className="text-[8px] font-black text-emerald-400 uppercase leading-none mb-1">EFECTIVO.</span>
                  <span className="text-xl font-black text-white font-mono tracking-tighter">S/ {stats.cashPendiente.toFixed(2)}</span>
                </div>
                <div 
                  onClick={() => setFiltroPago(prev => prev === 'Yape' ? null : 'Yape')}
                  className={`flex flex-col text-right cursor-pointer px-4 py-2 rounded-2xl transition-all ${filtroPago === 'Yape' ? 'bg-purple-900/50 ring-2 ring-purple-500' : 'hover:bg-slate-800'}`}
                >
                  <span className="text-[8px] font-black text-purple-400 uppercase leading-none mb-1">YAPE</span>
                  <span className="text-xl font-black text-white font-mono tracking-tighter">S/ {stats.yapePendiente.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            {/* BARRA DE BÚSQUEDA Y FILTRO DE ESTADO */}
            <div className="bg-slate-50 border-b border-slate-100 p-4 flex flex-col sm:flex-row gap-4 items-center">
              <input 
                type="text" 
                placeholder="Buscar cliente o envase..." 
                value={busqueda} 
                onChange={(e) => setBusqueda(e.target.value)} 
                className="flex-1 w-full bg-white border-2 border-slate-200 p-3 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-blue-400 uppercase"
              />
              <select 
                value={filtroEstado} 
                onChange={(e) => setFiltroEstado(e.target.value)} 
                className="bg-blue-600 text-white text-[10px] font-black px-6 py-3 rounded-xl uppercase outline-none cursor-pointer w-full sm:w-auto"
              >
                <option value="pendientes">PENDIENTES</option>
                <option value="devueltos">RECIBIDOS</option>
                <option value="todos">VER TODOS</option>
              </select>
            </div>

            <div className="flex-1 p-4">
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
                      <th className="px-4 py-2">Fecha</th>
                      <th className="px-4 py-2">Detalle</th>
                      <th className="px-4 py-2 text-center">Cant.</th>
                      <th className="px-4 py-2 text-right">Garantía</th>
                      <th className="px-4 py-2 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrosFiltrados.map((item) => {
                      const { dia, mes, horaFormateada, esHoy } = formatFechaCorta(item.fecha);
                      const esReciente = item.id === nuevoId;
                      
                      return (
                        <tr key={item.id} className={`transition-all duration-1000 ease-in-out ${esReciente ? 'scale-[1.01]' : 'scale-100'}`}>
                          <td className={`px-4 py-4 rounded-l-3xl transition-colors duration-1000 ${esReciente ? 'bg-blue-600' : 'bg-slate-50'}`}>
                            <div className="flex flex-col items-center justify-center">
                              <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl border ${esReciente ? 'bg-white text-blue-600 border-white' : esHoy ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-slate-900 border-slate-200'}`}>
                                <span className="text-lg font-black leading-none">{dia}</span>
                                <span className="text-[8px] font-black mt-1 uppercase">{mes}</span>
                              </div>
                              <span className={`text-[11px] font-black font-mono mt-1 ${esReciente ? 'text-blue-100' : 'text-slate-500'}`}>{horaFormateada}</span>
                            </div>
                          </td>
                          <td className={`px-4 py-4 ${esReciente ? 'bg-blue-600' : 'bg-slate-50'}`}>
                            <p className={`text-[10px] font-black uppercase ${esReciente ? 'text-blue-100' : 'text-slate-400'}`}>{item.cliente}</p>
                            <p className={`text-sm font-black uppercase italic ${esReciente ? 'text-white' : 'text-slate-900'}`}>{item.envase}</p>
                            {item.trabajador && <p className={`text-[9px] uppercase mt-1 font-bold ${esReciente ? 'text-blue-200' : 'text-slate-400'}`}>Atendido: {item.trabajador}</p>}
                          </td>
                          <td className={`px-4 py-4 text-center ${esReciente ? 'bg-blue-600' : 'bg-slate-50'}`}>
                            <span className={`text-xl font-black font-mono ${esReciente ? 'text-white' : 'text-blue-600'}`}>{item.cantidad}</span>
                          </td>
                          <td className={`px-4 py-4 text-right ${esReciente ? 'bg-blue-600' : 'bg-slate-50'}`}>
                            <p className={`text-lg font-black font-mono ${esReciente ? 'text-white' : 'text-slate-900'}`}>S/ {Number(item.dinero).toFixed(2)}</p>
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${esReciente ? 'bg-blue-400 text-white' : (item.pago === 'Yape' ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600')}`}>{item.pago}</span>
                          </td>
                          <td className={`px-4 py-4 rounded-r-3xl text-center ${esReciente ? 'bg-blue-600' : 'bg-slate-50'}`}>
                            <div className="flex gap-2 justify-center items-center">
                              <button onClick={() => toggleDevuelto(item.id, item.devuelto)} className={`text-[10px] font-black px-4 py-2.5 rounded-xl border-2 transition-all ${item.devuelto === 1 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                {item.devuelto === 1 ? 'RECIBIDO' : 'PENDIENTE'}
                              </button>
                              <button onClick={() => setEditando({ ...item })} className="bg-slate-200 text-slate-500 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-slate-300">
                                ✎
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="sm:hidden space-y-3">
                {registrosFiltrados.map((item) => {
                  const { dia, mes, horaFormateada, esHoy } = formatFechaCorta(item.fecha);
                  const esReciente = item.id === nuevoId;

                  return (
                    <div key={item.id} className={`bg-slate-50 p-4 rounded-3xl border border-slate-100 flex items-center justify-between transition-all duration-700 ${esReciente ? 'scale-[1.02] border-blue-400 ring-2 ring-blue-200 animate-pulse' : ''}`}>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center justify-center">
                          <div className={`flex flex-col items-center p-2 rounded-xl w-12 border ${esReciente ? 'bg-blue-600 border-blue-700 text-white' : esHoy ? 'bg-blue-600 border-blue-700 text-white' : 'bg-white border-slate-200'}`}>
                            <span className="text-md font-black">{dia}</span>
                            <span className={`text-[9px] uppercase font-bold ${esReciente || esHoy ? 'text-blue-100' : 'text-slate-400'}`}>{mes}</span>
                          </div>
                          <span className="text-[10px] font-black font-mono text-slate-500 mt-1">{horaFormateada}</span>
                        </div>
                        
                        <div>
                          <p className="text-[12px] font-black text-slate-600 uppercase">{item.cliente}</p>
                          <p className="text-[11px] font-black uppercase italic">{item.envase}</p>
                          <div className="flex items-center gap-2 mt-1">
                             <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-full">{item.cantidad} UNID.</span>
                             <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${item.pago === 'Yape' ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600'}`}>{item.pago}</span>
                          </div>
                          {item.trabajador && <p className="text-[8px] font-black text-slate-400 mt-1">TRAB: {item.trabajador.toUpperCase()}</p>}
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end gap-1">
                        <p className="text-sm font-black font-mono">S/ {Number(item.dinero).toFixed(2)}</p>
                        <button 
                          onClick={() => toggleDevuelto(item.id, item.devuelto)} 
                          className={`mt-1 text-[8px] font-black px-3 py-1 rounded-lg ${item.devuelto === 1 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}
                        >
                          {item.devuelto === 1 ? 'RECIBIDO' : 'PENDIENTE'}
                        </button>
                        <button onClick={() => setEditando({ ...item })} className="text-[8px] font-black text-slate-400 underline mt-1">
                          EDITAR
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {registrosFiltrados.length === 0 && !loading && (
                <div className="p-20 text-center text-slate-300 font-black uppercase text-xs tracking-[0.3em]">Sin registros</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}