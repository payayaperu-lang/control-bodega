"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";

export default function ProductoSobrantePage() {
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false); 
  
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [nuevo, setNuevo] = useState({ producto: "", precio: "" });

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ producto: "", precio: "" });

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

  const totalDinero = useMemo(() => {
    return productos.reduce((acc, item) => acc + (parseFloat(item.precio) || 0), 0);
  }, [productos]);

  useEffect(() => { fetchSobrantes(); }, [fechaDesde, fechaHasta]);

  async function fetchSobrantes() {
    setLoading(true);
    let query = supabase.from("prod_sobrante").select("*").order("id", { ascending: false });
    if (fechaDesde && fechaHasta) {
      query = query.gte("fecha", fechaDesde).lte("fecha", fechaHasta);
    }
    const { data } = await query;
    setProductos(data || []);
    setLoading(false);
  }

  async function guardarSobrante() {
    if (!nuevo.producto || !nuevo.precio || isSaving) return;
    if (parseFloat(nuevo.precio) <= 0) return alert("⚠️ El precio debe ser mayor a cero");
    
    setIsSaving(true);
    const { error } = await supabase.from("prod_sobrante").insert([{
      producto: nuevo.producto.toUpperCase(),
      precio: nuevo.precio,
      fecha: hoyStr 
    }]);

    if (!error) {
      setNuevo({ producto: "", precio: "" });
      await fetchSobrantes();
      setShowSuccessPopup(true);
      setTimeout(() => setShowSuccessPopup(false), 2500);
    }
    setIsSaving(false);
  }

  const iniciarEdicion = (item: any) => {
    setEditandoId(item.id);
    setEditForm({ producto: item.producto, precio: item.precio });
  };

  async function actualizarProducto(id: number) {
    if (parseFloat(editForm.precio) <= 0) return alert("⚠️ El precio debe ser mayor a cero");
    if (isSaving) return;

    setIsSaving(true);
    const { error } = await supabase
      .from("prod_sobrante")
      .update({ 
        producto: editForm.producto.toUpperCase(), 
        precio: editForm.precio 
      })
      .eq("id", id);

    if (!error) {
      setEditandoId(null);
      await fetchSobrantes();
    }
    setIsSaving(false);
  }

  async function eliminarProducto(id: number) {
    if (!confirm("¿Eliminar este registro de producto sobrante?")) return;
    const { error } = await supabase.from("prod_sobrante").delete().eq("id", id);
    if (!error) await fetchSobrantes();
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
          <h2 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em] mb-1 ml-1">Control de Inventario</h2>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">
            SOBRANTE<span className="text-indigo-600">.PROD</span>
          </h1>
        </div>

        <div className="flex items-center gap-4 bg-white p-3 rounded-[2.5rem] shadow-xl border border-slate-100">
            <div className="flex gap-3 px-4 border-r border-slate-100">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Desde</span>
                <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="text-xs font-black outline-none bg-transparent text-slate-900" />
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-400 uppercase italic mb-1">Hasta</span>
                <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="text-xs font-black outline-none bg-transparent text-slate-900" />
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 pb-10 items-start">
        
        {/* FORMULARIO */}
        <div className="lg:col-span-4 sticky top-4">
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl border-b-[12px] border-indigo-600">
            <div className="space-y-6" onKeyDown={(e) => e.key === "Enter" && !isSaving && guardarSobrante()}>
              <div>
                <label className="text-[10px] font-black text-indigo-600 uppercase mb-3 block tracking-widest ml-1">Producto Encontrado</label>
                <input 
                  placeholder="NOMBRE..." 
                  value={nuevo.producto} 
                  onChange={(e) => setNuevo({ ...nuevo, producto: e.target.value })} 
                  className="w-full bg-slate-50 border-2 border-slate-200 p-4 rounded-2xl text-sm font-black focus:border-indigo-600 outline-none uppercase text-slate-900 placeholder:text-slate-300" 
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-indigo-600 uppercase mb-3 block tracking-widest ml-1">Precio Unitario</label>
                <input 
                    type="number" 
                    step="0.10" 
                    placeholder="0.00" 
                    value={nuevo.precio} 
                    onChange={(e) => setNuevo({ ...nuevo, precio: e.target.value })} 
                    className="w-full border-2 border-slate-200 bg-slate-50 p-5 rounded-2xl text-2xl font-black focus:border-indigo-600 outline-none text-slate-900" 
                />
              </div>
              <button 
                disabled={isSaving || !nuevo.producto || parseFloat(nuevo.precio) <= 0}
                onClick={guardarSobrante} 
                className={`w-full font-black py-6 rounded-2xl shadow-xl uppercase text-xs tracking-widest transition-all italic ${
                    isSaving ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white active:translate-y-1'
                }`}
              >
                {isSaving ? "PROCESANDO..." : "INGRESAR EXCEDENTE"}
              </button>
            </div>
          </div>
        </div>

        {/* TABLA */}
        <div className="lg:col-span-8 bg-white rounded-[3.5rem] shadow-xl border border-slate-200 flex flex-col h-[700px] overflow-hidden">
          <div className="bg-slate-900 p-6 px-10 flex justify-between items-center border-b border-indigo-500 shrink-0">
            <div>
              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Maestro</p>
              <h3 className="text-lg font-black text-white uppercase italic">HISTORIAL {esMes ? "DEL MES" : "DE SEMANA"}</h3>
            </div>
            <div className="flex gap-2">
              <span className="bg-slate-800 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase">{productos.length} ITEMS</span>
              <span className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[11px] font-black uppercase shadow-lg border-b-2 border-indigo-800">TOTAL: S/ {totalDinero.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-white px-10 py-4 border-b border-slate-100 z-20">
            <div className="flex w-full text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <span className="w-1/6">Fecha</span>
              <span className="w-2/6">Producto</span>
              <span className="w-1/6 text-right">Precio</span>
              <span className="w-2/6 text-center">Acciones</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4 bg-white scrollbar-hide">
            <table className="w-full border-separate border-spacing-y-2">
              <tbody>
                {productos.map((item) => (
                  <tr key={item.id} className="group">
                    <td className="w-1/6 px-6 py-4 bg-slate-50 rounded-l-2xl">
                      <p className="text-[10px] font-bold text-slate-500 font-mono italic">{item.fecha}</p>
                    </td>
                    
                    <td className="w-2/6 px-6 py-4 bg-slate-50">
                      {editandoId === item.id ? (
                        <input 
                          value={editForm.producto} 
                          onKeyDown={(e) => e.key === "Enter" && actualizarProducto(item.id)}
                          onChange={(e) => setEditForm({ ...editForm, producto: e.target.value })}
                          className="bg-white border-2 border-indigo-600 rounded-xl px-3 py-2 text-sm font-black uppercase w-full outline-none text-slate-900"
                          autoFocus
                        />
                      ) : (
                        <p className="text-sm font-black text-slate-900 uppercase tracking-tighter italic">{item.producto}</p>
                      )}
                    </td>

                    <td className="w-1/6 px-6 py-4 bg-slate-50 text-right">
                      {editandoId === item.id ? (
                        <input 
                          type="number" 
                          value={editForm.precio} 
                          onKeyDown={(e) => e.key === "Enter" && actualizarProducto(item.id)}
                          onChange={(e) => setEditForm({ ...editForm, precio: e.target.value })}
                          className="bg-white border-2 border-indigo-600 rounded-xl px-2 py-2 text-sm font-black w-20 text-right outline-none text-slate-900"
                        />
                      ) : (
                        <p className="text-lg font-black text-indigo-600 font-mono">{parseFloat(item.precio).toFixed(2)}</p>
                      )}
                    </td>

                    <td className="w-2/6 px-6 py-4 bg-slate-50 rounded-r-2xl text-center">
                      {editandoId === item.id ? (
                        <div className="flex gap-2 justify-center">
                          <button onClick={() => actualizarProducto(item.id)} className="bg-indigo-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase shadow-md active:scale-95 transition-all">OK</button>
                          <button onClick={() => setEditandoId(null)} className="bg-rose-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all">✖</button>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-center">
                          <button 
                            onClick={() => iniciarEdicion(item)} 
                            className="p-3 bg-white border border-slate-200 hover:bg-indigo-600 hover:text-white rounded-xl text-indigo-600 transition-all shadow-sm"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => eliminarProducto(item.id)} 
                            className="p-3 bg-white border border-slate-200 hover:bg-rose-50 rounded-xl text-rose-500 transition-all shadow-sm"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </td>
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