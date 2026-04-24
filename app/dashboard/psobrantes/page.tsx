"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";

export default function ProductoSobrantePage() {
  const [productos, setProductos] = useState<any[]>([]);
  const [montoDineSobrante, setMontoDineSobrante] = useState(0);
  const [montoFaltantes, setMontoFaltantes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false); 
  
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [nuevo, setNuevo] = useState({ producto: "", cantidad: "1", precio: "" });

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ producto: "", cantidad: 0, precio: "" });

  const getLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const { lunesActual, domingoActual, primerDiaMes, ultimoDiaMes, hoyStr } = useMemo(() => {
    const hoy = new Date();
    const diaSemana = hoy.getDay(); 
    const dif = hoy.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1);
    const lunesDate = new Date(new Date().setDate(dif));
    const domingoDate = new Date(new Date(lunesDate).setDate(lunesDate.getDate() + 6));
    return { 
      lunesActual: getLocalDate(lunesDate), 
      domingoActual: getLocalDate(domingoDate), 
      primerDiaMes: getLocalDate(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), 
      ultimoDiaMes: getLocalDate(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)), 
      hoyStr: getLocalDate(hoy) 
    };
  }, []);

  const [fechaDesde, setFechaDesde] = useState(lunesActual);
  const [fechaHasta, setFechaHasta] = useState(domingoActual);

  const esSemana = fechaDesde === lunesActual && fechaHasta === domingoActual;
  const esMes = fechaDesde === primerDiaMes && fechaHasta === ultimoDiaMes;

  const togglePeriodo = () => {
    if (esSemana) { setFechaDesde(primerDiaMes); setFechaHasta(ultimoDiaMes); } 
    else { setFechaDesde(lunesActual); setFechaHasta(domingoActual); }
  };

  const totalProdSobrante = useMemo(() => {
    return productos.reduce((acc, item) => acc + ((parseFloat(item.precio) || 0) * (item.cantidad || 1)), 0);
  }, [productos]);

  const totalSobranteGeneral = totalProdSobrante + montoDineSobrante;
  const balanceFinal = totalSobranteGeneral - montoFaltantes;

  useEffect(() => { fetchTodo(); }, [fechaDesde, fechaHasta]);

  async function fetchTodo() {
    setLoading(true);
    let qProdSob = supabase.from("prod_sobrante").select("*").order("id", { ascending: false });
    let qDineSob = supabase.from("dine_sobrante").select("dinero");
    let qFaltantes = supabase.from("prod_faltantes").select("cantidad, precio");

    if (fechaDesde && fechaHasta) {
      qProdSob = qProdSob.gte("fecha", fechaDesde).lte("fecha", fechaHasta);
      qDineSob = qDineSob.gte("fecha", fechaDesde).lte("fecha", fechaHasta);
      qFaltantes = qFaltantes.gte("fecha", fechaDesde).lte("fecha", fechaHasta);
    }

    const [resProd, resDine, resFalt] = await Promise.all([qProdSob, qDineSob, qFaltantes]);

    setProductos(resProd.data || []);
    setMontoDineSobrante(resDine.data?.reduce((acc, c) => acc + (parseFloat(c.dinero) || 0), 0) || 0);
    setMontoFaltantes(resFalt.data?.reduce((acc, c) => acc + (Number(c.cantidad) * Number(c.precio) || 0), 0) || 0);
    setLoading(false);
  }

  async function guardarSobrante() {
    if (!nuevo.producto || !nuevo.precio || parseInt(nuevo.cantidad) <= 0 || isSaving) return;
    setIsSaving(true);
    const { error } = await supabase.from("prod_sobrante").insert([{
      producto: nuevo.producto.toUpperCase(),
      cantidad: parseInt(nuevo.cantidad),
      precio: parseFloat(nuevo.precio),
      fecha: hoyStr 
    }]);

    if (!error) {
      setNuevo({ producto: "", cantidad: "1", precio: "" });
      await fetchTodo();
      setShowSuccessPopup(true);
      setTimeout(() => setShowSuccessPopup(false), 2500);
    }
    setIsSaving(false);
  }

  const iniciarEdicion = (item: any) => {
    setEditandoId(item.id);
    setEditForm({ producto: item.producto, cantidad: item.cantidad, precio: item.precio });
  };

  async function actualizarProducto(id: number) {
    if (isSaving) return;
    setIsSaving(true);
    const { error } = await supabase
      .from("prod_sobrante")
      .update({ 
        producto: editForm.producto.toUpperCase(), 
        cantidad: editForm.cantidad,
        precio: editForm.precio 
      })
      .eq("id", id);

    if (!error) {
      setEditandoId(null);
      await fetchTodo();
    }
    setIsSaving(false);
  }

  async function eliminarProducto(id: number) {
    if (!confirm("¿Eliminar este registro?")) return;
    const { error } = await supabase.from("prod_sobrante").delete().eq("id", id);
    if (!error) await fetchTodo();
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 min-h-screen flex flex-col relative bg-slate-50 font-sans">
      
      {/* TOAST DE ÉXITO */}
      <div className={`fixed top-6 right-6 z-[100] transition-all duration-500 transform ${showSuccessPopup ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'}`}>
        <div className="bg-slate-900 text-white p-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border-r-8 border-indigo-500 min-w-[280px]">
          <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white text-2xl shadow-lg font-bold">✓</div>
          <div>
            <p className="font-black uppercase italic text-sm text-indigo-400 leading-none">Registro Exitoso</p>
            <p className="text-[9px] font-bold text-white uppercase tracking-widest mt-1">Inventario Actualizado</p>
          </div>
        </div>
      </div>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-4">
        <div>
          <h2 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em] mb-1 ml-1">Bodega Payaya</h2>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">
            INVENTARIO<span className="text-indigo-600">.SOB</span>
          </h1>
        </div>

        <div className="flex items-center gap-4 bg-white p-3 rounded-[2.5rem] shadow-xl border border-slate-100">
            <div className="flex gap-3 px-4 border-r border-slate-100 text-slate-900 font-bold">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Desde</span>
                <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="text-xs font-black outline-none bg-transparent" />
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Hasta</span>
                <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="text-xs font-black outline-none bg-transparent" />
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 cursor-pointer select-none" onClick={togglePeriodo}>
              <span className={`text-[10px] font-black uppercase ${esSemana ? 'text-indigo-600' : 'text-slate-300'}`}>Semana</span>
              <div className={`relative w-14 h-7 rounded-full transition-colors ${esMes ? 'bg-slate-900' : 'bg-indigo-600'}`}>
                  <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${esMes ? 'translate-x-7' : 'translate-x-0'}`} />
              </div>
              <span className={`text-[10px] font-black uppercase ${esMes ? 'text-slate-900' : 'text-slate-300'}`}>Mes</span>
            </div>
        </div>
      </div>

      {/* TARJETAS DE RESUMEN - Estilo Limpio (Sin tantos colores) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 italic">Total Sobrantes</span>
          <div className="text-4xl font-black text-slate-900 italic tracking-tighter">S/ {totalSobranteGeneral.toFixed(2)}</div>
          <p className="text-[9px] font-bold text-slate-400 uppercase mt-2 tracking-widest">Prod Sobrante + Dine Sobrante</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 italic">Pérdida Prod.</span>
          <div className="text-4xl font-black text-slate-900 italic tracking-tighter">S/ {montoFaltantes.toFixed(2)}</div>
          <p className="text-[9px] font-bold text-rose-500 uppercase mt-2 tracking-widest italic">Total en faltantes</p>
        </div>

        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border-indigo-500">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 italic">Balance Operativo</span>
          <div className="text-4xl font-black text-white italic tracking-tighter">S/ {balanceFinal.toFixed(2)}</div>
          <p className={`text-[9px] font-bold uppercase mt-2 tracking-widest ${balanceFinal >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
            {balanceFinal >= 0 ? '✓ Utilidad favorable' : '⚠ Revisar descuadres'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 pb-10 items-start">
        
        {/* FORMULARIO */}
        <div className="lg:col-span-4 sticky top-4">
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl border-b-[12px] border-indigo-600">
            <div className="space-y-6" onKeyDown={(e) => e.key === "Enter" && !isSaving && guardarSobrante()}>
              <div>
                <label className="text-[10px] font-black text-indigo-600 uppercase mb-3 block tracking-widest ml-1">Nombre del Producto</label>
                <input 
                  placeholder="ESCRIBIR..." 
                  value={nuevo.producto} 
                  onChange={(e) => setNuevo({ ...nuevo, producto: e.target.value })} 
                  className="w-full bg-white border-2 border-slate-100 p-4 rounded-2xl text-sm font-black focus:border-indigo-600 outline-none uppercase text-slate-900 placeholder:text-slate-200 italic shadow-inner" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-indigo-600 uppercase mb-3 block tracking-widest ml-1">Cant.</label>
                  <input 
                    type="number" 
                    min="1"
                    value={nuevo.cantidad} 
                    onChange={(e) => setNuevo({ ...nuevo, cantidad: e.target.value })} 
                    className="w-full border-2 border-slate-100 bg-white p-4 rounded-2xl text-xl font-black focus:border-indigo-600 outline-none text-slate-900 shadow-inner" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-indigo-600 uppercase mb-3 block tracking-widest ml-1">Precio S/</label>
                  <input 
                    type="number" 
                    step="0.10" 
                    value={nuevo.precio} 
                    onChange={(e) => setNuevo({ ...nuevo, precio: e.target.value })} 
                    className="w-full border-2 border-slate-100 bg-white p-4 rounded-2xl text-xl font-black focus:border-indigo-600 outline-none text-slate-900 shadow-inner" 
                  />
                </div>
              </div>

              <button 
                disabled={isSaving || !nuevo.producto || parseFloat(nuevo.precio) <= 0}
                onClick={guardarSobrante} 
                className={`w-full font-black py-6 rounded-2xl shadow-xl uppercase text-xs tracking-widest transition-all italic ${
                    isSaving ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white active:translate-y-1'
                }`}
              >
                {isSaving ? "PROCESANDO..." : "REGISTRAR EN TABLA"}
              </button>
            </div>
          </div>
        </div>

        {/* TABLA DE HISTORIAL */}
        <div className="lg:col-span-8 bg-white rounded-[3rem] shadow-xl border border-slate-200 flex flex-col h-[650px] overflow-hidden">
          <div className="bg-slate-900 p-6 px-10 border-b-4 border-indigo-600 flex justify-between items-center shrink-0">
            <h3 className="text-white font-black uppercase italic tracking-widest text-sm">REGISTROS</h3>
            <span className="text-[10px] font-black bg-white text-slate-900 px-4 py-1.5 rounded-full uppercase">
              {productos.length} TOTAL
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-white z-10 shadow-sm">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-10 py-6 text-left border-b border-slate-50">Producto</th>
                  <th className="px-6 py-6 text-center border-b border-slate-50">Cant.</th>
                  <th className="px-6 py-6 text-right border-b border-slate-50">Precio</th>
                  <th className="px-10 py-6 text-center border-b border-slate-50">Opciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {productos.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    {editandoId === item.id ? (
                      <td colSpan={4} className="p-4 bg-indigo-50/50">
                        <div className="flex gap-3 items-center" onKeyDown={(e) => e.key === "Enter" && actualizarProducto(item.id)}>
                          <input 
                            value={editForm.producto} 
                            onChange={(e) => setEditForm({...editForm, producto: e.target.value})} 
                            className="flex-1 bg-white p-3 rounded-xl font-black uppercase text-xs border-2 border-indigo-200 outline-none text-slate-900" 
                            autoFocus
                          />
                          <input 
                            type="number" 
                            value={editForm.cantidad} 
                            onChange={(e) => setEditForm({...editForm, cantidad: parseInt(e.target.value)})} 
                            className="w-16 bg-white p-3 rounded-xl font-black text-center text-xs border-2 border-indigo-200 text-slate-900" 
                          />
                          <input 
                            type="number" 
                            step="0.1" 
                            value={editForm.precio} 
                            onChange={(e) => setEditForm({...editForm, precio: e.target.value})} 
                            className="w-24 bg-white p-3 rounded-xl font-black text-right text-xs border-2 border-indigo-200 text-slate-900" 
                          />
                          <button onClick={() => actualizarProducto(item.id)} className="bg-indigo-600 text-white p-3 rounded-xl shadow-md">OK</button>
                          <button onClick={() => setEditandoId(null)} className="bg-white text-slate-400 p-3 rounded-xl border border-slate-200">✕</button>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="px-10 py-5">
                          <div className="text-[8px] font-black text-slate-300 font-mono tracking-tighter uppercase">{item.fecha}</div>
                          <div className="font-black text-slate-900 uppercase text-sm italic">{item.producto}</div>
                        </td>
                        <td className="px-6 py-5 text-center font-black text-indigo-600 text-base">
                          {item.cantidad || 1}
                        </td>
                        <td className="px-6 py-5 text-right font-black text-slate-900 font-mono text-sm italic">
                          S/ {parseFloat(item.precio).toFixed(2)}
                        </td>
                        <td className="px-10 py-5 text-center">
                          <div className="flex gap-2 justify-center">
                            <button 
                              onClick={() => iniciarEdicion(item)} 
                              className="bg-slate-900 text-white p-3 rounded-xl hover:bg-indigo-600 transition-colors shadow-sm"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>
                              </svg>
                            </button>
                            <button 
                              onClick={() => eliminarProducto(item.id)} 
                              className="bg-white text-rose-500 border-2 border-rose-50 p-3 rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}