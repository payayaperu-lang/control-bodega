"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "../../lib/supabase";

export default function VencimientosPage() {
  const [registros, setRegistros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [notificacion, setNotificacion] = useState<string | null>(null); 
  
  // Estado para controlar qué fila se acaba de guardar y aplicar la animación
  const [ultimoIdGuardado, setUltimoIdGuardado] = useState<any | null>(null);

  // 1. Lógica de fechas modificada: -30 días y +30 días
  const { hace30Dias, en30Dias, hoyStr } = useMemo(() => {
    const hoy = new Date();
    
    const formatLocal = (d: Date) => {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const fechaMenos30 = new Date(hoy);
    fechaMenos30.setDate(hoy.getDate() - 30);
    
    const fechaMas30 = new Date(hoy);
    fechaMas30.setDate(hoy.getDate() + 30);
    
    return { 
      hace30Dias: formatLocal(fechaMenos30), 
      en30Dias: formatLocal(fechaMas30), 
      hoyStr: formatLocal(hoy) 
    };
  }, []);

  // Inicializamos los estados con las nuevas fechas
  const [fechaDesde, setFechaDesde] = useState(hace30Dias);
  const [fechaHasta, setFechaHasta] = useState(en30Dias);

  const [confirmando, setConfirmando] = useState(false);
  const [editando, setEditando] = useState<any | null>(null); 
  const [bloqueoEnter, setBloqueoEnter] = useState(false);
  const btnConfirmarRef = useRef<HTMLButtonElement>(null);

  const [nuevo, setNuevo] = useState({ producto: "", cantidad: "", fecha_vencimiento: hoyStr });

  const resumenProductos = useMemo(() => {
    return registros.reduce((acc, item) => {
      const cant = parseInt(item.cantidad) || 0;
      acc.totalItems += cant;
      acc.totalLotes += 1;
      return acc;
    }, { totalItems: 0, totalLotes: 0 });
  }, [registros]);

  const formatFechaCorta = (fechaStr: string) => {
    if (!fechaStr) return { dia: "--", mes: "---" };
    const fecha = new Date(fechaStr + "T00:00:00");
    const dia = fecha.getDate();
    const mes = fecha.toLocaleString('es-ES', { month: 'short' }).replace('.', '').toUpperCase();
    return { dia, mes };
  };

  useEffect(() => { fetchDatos(); }, [fechaDesde, fechaHasta]);

  useEffect(() => {
    if (confirmando) {
      setBloqueoEnter(true);
      const timer = setTimeout(() => {
        btnConfirmarRef.current?.focus();
        setBloqueoEnter(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [confirmando]);

  useEffect(() => {
    if (notificacion) {
      const timer = setTimeout(() => setNotificacion(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notificacion]);

  // Limpiador del efecto de animación después de 2.5 segundos
  useEffect(() => {
    if (ultimoIdGuardado) {
      const timer = setTimeout(() => setUltimoIdGuardado(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [ultimoIdGuardado]);

  const asegurarVisibilidadFecha = (fechaDestino: string) => {
    if (fechaDestino < fechaDesde) setFechaDesde(fechaDestino);
    if (fechaDestino > fechaHasta) setFechaHasta(fechaDestino);
  };

  async function fetchDatos() {
    setLoading(true);
    let queryVenc = supabase.from("prod_vencimientos").select("*").order("fecha_vencimiento", { ascending: false });
    
    if (fechaDesde && fechaHasta) {
      queryVenc = queryVenc.gte("fecha_vencimiento", fechaDesde).lte("fecha_vencimiento", fechaHasta);
    }
    
    const { data, error } = await queryVenc;
    
    if (error) {
      alert(`⚠️ Error al conectar con Supabase: ${error.message}`);
    } else {
      setRegistros(data || []);
    }
    setLoading(false);
  }

  const prepararRegistro = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (procesando) return;
    if (!nuevo.producto.trim() || !nuevo.cantidad || parseInt(nuevo.cantidad) <= 0 || !nuevo.fecha_vencimiento) {
      return alert("⚠️ Completa todos los campos con valores válidos");
    }
    setConfirmando(true);
  };

  async function guardarVencimiento() {
    if (bloqueoEnter || procesando) return;
    setProcesando(true);

    // Agregado .select() al final para capturar los datos insertados (incluyendo el ID)
    const { data, error } = await supabase.from("prod_vencimientos").insert([{
      producto: nuevo.producto.toUpperCase().trim(),
      cantidad: parseInt(nuevo.cantidad),
      fecha_vencimiento: nuevo.fecha_vencimiento
    }]).select();

    if (!error) {
      setNotificacion(`ALERTA DE ${nuevo.producto.toUpperCase()} REGISTRADA`);
      asegurarVisibilidadFecha(nuevo.fecha_vencimiento);
      
      // Si Supabase nos devolvió la fila guardada, guardamos su ID para gatillar la animación
      if (data && data[0]) {
        setUltimoIdGuardado(data[0].id);
      }

      setNuevo({ producto: "", cantidad: "", fecha_vencimiento: hoyStr });
      setConfirmando(false);
      await fetchDatos();
    } else {
      alert(`Error al guardar: ${error.message}`);
    }
    setProcesando(false);
  }

  async function actualizarVencimiento() {
    if (procesando) return;
    
    if (!editando?.id) {
      return alert("⚠️ Error crítico: El registro no tiene un ID válido de base de datos.");
    }

    if (!editando.producto.trim() || !editando.cantidad || parseInt(editando.cantidad) <= 0 || !editando.fecha_vencimiento) {
      return alert("⚠️ Completa todos los campos con valores válidos");
    }

    setProcesando(true);

    const { error } = await supabase
      .from("prod_vencimientos")
      .update({
        producto: editando.producto.toUpperCase().trim(),
        cantidad: parseInt(editando.cantidad),
        fecha_vencimiento: editando.fecha_vencimiento
      })
      .eq("id", editando.id);

    if (!error) {
      setNotificacion("REGISTRO ACTUALIZADO");
      asegurarVisibilidadFecha(editando.fecha_vencimiento);
      setEditando(null);
      await fetchDatos();
    } else {
      alert(`Error al guardar cambios en Supabase: ${error.message}`);
    }
    setProcesando(false);
  }

  async function eliminarVencimiento() {
    if (procesando) return;
    
    if (!editando?.id) {
      return alert("⚠️ Error crítico: No se encontró el ID del registro a eliminar.");
    }

    setProcesando(true);

    const { error } = await supabase
      .from("prod_vencimientos")
      .delete()
      .eq("id", editando.id);

    if (!error) {
      setNotificacion("REGISTRO ELIMINADO CON ÉXITO");
      setEditando(null);
      await fetchDatos();
    } else {
      alert(`Error al eliminar de Supabase: ${error.message}`);
    }
    setProcesando(false);
  }

  return (
    <>
      {/* NOTIFICACIÓN FLOTANTE */}
      {notificacion && (
        <div className="fixed top-6 right-6 z-[1000] animate-in slide-in-from-right duration-500">
          <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border-l-4 border-amber-500 flex items-center gap-3">
            <div className="bg-amber-500/20 p-1 rounded-full text-amber-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
            <p className="text-[11px] font-black uppercase tracking-wider">{notificacion}</p>
          </div>
        </div>
      )}

      {/* POPUP DE CONFIRMACIÓN */}
      {confirmando && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md" onClick={() => !procesando && setConfirmando(false)}></div>
          <div className="bg-white rounded-[4rem] p-10 shadow-2xl border-t-[15px] border-amber-500 text-center relative z-10 max-w-sm w-full animate-in zoom-in duration-200">
            <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter mb-6 leading-none">ALERTAR<br/>VENCIMIENTO</h2>
            <div className="bg-slate-50 p-6 rounded-[2.5rem] border-2 border-slate-100 mb-8 space-y-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Producto a Monitorear</p>
                <p className="text-xl font-black text-slate-900 uppercase leading-tight">{nuevo.producto}</p>
              </div>
              <div className="pt-4 border-t-2 border-dashed border-slate-200 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Cantidad</p>
                  <p className="text-2xl font-black text-amber-600">{nuevo.cantidad} UDS</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Vence el</p>
                  <p className="text-sm font-black text-slate-700 mt-1 uppercase">
                    {formatFechaCorta(nuevo.fecha_vencimiento).dia} {formatFechaCorta(nuevo.fecha_vencimiento).mes}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <button disabled={procesando} onClick={() => setConfirmando(false)} className="flex-1 bg-slate-100 text-slate-500 font-black py-5 rounded-2xl uppercase text-[10px] disabled:opacity-50">CORREGIR</button>
              <button ref={btnConfirmarRef} disabled={procesando} onClick={guardarVencimiento} className="flex-1 bg-amber-500 text-white font-black py-5 rounded-2xl shadow-xl uppercase text-[10px] border-b-4 border-amber-800 active:border-b-0 disabled:opacity-50">
                {procesando ? "GUARDANDO..." : "CONFIRMAR"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP DE EDICIÓN Y ELIMINACIÓN */}
      {editando && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md" onClick={() => !procesando && setEditando(null)}></div>
          <div className="bg-white rounded-[4rem] p-10 shadow-2xl border-t-[15px] border-slate-900 text-center relative z-10 max-w-sm w-full animate-in zoom-in duration-200">
            <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter mb-6 leading-none">EDITAR<br/>LOTE</h2>
            
            <div className="space-y-4 text-left mb-6">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1 block mb-1">Producto</label>
                <input 
                  type="text" 
                  disabled={procesando}
                  value={editando.producto} 
                  onChange={(e) => setEditando({ ...editando, producto: e.target.value })} 
                  className="w-full border-2 border-slate-100 bg-slate-50 p-3 rounded-xl text-sm font-bold text-slate-900 uppercase outline-none focus:border-amber-500 disabled:opacity-50" 
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1 block mb-1">Cantidad</label>
                  <input 
                    type="number" 
                    disabled={procesando}
                    value={editando.cantidad} 
                    onChange={(e) => setEditando({ ...editando, cantidad: e.target.value })} 
                    className="w-full border-2 border-slate-100 bg-slate-50 p-3 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-amber-500 disabled:opacity-50" 
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1 block mb-1">F. Vencimiento</label>
                  <input 
                    type="date" 
                    disabled={procesando}
                    value={editando.fecha_vencimiento} 
                    onChange={(e) => setEditando({ ...editando, fecha_vencimiento: e.target.value })} 
                    className="w-full border-2 border-slate-100 bg-slate-50 p-3 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-amber-500 disabled:opacity-50" 
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 mb-6">
              <button disabled={procesando} onClick={() => setEditando(null)} className="flex-1 bg-slate-100 text-slate-500 font-black py-4 rounded-2xl uppercase text-[10px] disabled:opacity-50">CANCELAR</button>
              <button disabled={procesando} onClick={actualizarVencimiento} className="flex-1 bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl uppercase text-[10px] border-b-4 border-slate-700 active:border-b-0 disabled:opacity-50">
                {procesando ? "GUARDANDO..." : "ACTUALIZAR"}
              </button>
            </div>

            <button 
              type="button"
              disabled={procesando}
              onClick={() => {
                if(confirm(`⚠️ ¿ELIMINAR DEFINITIVAMENTE ${editando.producto}?`)) {
                  eliminarVencimiento();
                }
              }} 
              className="text-red-500 hover:text-red-700 text-[10px] font-black uppercase tracking-widest block mx-auto underline transition-colors pt-2 cursor-pointer disabled:opacity-40"
            >
              ❌ ELIMINAR ESTA ALERTA DEFINITIVAMENTE
            </button>
          </div>
        </div>
      )}

      {/* CONTENEDOR PRINCIPAL */}
      <div className="max-w-7xl mx-auto space-y-8 p-4 min-h-screen flex flex-col relative bg-slate-50">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between gap-6 shrink-0 pt-4">
          <div className="border-b border-slate-200 pb-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mb-1">Control de Calidad</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
              Lotes por<span className="text-amber-500"> Vencer</span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-[2.5rem] shadow-xl border border-slate-100">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-500">
              <span className="uppercase">Desde:</span>
              <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="p-2 bg-slate-100 rounded-xl outline-none font-bold text-slate-800" />
              <span className="uppercase ml-1">Hasta:</span>
              <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="p-2 bg-slate-100 rounded-xl outline-none font-bold text-slate-800" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 pb-10">
          
          {/* FORMULARIO */}
          <div className="lg:col-span-4 self-start sticky top-4">
            <div className="bg-white p-8 rounded-[3.5rem] shadow-2xl border-b-[12px] border-amber-500" onKeyDown={(e) => e.key === "Enter" && !confirmando && prepararRegistro()}>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-amber-500 uppercase mb-3 block tracking-widest ml-1">Producto</label>
                  <input 
                    type="text" 
                    value={nuevo.producto} 
                    onChange={(e) => setNuevo({ ...nuevo, producto: e.target.value })} 
                    className="w-full border-2 border-slate-100 bg-slate-50/50 p-4 rounded-2xl text-sm font-bold text-slate-900 placeholder-slate-300 outline-none focus:border-amber-500 uppercase transition-all" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-amber-500 uppercase mb-3 block tracking-widest ml-1">Cantidad</label>
                    <input 
                      type="number" 
                      placeholder="0" 
                      value={nuevo.cantidad} 
                      onChange={(e) => setNuevo({ ...nuevo, cantidad: e.target.value })} 
                      className="w-full border-2 border-slate-100 bg-slate-50/50 p-4 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:border-amber-500 transition-all" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-amber-500 uppercase mb-3 block tracking-widest ml-1">F. Vencimiento</label>
                    <input 
                      type="date" 
                      value={nuevo.fecha_vencimiento} 
                      onChange={(e) => setNuevo({ ...nuevo, fecha_vencimiento: e.target.value })} 
                      className="w-full border-2 border-slate-100 bg-slate-50/50 p-4 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:border-amber-500 transition-all" 
                    />
                  </div>
                </div>

                <button onClick={prepararRegistro} className="w-full bg-amber-500 text-white font-black py-6 rounded-2xl shadow-xl uppercase text-xs tracking-widest border-b-4 border-amber-800 active:border-b-0 hover:bg-amber-600 transition-all">REGISTRAR ALERTA</button>              
              </div>
            </div>
          </div>

          {/* TABLA DE REGISTROS */}
          <div className="lg:col-span-8 bg-white rounded-[3.5rem] shadow-xl border border-slate-100 flex flex-col overflow-hidden min-h-[500px]">
            <div className="bg-slate-900 p-7 flex flex-col sm:flex-row justify-between items-center gap-6 border-b border-amber-500">
              <div>
                 <p className="text-[9px] font-black text-amber-400 uppercase mb-1">Mermas y Rotación</p>
                 <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">LISTADO DE CONTROL</h3>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-slate-800/50 border border-slate-700 px-4 py-2 rounded-xl flex flex-col items-center min-w-[90px]">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Lotes</span>
                  <span className="text-sm font-black text-white font-mono leading-none">{resumenProductos.totalLotes}</span>
                </div>

                <div className="bg-amber-500 px-5 py-3 rounded-2xl flex flex-col items-center shadow-lg border-b-4 border-amber-700 min-w-[120px]">
                  <span className="text-[9px] font-black text-amber-100 uppercase tracking-tighter mb-0.5">Total Unidades</span>
                  <span className="text-lg font-black text-white font-mono leading-none tracking-tighter">{resumenProductos.totalItems} UDS</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-2">
              {loading ? (
                <div className="p-20 text-center text-slate-400 font-black uppercase text-xs tracking-widest">Cargando base de datos...</div>
              ) : (
                <table className="w-full border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
                      <th className="px-6 py-2">Vence</th>
                      <th className="px-6 py-2">Producto </th>
                      <th className="px-6 py-2 text-right">Cantidad / Editar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registros.map((item) => {
                      const { dia, mes } = formatFechaCorta(item.fecha_vencimiento);
                      const esVencido = item.fecha_vencimiento <= hoyStr;
                      
                      // Comprobamos si este elemento es el que se acaba de guardar
                      const esNuevo = item.id === ultimoIdGuardado;

                      return (
                        <tr 
                          key={item.id} 
                          className={`group transition-all duration-500 transform ${
                            esNuevo ? 'scale-[1.02] shadow-2xl z-10 relative' : ''
                          }`}
                        >
                          {/* Celda del Calendario */}
                          <td className={`px-6 py-3 rounded-l-2xl transition-colors duration-500 ${
                            esNuevo ? 'bg-amber-100' : 'bg-slate-50'
                          }`}>
                            <div className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl border ${
                              esVencido 
                                ? 'bg-red-600 border-red-600 shadow-sm text-white' 
                                : item.fecha_vencimiento === hoyStr 
                                  ? 'bg-amber-500 border-amber-500 text-white' 
                                  : 'bg-white border-slate-200'
                            }`}>
                              <span className="text-sm font-black leading-none">{dia}</span>
                              <span className={`text-[10px] font-black leading-none mt-0.5 ${
                                esVencido ? 'text-red-100' : 'text-amber-600'
                              }`}>{mes}</span>
                            </div>
                          </td>
                          
                          {/* Celda del Nombre del Producto */}
                          <td className={`px-6 py-3 transition-colors duration-500 ${
                            esNuevo ? 'bg-amber-100' : 'bg-slate-50'
                          }`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${esVencido ? 'bg-red-500 animate-ping' : 'bg-amber-400'}`}></div>
                              <div>
                                <p className="text-sm font-black text-slate-900 uppercase">{item.producto}</p>
                                {esVencido && <span className="text-[8px] font-black text-red-500 uppercase tracking-wider">⚠️ YA VENCIÓ</span>}
                              </div>
                            </div>
                          </td>

                          {/* Celda de Cantidad / Botón Editar */}
                          <td className={`px-6 py-3 rounded-r-2xl text-right transition-colors duration-500 ${
                            esNuevo ? 'bg-amber-100' : 'bg-slate-50'
                          }`}>
                            <div className="flex items-center justify-end gap-4">
                              <p className="text-xl font-black text-slate-900 font-mono">
                                {item.cantidad} <span className="text-xs text-slate-400 font-bold uppercase">Uds</span>
                              </p>
                              <button 
                                type="button"
                                onClick={() => setEditando({ ...item })} 
                                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                              >
                                ⚙️ Editar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              
              {registros.length === 0 && !loading && (
                <div className="p-20 text-center text-slate-300 font-black uppercase text-xs tracking-[0.3em]">Sin alertas en este rango de fechas</div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}