"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";

export default function PanelAdminAuditoriaPage() {
  // CONTROL DE PESTAÑA: "faltantes" o "sobrantes"
  const [tab, setTab] = useState<"faltantes" | "sobrantes">("faltantes");
  
  // ESTADOS PRINCIPALES
  const [productos, setProductos] = useState<any[]>([]);
  const [sobranteTotal, setSobranteTotal] = useState(0); 
  const [montoFaltantes, setMontoFaltantes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  // FORMULARIOS DE INSERCIÓN Y EDICIÓN
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [nuevo, setNuevo] = useState({ producto: "", cantidad: "1", precio: "" });

  // SISTEMA DE FECHAS ESTABLE
  const getLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const dates = useMemo(() => {
    const hoy = new Date();
    const diaSemana = hoy.getDay();
    const difLunes = hoy.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1);
    const lunesDate = new Date(new Date().setDate(difLunes));
    const domingoDate = new Date(new Date(lunesDate).setDate(lunesDate.getDate() + 6));
    
    return { 
      lunes: getLocalDate(lunesDate), 
      domingo: getLocalDate(domingoDate), 
      inicioMes: getLocalDate(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), 
      finMes: getLocalDate(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)), 
      hoyStr: getLocalDate(hoy) 
    };
  }, []);

  const [fechaDesde, setFechaDesde] = useState(dates.lunes); 
  const [fechaHasta, setFechaHasta] = useState(dates.domingo);

  const esSemanaActual = fechaDesde === dates.lunes && fechaHasta === dates.domingo;
  const esMesActual = fechaDesde === dates.inicioMes && fechaHasta === dates.finMes;

  // CONFIGURACIÓN DINÁMICA DE ELEMENTOS SEGÚN LA PESTAÑA
  const CONFIG = {
    faltantes: {
      text: "text-orange-600",
      bgBtn: "bg-orange-600",
      borderBtn: "border-orange-800",
      borderCard: "border-orange-600",
      label: "FALTANTE.PROD",
      subLabel: "Bodega Payaya"
    },
    sobrantes: {
      text: "text-indigo-600",
      bgBtn: "bg-indigo-600",
      borderBtn: "border-indigo-800",
      borderCard: "border-indigo-600",
      label: "INVENTARIO.SOB",
      subLabel: "Bodega Payaya"
    }
  }[tab];

  // CÁLCULOS COMPARATIVOS
  const diferenciaMatch = sobranteTotal - montoFaltantes;
  const registroValido = nuevo.producto.trim() !== "" && Number(nuevo.cantidad) > 0 && Number(nuevo.precio) > 0;

  useEffect(() => { 
    fetchDatos(); 
  }, [fechaDesde, fechaHasta, tab]);

  const togglePeriodo = () => {
    if (esSemanaActual) {
      setFechaDesde(dates.inicioMes);
      setFechaHasta(dates.finMes);
    } else {
      setFechaDesde(dates.lunes);
      setFechaHasta(dates.domingo);
    }
  };

  async function fetchDatos() {
    setLoading(true);
    // Definimos la tabla de la pestaña actual en caliente para evitar bugs asíncronos en clicks rápidos
    const tablaActual = tab === "faltantes" ? "prod_faltantes" : "prod_sobrante";

    let qProdActive = supabase.from(tablaActual).select("*").order("id", { ascending: false });
    let qDineSob = supabase.from("dine_sobrante").select("dinero");
    let qProdSobGlobal = supabase.from("prod_sobrante").select("precio, cantidad");
    let qFaltantesGlobal = supabase.from("prod_faltantes").select("cantidad, precio");

    if (fechaDesde && fechaHasta) {
      qProdActive = qProdActive.gte("fecha", fechaDesde).lte("fecha", fechaHasta);
      qDineSob = qDineSob.gte("fecha", fechaDesde).lte("fecha", fechaHasta);
      qProdSobGlobal = qProdSobGlobal.gte("fecha", fechaDesde).lte("fecha", fechaHasta);
      qFaltantesGlobal = qFaltantesGlobal.gte("fecha", fechaDesde).lte("fecha", fechaHasta);
    }

    const [resActive, resDine, resProdSob, resFalt] = await Promise.all([
      qProdActive,
      qDineSob,
      qProdSobGlobal,
      qFaltantesGlobal
    ]);

    setProductos(resActive.data || []);
    
    const efectivo = resDine.data?.reduce((acc, c) => acc + (parseFloat(c.dinero) || 0), 0) || 0;
    const valorProdsSobrantes = resProdSob.data?.reduce((acc, c) => acc + (parseFloat(c.precio) * (Number(c.cantidad) || 1)), 0) || 0;
    
    setSobranteTotal(efectivo + valorProdsSobrantes);
    setMontoFaltantes(resFalt.data?.reduce((acc, c) => acc + (Number(c.cantidad) * Number(c.precio) || 0), 0) || 0);
    setLoading(false);
  }

  async function guardarRegistro() {
    if (!nuevo.producto || Number(nuevo.cantidad) <= 0 || Number(nuevo.precio) <= 0 || isSaving) return;
    setIsSaving(true);

    const tablaActual = tab === "faltantes" ? "prod_faltantes" : "prod_sobrante";

    const { error } = await supabase.from(tablaActual).insert([{
      producto: nuevo.producto.toUpperCase(),
      cantidad: parseInt(nuevo.cantidad),
      precio: parseFloat(nuevo.precio),
      fecha: dates.hoyStr
    }]);

    if (!error) { 
      setNuevo({ producto: "", cantidad: "1", precio: "" }); 
      setShowConfirm(true); 
      setTimeout(() => setShowConfirm(false), 2000);
      fetchDatos(); 
    }
    setIsSaving(false);
  }

  const startEditing = (item: any) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const handleSaveEdit = async () => {
    if (Number(editForm.cantidad) <= 0 || Number(editForm.precio) <= 0) {
      alert("Los valores deben ser mayores a cero");
      return;
    }
    if (isSaving) return;
    setIsSaving(true);

    const tablaActual = tab === "faltantes" ? "prod_faltantes" : "prod_sobrante";

    const { error } = await supabase.from(tablaActual)
      .update({
        producto: editForm.producto.toUpperCase(),
        cantidad: parseInt(editForm.cantidad),
        precio: parseFloat(editForm.precio)
      })
      .eq("id", editingId);
    
    if (!error) {
      setEditingId(null);
      fetchDatos();
    }
    setIsSaving(false);
  };

  const handleEliminar = async (id: number) => {
    if (confirm("¿Borrar definitivamente este registro?")) {
      const tablaActual = tab === "faltantes" ? "prod_faltantes" : "prod_sobrante";
      const { error } = await supabase.from(tablaActual).delete().eq("id", id);
      if (!error) fetchDatos();
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-5 min-h-screen flex flex-col relative font-sans text-slate-900 bg-slate-50">
      
      {/* TOAST FLOTANTE DE ACCIONES CORRECTAS */}
      <div className={`fixed top-6 right-6 z-[9999] transition-all duration-500 transform ${showConfirm ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'}`}>
        <div className="bg-slate-900 text-white p-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border-r-8 border-emerald-500 min-w-[280px]">
          <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white text-2xl shadow-lg font-bold">✓</div>
          <div>
            <p className="font-black uppercase italic text-sm text-emerald-400 leading-none">Proceso Exitoso</p>
            <p className="text-[9px] font-bold text-white uppercase tracking-widest mt-1">Base de Datos Actualizada</p>
          </div>
        </div>
      </div>

      {/* HEADER CONTROLS */}
      <header className="flex flex-col lg:flex-row justify-between items-center gap-6 pt-4">
        <div className="text-center lg:text-left">
          <h2 className={`text-[10px] font-black ${CONFIG.text} uppercase tracking-[0.4em] mb-1 ml-1`}>{CONFIG.subLabel}</h2>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">
            {tab === "faltantes" ? "FALTANTE" : "INVENTARIO"}<span className={CONFIG.text}>{tab === "faltantes" ? ".PROD" : ".SOB"}</span>
          </h1>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3 rounded-[2.5rem] shadow-xl border border-slate-100 w-full sm:w-auto">
          {/* SWITCH INTERCAMBIO DE PESTAÑAS - COMPORTAMIENTO ANTIDOBLE CLIC */}
          <div className="flex bg-slate-100 p-1 rounded-2xl w-full sm:w-auto">
            <button 
              onClick={() => {
                if (tab !== "faltantes") {
                  setTab("faltantes");
                } else {
                  fetchDatos(); // Fuerza la recarga si ya está activo
                }
              }} 
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${tab === "faltantes" ? "bg-orange-600 text-white shadow-md" : "text-slate-400 hover:text-slate-600"}`}
            >
              📉 Faltantes
            </button>
            <button 
              onClick={() => {
                if (tab !== "sobrantes") {
                  setTab("sobrantes");
                } else {
                  fetchDatos(); // Fuerza la recarga si ya está activo
                }
              }} 
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${tab === "sobrantes" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-slate-600"}`}
            >
              📦 Sobrantes
            </button>
          </div>

          <div className="h-px sm:h-6 w-full sm:w-px bg-slate-200" />

          {/* RANGOS DE FECHA Y SWITCH PERIODO */}
          <div className="flex items-center gap-4 w-full sm:w-auto justify-center">
            <div className="flex gap-4 px-2 text-slate-900 font-bold">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Desde</span>
                <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="text-xs font-black outline-none bg-transparent" />
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Hasta</span>
                <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="text-xs font-black outline-none bg-transparent" />
              </div>
            </div>
            
            <div className="flex items-center gap-3 px-2 cursor-pointer select-none" onClick={togglePeriodo}>
              <span className={`text-[10px] font-black uppercase ${esSemanaActual ? 'text-emerald-600' : 'text-slate-300'}`}>Semana</span>
              <div className={`relative w-14 h-7 rounded-full transition-all ${esMesActual ? 'bg-slate-900' : (tab === 'faltantes' ? 'bg-orange-600' : 'bg-indigo-600')}`}>
                  <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${esMesActual ? 'translate-x-7' : 'translate-x-0'}`} />
              </div>
              <span className={`text-[10px] font-black uppercase ${esMesActual ? (tab === 'faltantes' ? 'text-orange-500' : 'text-indigo-600') : 'text-slate-300'}`}>Mes</span>
            </div>
          </div>
        </div>
      </header>

      {/* METRIC CARDS RESUMEN COMPARTIDO */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-100 shadow-sm text-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase mb-1 block tracking-widest">Pérdida Prod.</span>
          <span className="text-4xl font-black text-rose-600 tracking-tighter">
            S/ {montoFaltantes.toFixed(2)}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border-2 border-slate-100 shadow-sm text-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase mb-1 block tracking-widest">Sobrante Total</span>
          <div className="flex flex-col">
            <span className="text-4xl font-black text-emerald-600 tracking-tighter">
              S/ {sobranteTotal.toFixed(2)}
            </span>
            <span className="text-[12px] font-black text-black-400 uppercase">
              Productos + Dinero Sobrantes
              </span>
          </div>
        </div>

        <div className={`${diferenciaMatch >= 0 ? 'bg-slate-900' : 'bg-rose-900'} p-5 rounded-2xl flex items-center justify-between col-span-2 text-white shadow-lg`}>
          <div>
             <span className="text-[10px] font-bold opacity-70 uppercase block tracking-widest">Balance Final</span>
             <span className="text-4xl font-black tracking-tighter">
               {diferenciaMatch >= 0 ? '+' : '-'} S/ {Math.abs(diferenciaMatch).toFixed(2)}
             </span>
          </div>
          <div className="text-right">
            <div className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${diferenciaMatch >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
              {diferenciaMatch >= 0 ? 'Utilidad Favorable' : 'Faltante Crítico'}
            </div>
          </div>
        </div>
      </div>

      {/* WORKSPACE CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* FORMULARIO ADAPTATIVO */}
        <div className={`lg:col-span-4 bg-white p-10 rounded-[3rem] shadow-2xl border-t-[10px] ${tab === 'faltantes' ? 'border-orange-600' : 'border-indigo-600'} sticky top-8`}>
          <h2 className="text-xs font-black text-slate-900 uppercase mb-8 tracking-[0.2em] italic border-b border-slate-100 pb-4 text-left">
            NUEVO REGISTRO ({tab.toUpperCase()})
          </h2>
          <div className="space-y-5" onKeyDown={(e) => e.key === "Enter" && registroValido && guardarRegistro()}>
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block">
                {tab === "faltantes" ? "Producto" : "Descripción"}
              </label>
              <input 
                placeholder="NOMBRE O DESCRIPCIÓN..." 
                value={nuevo.producto} 
                onChange={(e) => setNuevo({ ...nuevo, producto: e.target.value })} 
                className={`w-full bg-slate-50 p-5 rounded-2xl text-sm font-black outline-none border-2 border-transparent uppercase text-slate-900 placeholder:text-slate-300 ${tab === 'faltantes' ? 'focus:border-orange-500' : 'focus:border-indigo-500'}`} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block">Cant.</label>
                <input type="number" min="1" placeholder="0" value={nuevo.cantidad} onChange={(e) => setNuevo({ ...nuevo, cantidad: e.target.value })} className="w-full bg-slate-50 p-5 rounded-2xl text-sm font-black outline-none text-slate-900" />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block">Precio S/</label>
                <input type="number" step="0.10" min="0.10" placeholder="0.00" value={nuevo.precio} onChange={(e) => setNuevo({ ...nuevo, precio: e.target.value })} className="w-full bg-slate-50 p-5 rounded-2xl text-sm font-black outline-none text-slate-900 font-mono" />
              </div>
            </div>
            <button 
              onClick={guardarRegistro} 
              disabled={!registroValido || isSaving}
              className={`w-full font-black py-6 rounded-2xl shadow-xl uppercase text-xs tracking-widest italic transition-all ${registroValido ? 'bg-slate-900 text-white hover:opacity-90' : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'}`}
            >
              {isSaving ? "PROCESANDO..." : "GUARDAR"}
            </button>
          </div>
        </div>

        {/* HISTORIAL GENERAL ADAPTATIVO */}
        <div className="lg:col-span-8 bg-white rounded-[3rem] shadow-xl border border-slate-200 flex flex-col h-[600px] overflow-hidden">
          <div className={`bg-slate-900 p-6 px-10 border-b-4 ${tab === 'faltantes' ? 'border-orange-600' : 'border-indigo-600'} flex justify-between items-center shrink-0`}>
            <h3 className="text-white font-black uppercase italic tracking-widest text-sm">
               {esMesActual ? "HISTORIAL DEL MES" : "HISTORIAL SEMANAL"} ({tab.toUpperCase()})
            </h3>
            <span className="text-[10px] font-black bg-white text-slate-900 px-4 py-1.5 rounded-full uppercase">
              {productos.length} REPORTE(S)
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-white z-10 shadow-sm">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-10 py-6 text-left border-b border-slate-50">Fecha</th>
                  <th className="px-10 py-6 text-left border-b border-slate-50">Producto</th>
                  <th className="px-6 py-6 text-center border-b border-slate-50">Cant.</th>
                  <th className="px-6 py-6 text-right border-b border-slate-50">Precio</th>
                  <th className="px-10 py-6 text-center border-b border-slate-50">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {productos.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    {editingId === item.id ? (
                      <td colSpan={5} className={`p-4 ${tab === 'faltantes' ? 'bg-orange-50' : 'bg-indigo-50/50'}`}>
                        <div className="flex gap-3 items-center" onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}>
                          <input value={editForm.producto} onChange={(e) => setEditForm({...editForm, producto: e.target.value})} className={`flex-1 bg-white p-3 rounded-xl font-black uppercase text-xs border-2 text-slate-900 outline-none ${tab === 'faltantes' ? 'border-orange-300' : 'border-indigo-200'}`} autoFocus />
                          <input type="number" min="1" value={editForm.cantidad} onChange={(e) => setEditForm({...editForm, cantidad: parseInt(e.target.value) || 1})} className={`w-16 bg-white p-3 rounded-xl font-black text-center text-xs border-2 text-slate-900 outline-none ${tab === 'faltantes' ? 'border-orange-300' : 'border-indigo-200'}`} />
                          <input type="number" step="0.1" min="0.1" value={editForm.precio} onChange={(e) => setEditForm({...editForm, precio: e.target.value})} className={`w-24 bg-white p-3 rounded-xl font-black text-right text-xs border-2 text-slate-900 font-mono outline-none ${tab === 'faltantes' ? 'border-orange-300' : 'border-indigo-200'}`} />
                          <button onClick={handleSaveEdit} className="bg-emerald-600 text-white p-3 rounded-xl shadow-md font-bold text-xs">OK</button>
                          <button onClick={() => setEditingId(null)} className="bg-slate-300 text-slate-700 p-3 rounded-xl text-xs">✕</button>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="px-10 py-5">
                          <div className="text-[12px] font-black text-slate-600 font-mono">{item.fecha}</div>
                        </td>
                        <td className="px-10 py-5">
                          <div className="font-black text-slate-900 uppercase text-sm italic">{item.producto}</div>
                        </td>
                        <td className={`px-6 py-5 text-center font-black text-base ${tab === 'faltantes' ? 'text-orange-600' : 'text-indigo-600'}`}>
                          {item.cantidad || 1}
                        </td>
                        <td className="px-6 py-5 text-right font-black text-slate-900 font-mono text-sm italic">
                          S/ {parseFloat(item.precio).toFixed(2)}
                        </td>
                        <td className="px-10 py-5">
                          <div className="flex gap-2 justify-center">
                            <button onClick={() => startEditing(item)} className={`text-white p-3 rounded-xl transition-colors shadow-sm bg-slate-900 ${tab === 'faltantes' ? 'hover:bg-orange-600' : 'hover:bg-indigo-600'}`}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                            </button>
                            <button onClick={() => handleEliminar(item.id)} className="bg-white text-rose-600 border-2 border-rose-50 p-3 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {productos.length === 0 && !loading && (
              <div className="p-20 text-center text-slate-300 font-black uppercase text-xs tracking-[0.3em]">
                Sin registros en esta categoría
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}