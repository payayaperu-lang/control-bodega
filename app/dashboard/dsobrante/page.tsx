"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";

export default function DineroSobranteAdminPage() {
  const [registros, setRegistros] = useState<any[]>([]);
  const [productosFaltantes, setProductosFaltantes] = useState<any[]>([]); 
  const [montoFaltanteTotal, setMontoFaltanteTotal] = useState(0); 
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false); 
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ cajero: "", dinero: "", tipo: "1" });

  const [filtroCajero, setFiltroCajero] = useState("todos");
  const [nuevo, setNuevo] = useState({ cajero: "", dinero: "", tipo: "1" });
  const listaCajeros = ["Katherine", "Maria", "Enma", "Nicol","Axel"];

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

  const totalSobranteAcumulado = registros.reduce((acc, r) => acc + (parseFloat(r.dinero) || 0), 0);
  const totalUnidadesFaltantes = productosFaltantes.reduce((acc, p) => acc + (Number(p.cantidad) || 0), 0);
  const diferenciaMatch = totalSobranteAcumulado - montoFaltanteTotal;

  useEffect(() => { fetchDatos(); }, [fechaDesde, fechaHasta, filtroCajero]);

  async function fetchDatos() {
    setLoading(true);
    let querySob = supabase.from("dine_sobrante").select("*").order("id", { ascending: false });
    let queryProd = supabase.from("prod_faltantes").select("cantidad, precio");
    if (fechaDesde && fechaHasta) {
      querySob = querySob.gte("fecha", fechaDesde).lte("fecha", fechaHasta);
      queryProd = queryProd.gte("fecha", fechaDesde).lte("fecha", fechaHasta);
    }
    if (filtroCajero !== "todos") querySob = querySob.eq("cajero", filtroCajero);
    const { data: dataSob } = await querySob;
    const { data: dataProd } = await queryProd;
    setRegistros(dataSob || []);
    setProductosFaltantes(dataProd || []);
    const sumaProd = dataProd?.reduce((acc, curr) => acc + (Number(curr.cantidad) * Number(curr.precio) || 0), 0) || 0;
    setMontoFaltanteTotal(sumaProd);
    setLoading(false);
  }

  async function guardarSobrante() {
    const monto = parseFloat(nuevo.dinero);
    if (!nuevo.cajero || !nuevo.dinero || isNaN(monto) || monto <= 0 || isSaving) return;
    setIsSaving(true);
    const { error } = await supabase.from("dine_sobrante").insert([{ 
      cajero: nuevo.cajero, dinero: monto, tipo: parseInt(nuevo.tipo), fecha: hoyStr 
    }]);
    if (!error) { 
      setNuevo({ ...nuevo, dinero: "" }); 
      fetchDatos();
      setShowSuccessPopup(true);
      setTimeout(() => setShowSuccessPopup(false), 2500); 
    }
    setIsSaving(false);
  }

  const iniciarEdicion = (item: any) => {
    setEditandoId(item.id);
    setEditForm({ cajero: item.cajero, dinero: item.dinero.toString(), tipo: item.tipo.toString() });
  };

  async function actualizarRegistro(id: number) {
    const monto = parseFloat(editForm.dinero);
    if (isNaN(monto) || monto <= 0 || isSaving) return;
    setIsSaving(true);
    const { error } = await supabase.from("dine_sobrante").update({ 
      cajero: editForm.cajero, dinero: monto, tipo: parseInt(editForm.tipo) 
    }).eq("id", id);
    if (!error) { setEditandoId(null); fetchDatos(); }
    setIsSaving(false);
  }

  async function eliminarRegistro(id: number) {
    if (!confirm("¿Estás seguro de eliminar este registro?")) return;
    const { error } = await supabase.from("dine_sobrante").delete().eq("id", id);
    if (!error) fetchDatos();
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-4 text-slate-800 font-sans relative">
      
      {/* NOTIFICACIÓN ÉXITO */}
      <div className={`fixed top-6 right-6 z-[100] transition-all duration-500 transform ${showSuccessPopup ? 'translate-y-0 opacity-100' : '-translate-y-12 opacity-0'}`}>
        <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border-l-4 border-emerald-500 font-black uppercase italic text-[10px]">
          ✓ Ingreso Registrado
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <header className="flex flex-col xl:flex-row justify-between items-center gap-6 pt-4">
          <div>
            <h2 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em] mb-1 ml-1">Consolidado Administrativo</h2>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">
              AUDITORÍA<span className="text-emerald-600">.LOG</span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 bg-white p-3 rounded-[2.5rem] shadow-xl border border-slate-100">
            <div className="flex flex-wrap gap-3 px-4">
              <div className="flex flex-col">
                <label className="text-[9px] font-black text-slate-400 uppercase mb-1 italic">Desde</label>
                <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="text-xs font-black outline-none bg-transparent text-slate-900" />
              </div>
              <div className="flex flex-col">
                <label className="text-[9px] font-black text-slate-400 uppercase mb-1 italic">Hasta</label>
                <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="text-xs font-black outline-none bg-transparent text-slate-900" />
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 cursor-pointer" onClick={togglePeriodo}>
              <span className={`text-[10px] font-black uppercase ${esSemana ? 'text-emerald-600' : 'text-slate-300'}`}>Semana</span>
              <div className={`relative w-16 h-8 rounded-full transition-colors ${esMes ? 'bg-slate-900' : 'bg-emerald-600'}`}>
                  <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform shadow-md ${esMes ? 'translate-x-8' : 'translate-x-0'}`} />
              </div>
              <span className={`text-[10px] font-black uppercase ${esMes ? 'text-slate-900' : 'text-slate-300'}`}>Mes</span>
            </div>

            <select value={filtroCajero} onChange={(e) => setFiltroCajero(e.target.value)} className="text-[10px] font-black p-3 bg-emerald-50 rounded-2xl outline-none uppercase text-emerald-700 px-8">
              <option value="todos">PERSONAL</option>
              {listaCajeros.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </header>

        {/* RESUMEN */}
        {/* RESUMEN ESTILO ENVASES */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Tarjeta 1: Acumulado Sobrante */}
          <div className="bg-white p-5 rounded-2xl border-2 border-slate-50 shadow-sm text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase mb-1 block tracking-widest italic">Efectivo Sobrante</span>
            <span className="text-4xl font-black text-emerald-600 tracking-tighter">
              S/ {totalSobranteAcumulado.toFixed(2)}
            </span>
          </div>

          {/* Tarjeta 2: Faltantes en Productos */}
          <div className="bg-white p-5 rounded-2xl border-2 border-slate-50 shadow-sm text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase mb-1 block tracking-widest italic">Pérdida Prod.</span>
            <span className="text-4xl font-black text-rose-600 tracking-tighter">
              S/ {montoFaltanteTotal.toFixed(2)}
            </span>
          </div>

          {/* Tarjeta 3: Balance (Ocupa 2 columnas) */}
          <div className={`p-5 rounded-2xl flex items-center justify-between col-span-1 md:col-span-2 text-white shadow-lg transition-colors duration-500 ${diferenciaMatch >= 0 ? 'bg-slate-900' : 'bg-rose-950'}`}>
            <div>
               <span className="text-[10px] font-bold opacity-70 uppercase block tracking-widest italic">
                {diferenciaMatch >= 0 ? "Balance Final" : "Déficit Total"}
               </span>
               <span className="text-4xl font-black tracking-tighter">
                 {diferenciaMatch >= 0 ? '+' : '-'} S/ {Math.abs(diferenciaMatch).toFixed(2)}
               </span>
            </div>
            <div className="text-right hidden sm:block">
              <div className={`text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-tighter ${diferenciaMatch >= 0 ? 'bg-emerald-500 text-white' : 'bg-rose-600 text-white'}`}>
                {diferenciaMatch >= 0 ? 'CAJA CUADRADA' : 'REVISAR CAJA'}
              </div>
            </div>
          </div>

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* FORMULARIO */}
          <div className="lg:col-span-4 bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 sticky top-8">
            <h3 className="text-[11px] font-black text-slate-900 uppercase italic tracking-widest border-b border-slate-100 pb-4 mb-6">Nuevo Excedente</h3>
            <div className="space-y-5" onKeyDown={(e) => e.key === "Enter" && guardarSobrante()}>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2 block mb-1">Cajero</label>
                <select value={nuevo.cajero} onChange={(e) => setNuevo({ ...nuevo, cajero: e.target.value })} className="w-full bg-slate-50 p-4 rounded-2xl text-xs font-black outline-none focus:border-emerald-500 uppercase italic text-slate-900">
                  <option value="">Seleccionar...</option>
                  {listaCajeros.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2 block mb-1">Método</label>
                <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
                  <button onClick={() => setNuevo({...nuevo, tipo: "1"})} className={`flex-1 py-3 rounded-xl text-[9px] font-black transition-all ${nuevo.tipo === "1" ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400'}`}>EFECTIVO</button>
                  <button onClick={() => setNuevo({...nuevo, tipo: "0"})} className={`flex-1 py-3 rounded-xl text-[9px] font-black transition-all ${nuevo.tipo === "0" ? 'bg-[#7322e1] text-white shadow-md' : 'text-slate-400'}`}>YAPE</button>
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2 block mb-1">Monto (S/)</label>
                <input placeholder="0.00" type="number" step="0.10" value={nuevo.dinero} onChange={(e) => setNuevo({ ...nuevo, dinero: e.target.value })} className="w-full bg-slate-50 p-4 rounded-2xl text-2xl font-black outline-none border-b-4 border-emerald-500 text-slate-900" />
              </div>
              <button disabled={isSaving || !nuevo.cajero || parseFloat(nuevo.dinero) <= 0} onClick={guardarSobrante} className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl uppercase text-[10px] tracking-widest italic disabled:opacity-50">
                {isSaving ? "GUARDANDO..." : "Validar Ingreso"}
              </button>
            </div>
          </div>

          {/* TABLA HISTORIAL */}
          <div className="lg:col-span-8 bg-white rounded-[3rem] shadow-xl overflow-hidden border border-slate-100 flex flex-col h-[700px]">
            <div className="bg-slate-900 p-6 px-10 flex justify-between items-center border-b border-emerald-500 z-30">
              <h3 className="text-lg font-black text-white uppercase italic">HISTORIAL {esMes ? "DEL MES" : "DE SEMANA"}</h3>
              <span className="text-[10px] font-black text-emerald-400 bg-slate-800 px-4 py-2 rounded-xl uppercase tracking-widest">{registros.length} MOVIMIENTOS</span>
            </div>

            <div className="bg-white px-10 py-4 border-b border-slate-100 z-20">
              <div className="grid grid-cols-6 w-full text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span className="col-span-1">Fecha</span>
                <span className="col-span-1">Cajero</span>
                <span className="col-span-1 text-center">Método</span>
                <span className="col-span-1 text-right">Total</span>
                <span className="col-span-2 text-center">Acciones</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-hide bg-white">
              <table className="w-full border-separate border-spacing-y-2">
                  <tbody>
                  {registros.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-5 bg-slate-50 rounded-l-2xl text-[11px] font-bold text-slate-400 font-mono italic">{item.fecha}</td>
                        
                        <td className="px-6 py-5 bg-slate-50 font-black text-slate-900 uppercase text-sm italic">
                          {editandoId === item.id ? (
                            <select value={editForm.cajero} onChange={(e) => setEditForm({...editForm, cajero: e.target.value})} className="w-full bg-white border border-emerald-500 rounded-lg p-2 text-xs font-black outline-none">
                              {listaCajeros.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          ) : item.cajero}
                        </td>

                        <td className="px-6 py-5 bg-slate-50 text-center">
                          {editandoId === item.id ? (
                            <div className="flex gap-1 justify-center">
                                <button onClick={() => setEditForm({...editForm, tipo: "1"})} className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${editForm.tipo === "1" ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-400'}`}>E</button>
                                <button onClick={() => setEditForm({...editForm, tipo: "0"})} className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${editForm.tipo === "0" ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>Y</button>
                            </div>
                          ) : (
                            <span className={`text-[8px] font-black px-3 py-1.5 rounded-xl uppercase ${item.tipo == 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                              {item.tipo == 0 ? "Yape" : "Efectivo"}
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-5 bg-slate-50 text-right">
                            {editandoId === item.id ? (
                              <input type="number" value={editForm.dinero} onChange={(e) => setEditForm({...editForm, dinero: e.target.value})} onKeyDown={(e) => e.key === "Enter" && actualizarRegistro(item.id)} className="w-20 bg-white border border-emerald-500 rounded-lg p-2 text-right text-xs font-black outline-none text-slate-900" />
                            ) : (
                              <p className="text-xl font-black text-emerald-600 font-mono italic">{parseFloat(item.dinero).toFixed(2)}</p>
                            )}
                        </td>

                        <td className="px-6 py-5 bg-slate-50 rounded-r-2xl text-center">
                          {editandoId === item.id ? (
                            <div className="flex gap-2 justify-center">
                              <button onClick={() => actualizarRegistro(item.id)} className="bg-emerald-600 text-white p-2 px-4 rounded-xl text-[9px] font-black shadow-lg">OK</button>
                              <button onClick={() => setEditandoId(null)} className="bg-rose-600 text-white p-2 px-4 rounded-xl text-[9px] font-black shadow-lg">✖</button>
                            </div>
                          ) : (
                            <div className="flex gap-2 justify-center">
                              <button onClick={() => iniciarEdicion(item)} 
                              className="bg-slate-900 text-white p-3 rounded-xl hover:bg-indigo-600 transition-colors shadow-sm"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>
                              </svg></button>
                              <button onClick={() => eliminarRegistro(item.id)} className="bg-white text-rose-500 border-2 border-rose-50 p-3 rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                              </svg></button>
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
    </div>
  );
}