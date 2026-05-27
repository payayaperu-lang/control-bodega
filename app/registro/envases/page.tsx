"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";

export default function EnvasesRegistroPage() {
  const [registros, setRegistros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmando, setConfirmando] = useState(false);
  const [notificacion, setNotificacion] = useState<string | null>(null);
  const [nuevoId, setNuevoId] = useState<number | null>(null);

  // --- LÓGICA DE FECHAS ---
  const dates = useMemo(() => {
    const hoy = new Date();
    const diaSemana = hoy.getDay();
    const difLunes = hoy.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1);
    const lunes = new Date(new Date().setDate(difLunes)).toISOString().split('T')[0];
    const domingo = new Date(new Date(lunes).setDate(new Date(lunes).getDate() + 6)).toISOString().split('T')[0];
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0];
    return { lunes, domingo, inicioMes, finMes };
  }, []);

  const [fechaDesde, setFechaDesde] = useState(dates.lunes); 
  const [fechaHasta, setFechaHasta] = useState(dates.domingo);
  const [filtroEstado, setFiltroEstado] = useState("pendientes");

  const esSemanaActual = fechaDesde === dates.lunes && fechaHasta === dates.domingo;
  const esMesActual = fechaDesde === dates.inicioMes && fechaHasta === dates.finMes;

  const [nuevo, setNuevo] = useState({ cliente: "", envase: "", cantidad: "", dinero: "", pago: "Efectivo" });

  const formularioValido = useMemo(() => {
    return (
      nuevo.cliente.trim() !== "" && 
      nuevo.envase !== "" && 
      nuevo.cantidad !== "" && Number(nuevo.cantidad) > 0 &&
      nuevo.dinero !== "" && Number(nuevo.dinero) >= 0
    );
  }, [nuevo]);

  // --- CÁLCULOS OPTIMIZADOS (Solo lo necesario para la tabla) ---
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
    return filtrados;
  }, [registros, filtroEstado]);

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

  const togglePeriodo = () => {
    if (esSemanaActual) {
      setFechaDesde(dates.inicioMes); setFechaHasta(dates.finMes);
    } else {
      setFechaDesde(dates.lunes); setFechaHasta(dates.domingo);
    }
  };

  async function toggleDevuelto(id: number, estadoActual: number) {
    const nuevoEstado = estadoActual === 1 ? 0 : 1;
    const { error } = await supabase.from("envases").update({ devuelto: nuevoEstado }).eq("id", id);
    if (!error) {
      setNotificacion(`Estado actualizado`);
      fetchEnvases();
      setTimeout(() => setNotificacion(null), 3000);
    }
  }

  async function guardarRegistro() {
    if (!formularioValido) return;

    const { data, error } = await supabase.from("envases").insert([{
      cliente: nuevo.cliente.toUpperCase(),
      envase: nuevo.envase,
      cantidad: Number(nuevo.cantidad),
      dinero: Number(nuevo.dinero),
      pago: nuevo.pago,
      fecha: new Date().toISOString(),
      devuelto: 0 
    }]).select();

    if (!error && data) {
      setNotificacion(`Registro guardado exitosamente`);
      setNuevo({ cliente: "", envase: "", cantidad: "", dinero: "", pago: "Efectivo" });
      setConfirmando(false);
      setNuevoId(data[0].id);
      fetchEnvases();
      setTimeout(() => setNuevoId(null), 8000);
    }
  }

  const formatFechaCorta = (fechaStr: string) => {
    const fecha = new Date(fechaStr);
    const hoy = new Date();
    const esHoy = fecha.getDate() === hoy.getDate() && fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear();
    const dia = fecha.getDate();
    const mes = fecha.toLocaleString('es-ES', { month: 'short' }).replace('.', '').toUpperCase();
    return { dia, mes, esHoy };
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

      {confirmando && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md" onClick={() => setConfirmando(false)}></div>
          <div className="bg-white rounded-[3rem] p-10 shadow-2xl border-t-[15px] border-blue-600 text-center relative z-10 animate-in zoom-in duration-300 max-w-sm w-full">
            <h2 className="text-4xl font-black text-slate-900 uppercase italic mb-6 leading-none">REVISAR SALIDA</h2>
            <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 mb-8">
              <p className="text-xl font-black text-slate-900 uppercase">{nuevo.cliente}</p>
              <p className="text-2xl font-black text-blue-600 uppercase">{nuevo.cantidad} {nuevo.envase}</p>
              <p className="text-2xl font-black text-emerald-600 font-mono">S/ {Number(nuevo.dinero).toFixed(2)}</p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setConfirmando(false)} className="flex-1 bg-slate-100 text-slate-500 font-black py-5 rounded-2xl uppercase text-[11px]">CORREGIR</button>
              <button onClick={guardarRegistro} className="flex-1 bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl uppercase text-[11px]">CONFIRMAR</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6 p-4 min-h-screen bg-slate-50 text-slate-800">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-4">
          <div className="text-left">
            <h2 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mb-1 ml-1">Terminal </h2>
            <h1 className="text-5xl font-black text-slate-900 italic uppercase leading-none">ENVASES<span className="text-blue-600">.SYS</span></h1>
          </div>

          <div className="flex items-center gap-4 bg-white p-3 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex gap-6 px-4 border-r border-slate-200 text-left">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-blue-600 uppercase tracking-tighter mb-1">DESDE:</span>
                <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="text-xs font-black bg-transparent outline-none text-slate-700" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-blue-600 uppercase tracking-tighter mb-1">HASTA:</span>
                <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="text-xs font-black bg-transparent outline-none text-slate-700" />
              </div>
            </div>
            <div className="flex items-center gap-3 px-3 cursor-pointer select-none" onClick={togglePeriodo}>
              <span className={`text-[9px] font-black uppercase ${esSemanaActual ? 'text-emerald-600' : 'text-slate-300'}`}>Semana</span>
              <div className={`w-10 h-5 rounded-full relative transition-colors ${esMesActual ? 'bg-blue-600' : 'bg-emerald-500'}`}>
                  <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${esMesActual ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
              <span className={`text-[9px] font-black uppercase ${esMesActual ? 'text-blue-600' : 'text-slate-300'}`}>Mes</span>
            </div>
          </div>
        </div>

        {/* LAS TARJETAS HAN SIDO ELIMINADAS PARA EVITAR CONFUSIÓN DEL TRABAJADOR */}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 pb-10">
          {/* FORMULARIO */}
          <div className="lg:col-span-4 self-start sticky top-4">
            <div className="bg-white p-8 rounded-[3rem] shadow-2xl border-b-[12px] border-blue-600">
              <form 
                className="space-y-5" 
                onSubmit={(e) => { e.preventDefault(); if(formularioValido) setConfirmando(true); }}
              >
                <div className="text-left">
                  <label className="text-[10px] font-black text-blue-600 uppercase mb-2 block tracking-widest ml-1">Cliente *</label>
                  <input 
                    required
                    placeholder="NOMBRE..." 
                    value={nuevo.cliente} 
                    onChange={(e) => setNuevo({ ...nuevo, cliente: e.target.value })} 
                    className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-sm font-black text-slate-900 focus:border-blue-600 outline-none uppercase" 
                  />
                </div>
                <div className="text-left">
                  <label className="text-[10px] font-black text-blue-600 uppercase mb-2 block tracking-widest ml-1">Envase *</label>
                  <select 
                    required
                    value={nuevo.envase} 
                    onChange={(e) => setNuevo({ ...nuevo, envase: e.target.value })} 
                    className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-sm font-black text-slate-900 outline-none focus:border-blue-600 uppercase cursor-pointer"
                  >
                    <option value="">SELECCIONAR...</option>
                    <option value="Pirañita 192ml">Pirañita 192ml</option>
                    <option value="Envase 296ml">Envase 296ml</option>
                    <option value="Inca Kola 1L">Inca Kola 1L</option>
                    <option value="Coca Cola 1L">Coca Cola 1L</option>
                    <option value="Inca K. 1.5L">Inca K. 1.5L</option>
                    <option value="Coca C. 1.5L">Coca C. 1.5L</option>
                    <option value="Fanta 1.5L">Fanta 1.5L</option>
                    <option value="Inca Gordita">Inca Gordita</option>
                    <option value="Inca K. 2.5L">Inca K. 2.5L</option>
                    <option value="Coca C. 2.5L">Coca C. 2.5L</option>
                    <option value="Cerveza 630ML">Cerveza 630ML</option>
                    <option value="Cerveza 1L">Cerveza 1L</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 text-left">
                    <label className="text-[9px] font-black text-blue-600 block">CANTIDAD *</label>
                    <input 
                      required
                      type="number" 
                      placeholder="0" 
                      value={nuevo.cantidad} 
                      onChange={(e) => setNuevo({ ...nuevo, cantidad: e.target.value })} 
                      className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-center text-xl font-black text-slate-900 focus:border-blue-600 outline-none" 
                    />
                  </div>
                  <div className="space-y-2 text-left">
                    <label className="text-[9px] font-black text-blue-600 text-center block">S/ GARANTÍA *</label>
                    <input 
                      required
                      type="number" 
                      step="0.10"
                      placeholder="0.00" 
                      value={nuevo.dinero} 
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
                  type="submit"
                  disabled={!formularioValido}
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

          {/* TABLA */}
          <div className="lg:col-span-8 bg-white rounded-[3.5rem] shadow-xl border border-slate-100 flex flex-col overflow-hidden min-h-[600px]">
            <div className="bg-slate-900 p-6 flex flex-col sm:flex-row justify-between items-center gap-6 border-b border-blue-500">
              <div className="text-left w-full sm:w-auto">
                <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">HISTORIAL RECIENTE</h3>
              </div>

              <div className="flex gap-8">
                <div className="flex flex-col text-right">
                  <span className="text-[8px] font-black text-emerald-400 uppercase leading-none mb-1">EFECTIVO.</span>
                  <span className="text-xl font-black text-white font-mono tracking-tighter">S/ {stats.cashPendiente.toFixed(2)}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[8px] font-black text-purple-400 uppercase leading-none mb-1">YAPE</span>
                  <span className="text-xl font-black text-white font-mono tracking-tighter">S/ {stats.yapePendiente.toFixed(2)}</span>
                </div>
              </div>
              
              <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="bg-blue-600 text-white text-[10px] font-black px-4 py-2.5 rounded-xl uppercase outline-none cursor-pointer">
                <option value="pendientes">PENDIENTES</option>
                <option value="devueltos">RECIBIDOS</option>
                <option value="todos">VER TODOS</option>
              </select>
            </div>

            <div className="flex-1 overflow-x-auto p-4">
              <table className="w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
                    <th className="px-4 py-2">Fecha</th>
                    <th className="px-4 py-2">Detalle</th>
                    <th className="px-4 py-2 text-center">Cant.</th>
                    <th className="px-4 py-2 text-right">Garantía</th>
                    <th className="px-4 py-2 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {registrosFiltrados.map((item) => {
                    const { dia, mes, esHoy } = formatFechaCorta(item.fecha);
                    const esReciente = item.id === nuevoId;

                    return (
                      <tr key={item.id} className={`transition-all duration-700 ${esReciente ? 'scale-[1.03] z-50 relative' : ''}`}>
                        <td className={`px-4 py-4 rounded-l-3xl transition-all duration-700 ${
                          esReciente ? 'bg-blue-600 border-y-4 border-l-4 border-blue-400 shadow-[-10px_0_20px_rgba(37,99,235,0.2)]' : 'bg-slate-50'
                        }`}>
                          <div className="flex flex-col items-center">
                            <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl border transition-all ${
                              esReciente ? 'bg-white text-blue-600 border-white' : esHoy ? 'bg-blue-600 border-blue-700 text-white' : 'bg-slate-100 border-slate-200 text-slate-900'
                            }`}>
                              <span className="text-lg font-black leading-none">{dia}</span>
                              <span className="text-[8px] font-black mt-1 uppercase">{mes}</span>
                            </div>
                          </div>
                        </td>
                        <td className={`px-4 py-4 text-left transition-all duration-700 ${esReciente ? 'bg-blue-600 border-y-4 border-blue-400' : 'bg-slate-50'}`}>
                          <p className={`text-[10px] font-black uppercase mb-1 ${esReciente ? 'text-blue-100' : 'text-slate-400'}`}>{item.cliente}</p>
                          <p className={`text-sm font-black uppercase italic leading-none ${esReciente ? 'text-white' : 'text-slate-900'}`}>{item.envase}</p>
                        </td>
                        <td className={`px-4 py-4 text-center transition-all duration-700 ${esReciente ? 'bg-blue-600 border-y-4 border-blue-400' : 'bg-slate-50'}`}>
                          <span className={`text-xl font-black font-mono ${esReciente ? 'text-white' : 'text-blue-600'}`}>{item.cantidad}</span>
                        </td>
                        <td className={`px-4 py-4 text-right transition-all duration-700 ${esReciente ? 'bg-blue-600 border-y-4 border-blue-400' : 'bg-slate-50'}`}>
                          <p className={`text-lg font-black font-mono ${esReciente ? 'text-white' : 'text-slate-900'}`}>S/ {Number(item.dinero).toFixed(2)}</p>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${esReciente ? 'bg-blue-400 text-white border border-blue-300' : (item.pago === 'Yape' ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600')}`}>{item.pago}</span>
                        </td>
                        <td className={`px-4 py-4 rounded-r-3xl text-center transition-all duration-700 ${esReciente ? 'bg-blue-600 border-y-4 border-r-4 border-blue-400 shadow-[10px_0_20px_rgba(37,99,235,0.2)]' : 'bg-slate-50'}`}>
                          <button 
                            onClick={() => toggleDevuelto(item.id, item.devuelto)} 
                            className={`text-[10px] font-black px-5 py-2.5 rounded-xl transition-all border-2 ${
                              item.devuelto === 1 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                              : (esReciente ? 'bg-white text-blue-600 border-white animate-pulse' : 'bg-rose-50 text-rose-600 border-rose-100')
                            }`}
                          >
                            {item.devuelto === 1 ? 'RECIBIDO' : 'PENDIENTE'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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