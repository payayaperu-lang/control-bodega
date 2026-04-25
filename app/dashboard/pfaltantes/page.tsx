"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";

export default function FaltantesPage() {
  const [productos, setProductos] = useState<any[]>([]);
  const [sobranteTotal, setSobranteTotal] = useState(0); 
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [nuevo, setNuevo] = useState({ producto: "", cantidad: "", precio: "" });

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

  const esSemanaActual = fechaDesde === dates.lunes && fechaHasta === dates.domingo;
  const esMesActual = fechaDesde === dates.inicioMes && fechaHasta === dates.finMes;

  const montoFaltanteAcumulado = productos.reduce((acc, p) => acc + (Number(p.cantidad) * Number(p.precio) || 0), 0);
  const diferenciaMatch = sobranteTotal - montoFaltanteAcumulado;

  // Validación rápida para el botón de registro
  const registroValido = nuevo.producto.trim() !== "" && Number(nuevo.cantidad) > 0 && Number(nuevo.precio) > 0;

  useEffect(() => { fetchDatos(); }, [fechaDesde, fechaHasta]);

  const togglePeriodo = () => {
    if (esSemanaActual) {
      setFechaDesde(dates.inicioMes);
      setFechaHasta(dates.finMes);
    } else {
      setFechaDesde(dates.lunes);
      setFechaHasta(dates.domingo);
    }
  };

  // Dentro de tu función fetchDatos, añade la consulta a prod_sobrante
async function fetchDatos() {
  setLoading(true);
  let qProd = supabase.from("prod_faltantes").select("*").order("id", { ascending: false });
  let qDineSob = supabase.from("dine_sobrante").select("dinero");
  let qProdSob = supabase.from("prod_sobrante").select("precio, cantidad"); // Traemos esto

  if (fechaDesde && fechaHasta) {
    qProd = qProd.gte("fecha", fechaDesde).lte("fecha", fechaHasta);
    qDineSob = qDineSob.gte("fecha", fechaDesde).lte("fecha", fechaHasta);
    qProdSob = qProdSob.gte("fecha", fechaDesde).lte("fecha", fechaHasta);
  }

  const { data: dP } = await qProd;
  const { data: dDS } = await qDineSob;
  const { data: dPS } = await qProdSob;

  setProductos(dP || []);
  
  // Sumamos Efectivo Sobrante + Valor de Productos Sobrantes
  const efectivo = dDS?.reduce((acc, c) => acc + (parseFloat(c.dinero) || 0), 0) || 0;
  const valorProds = dPS?.reduce((acc, c) => acc + (parseFloat(c.precio) * (c.cantidad || 1)), 0) || 0;
  
  setSobranteTotal(efectivo + valorProds); 
  setLoading(false);
}

  async function guardarProducto() {
    // Validación estricta: No permite menores o iguales a 0
    if (!nuevo.producto || Number(nuevo.cantidad) <= 0 || Number(nuevo.precio) <= 0) return;

    const { error } = await supabase.from("prod_faltantes").insert([{
      producto: nuevo.producto.toUpperCase(),
      cantidad: parseInt(nuevo.cantidad),
      precio: parseFloat(nuevo.precio),
      fecha: new Date().toISOString().split("T")[0]
    }]);
    if (!error) { 
      setNuevo({ producto: "", cantidad: "", precio: "" }); 
      setShowConfirm(true); 
      setTimeout(() => setShowConfirm(false), 2000);
      fetchDatos(); 
    }
  }

  const startEditing = (item: any) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const handleSaveEdit = async () => {
    // También validamos en edición
    if (Number(editForm.cantidad) <= 0 || Number(editForm.precio) <= 0) {
      alert("Los valores deben ser mayores a cero");
      return;
    }

    const { error } = await supabase.from("prod_faltantes")
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
  };

  const handleEliminar = async (id: number) => {
    if (confirm("¿Borrar definitivamente?")) {
      const { error } = await supabase.from("prod_faltantes").delete().eq("id", id);
      if (!error) fetchDatos();
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-5 min-h-screen flex flex-col relative font-sans text-slate-900">
      
      {showConfirm && (
        <div className="fixed top-6 right-6 z-[9999] animate-in slide-in-from-top">
          <div className="bg-emerald-600 text-white px-8 py-4 rounded-2xl shadow-2xl font-black uppercase text-xs border-b-4 border-emerald-800 tracking-widest">
            ✓ REGISTRADO
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h2 className="text-[10px] font-black text-orange-600 uppercase tracking-[0.4em] mb-1 ml-1">Bodega Payaya</h2>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">
            FALTANTE<span className="text-orange-600">.PROD</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-xl border border-slate-200">
          <div className="flex gap-4 px-4 border-r border-slate-100">
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
            <span className={`text-[10px] font-black uppercase ${esSemanaActual ? 'text-emerald-600' : 'text-slate-300'}`}>Semana</span>
            <div className={`relative w-14 h-7 rounded-full transition-all ${esMesActual ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${esMesActual ? 'translate-x-7' : 'translate-x-0'}`} />
            </div>
            <span className={`text-[10px] font-black uppercase ${esMesActual ? 'text-indigo-600' : 'text-slate-300'}`}>Mes</span>
          </div>
        </div>
      </header>

      {/* TARJETAS */}
      {/* STATS ESTILO ENVASES */}
<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  {/* Tarjeta 1: Pérdida */}
  <div className="bg-white p-5 rounded-2xl border-2 border-slate-50 shadow-sm text-center">
    <span className="text-[10px] font-bold text-slate-500 uppercase mb-1 block tracking-widest">Pérdida Prod.</span>
    <span className="text-4xl font-black text-rose-600 tracking-tighter">
      S/ {montoFaltanteAcumulado.toFixed(2)}
    </span>
  </div>

  {/* Tarjeta 2: Sobrante Acumulado (Efectivo + Prods) */}
  <div className="bg-white p-5 rounded-2xl border-2 border-slate-50 shadow-sm text-center">
    <span className="text-[10px] font-bold text-slate-500 uppercase mb-1 block tracking-widest">Sobrante Total</span>
    <div className="flex flex-col">
      <span className="text-4xl font-black text-emerald-600 tracking-tighter">
        S/ {sobranteTotal.toFixed(2)}
      </span>
      <span className="text-[8px] font-black text-emerald-400 uppercase">Prod Sobrante + Dine Sobrante</span>
    </div>
  </div>

  {/* Tarjeta 3: Balance Final (Ocupa 2 columnas) */}
  <div className={`${diferenciaMatch >= 0 ? 'bg-slate-900' : 'bg-rose-900'} p-5 rounded-2xl flex items-center justify-between col-span-2 text-white shadow-lg`}>
    <div>
       <span className="text-[10px] font-bold opacity-70 uppercase block tracking-widest">Balance Final</span>
       <span className="text-4xl font-black tracking-tighter">
         {diferenciaMatch >= 0 ? '+' : '-'} S/ {Math.abs(diferenciaMatch).toFixed(2)}
       </span>
    </div>
    <div className="text-right">
      <div className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${diferenciaMatch >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
        {diferenciaMatch >= 0 ? 'Cuadrado' : 'Faltante Crítico'}
      </div>
    </div>
  </div>
</div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* FORMULARIO */}
        <div className="lg:col-span-4 bg-white p-10 rounded-[3rem] shadow-2xl border-t-[10px] border-orange-600 sticky top-8">
          <h2 className="text-xs font-black text-slate-900 uppercase mb-8 tracking-[0.2em] italic border-b border-slate-100 pb-4 text-left">NUEVO REGISTRO</h2>
          <div className="space-y-5" onKeyDown={(e) => e.key === "Enter" && registroValido && guardarProducto()}>
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block">Producto</label>
              <input placeholder="NOMBRE..." value={nuevo.producto} onChange={(e) => setNuevo({ ...nuevo, producto: e.target.value })} className="w-full bg-slate-50 p-5 rounded-2xl text-sm font-black outline-none border-2 border-transparent uppercase focus:border-orange-500 text-slate-900 placeholder:text-slate-300" />
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
              onClick={guardarProducto} 
              disabled={!registroValido}
              className={`w-full font-black py-6 rounded-2xl shadow-xl uppercase text-xs tracking-widest italic transition-all ${registroValido ? 'bg-slate-900 text-white hover:bg-orange-600' : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'}`}
            >
              GUARDAR
            </button>
          </div>
        </div>

        {/* TABLA */}
        <div className="lg:col-span-8 bg-white rounded-[3rem] shadow-xl border border-slate-200 flex flex-col h-[600px] overflow-hidden">
          <div className="bg-slate-900 p-6 px-10 border-b-4 border-orange-600 flex justify-between items-center shrink-0">
            <h3 className="text-white font-black uppercase italic tracking-widest text-sm">
               {esMesActual ? "HISTORIAL DEL MES" : "HISTORIAL SEMANAL"}
            </h3>
            <span className="text-[10px] font-black bg-white text-slate-900 px-4 py-1.5 rounded-full uppercase">{productos.length} REPORTE(S)</span>
          </div>
          
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-white z-10 shadow-sm">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-10 py-6 text-left border-b border-slate-50">Fecha</th>
                  <th className="px-10 py-6 text-left border-b border-slate-50">Producto</th>
                  <th className="px-6 py-6 text-center border-b border-slate-50">Cant.</th>
                  <th className="px-6 py-6 text-right border-b border-slate-50">Monto</th>
                  <th className="px-10 py-6 text-center border-b border-slate-50">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {productos.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    {editingId === item.id ? (
                      <td colSpan={4} className="p-4 bg-orange-50">
                        <div className="flex gap-3 items-center">
                          <input value={editForm.producto} onChange={(e) => setEditForm({...editForm, producto: e.target.value})} className="flex-1 bg-white p-3 rounded-xl font-black uppercase text-xs border-2 border-orange-300 text-slate-900" />
                          <input type="number" min="1" value={editForm.cantidad} onChange={(e) => setEditForm({...editForm, cantidad: e.target.value})} className="w-16 bg-white p-3 rounded-xl font-black text-center text-xs border-2 border-orange-300 text-slate-900" />
                          <input type="number" step="0.1" min="0.1" value={editForm.precio} onChange={(e) => setEditForm({...editForm, precio: e.target.value})} className="w-24 bg-white p-3 rounded-xl font-black text-right text-xs border-2 border-orange-300 text-slate-900 font-mono" />
                          <button onClick={handleSaveEdit} className="bg-emerald-600 text-white p-3 rounded-xl shadow-md">OK</button>
                          <button onClick={() => setEditingId(null)} className="bg-slate-300 text-slate-700 p-3 rounded-xl">✕</button>
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
                        <td className="px-6 py-5 text-center font-black text-orange-600 text-base">{item.cantidad}</td>
                        <td className="px-6 py-5 text-right font-black text-slate-900 font-mono text-sm italic">S/ {parseFloat(item.precio).toFixed(2)}</td>
                        <td className="px-10 py-5">
                          <div className="flex gap-2 justify-center">
                            <button onClick={() => startEditing(item)} className="bg-slate-900 text-white p-3 rounded-xl hover:bg-orange-600 transition-colors shadow-sm">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                            </button>
                            <button onClick={() => handleEliminar(item.id)} className="bg-white text-rose-600 border-2 border-rose-50 p-3 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
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