"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { supabase } from "../../lib/supabase";

export default function ProductoSobrantePage() {
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [bloqueoEnter, setBloqueoEnter] = useState(false); 
  const [notificacion, setNotificacion] = useState<string | null>(null); // Estado para Toast
  const btnConfirmarRef = useRef<HTMLButtonElement>(null);

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
  const [nuevo, setNuevo] = useState({ producto: "", cantidad: "", precio: "" });

  const esSemana = fechaDesde === lunesActual && fechaHasta === domingoActual;
  const esMes = fechaDesde === primerDiaMes && fechaHasta === ultimoDiaMes;

  const totalDinero = useMemo(() => {
    return productos.reduce((acc, item) => acc + (parseFloat(item.cantidad) * parseFloat(item.precio) || 0), 0);
  }, [productos]);

  // Función para formatear fecha a Día y Mes
  const formatFechaCorta = (fechaStr: string) => {
    const fecha = new Date(fechaStr + "T00:00:00");
    const dia = fecha.getDate();
    const mes = fecha.toLocaleString('es-ES', { month: 'short' }).replace('.', '').toUpperCase();
    return { dia, mes };
  };

  useEffect(() => { fetchSobrantes(); }, [fechaDesde, fechaHasta]);
  
  useEffect(() => {
    if (mostrarConfirmacion) {
      setBloqueoEnter(true);
      const timer = setTimeout(() => {
        btnConfirmarRef.current?.focus();
        setBloqueoEnter(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [mostrarConfirmacion]);

  // Autocerrar notificación
  useEffect(() => {
    if (notificacion) {
      const timer = setTimeout(() => setNotificacion(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notificacion]);

  const togglePeriodo = () => {
    if (esSemana) {
      setFechaDesde(primerDiaMes); setFechaHasta(ultimoDiaMes);
    } else {
      setFechaDesde(lunesActual); setFechaHasta(domingoActual);
    }
  };

  async function fetchSobrantes() {
    setLoading(true);
    let query = supabase.from("prod_sobrante").select("*").order("id", { ascending: false });
    if (fechaDesde && fechaHasta) query = query.gte("fecha", fechaDesde).lte("fecha", fechaHasta);
    const { data } = await query;
    setProductos(data || []);
    setLoading(false);
  }

  const revisarRegistro = (e?: React.FormEvent) => {
    e?.preventDefault();
    const cant = parseInt(nuevo.cantidad);
    const prec = parseFloat(nuevo.precio);
    if (!nuevo.producto || isNaN(cant) || isNaN(prec) || cant <= 0 || prec <= 0) {
      return alert("⚠️ Error: Completa los campos con valores mayores a 0");
    }
    setMostrarConfirmacion(true);
  };

  async function guardarSobrante() {
    if (bloqueoEnter) return;
    const { error } = await supabase.from("prod_sobrante").insert([{
      producto: nuevo.producto.toUpperCase(),
      cantidad: parseInt(nuevo.cantidad),
      precio: parseFloat(nuevo.precio),
      fecha: hoyStr 
    }]);

    if (!error) {
      setNotificacion(`${nuevo.producto.toUpperCase()} AGREGADO`);
      setNuevo({ producto: "", cantidad: "", precio: "" });
      setMostrarConfirmacion(false);
      fetchSobrantes();
    }
  }

  return (
    <>
      {/* NOTIFICACIÓN TOAST */}
      {notificacion && (
        <div className="fixed top-6 right-6 z-[1000] animate-in slide-in-from-right duration-500">
          <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border-l-4 border-indigo-500 flex items-center gap-3">
            <div className="bg-indigo-500/20 p-1 rounded-full">
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <p className="text-[11px] font-black uppercase tracking-wider">{notificacion}</p>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN */}
      {mostrarConfirmacion && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md" onClick={() => setMostrarConfirmacion(false)}></div>
          <div className="bg-white rounded-[3rem] p-10 shadow-2xl border-t-[15px] border-indigo-600 text-center relative z-10 animate-in zoom-in duration-200 max-w-sm w-full">
            <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter mb-6 leading-none">REVISAR<br/>AJUSTE</h2>
            <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 mb-8 space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Producto: {nuevo.producto.toUpperCase()}</p>
                <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-4">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Cantidad</p>
                        <p className="text-2xl font-black text-slate-900">{nuevo.cantidad}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Subtotal</p>
                        <p className="text-2xl font-black text-indigo-600">S/ {(parseFloat(nuevo.cantidad) * parseFloat(nuevo.precio)).toFixed(2)}</p>
                    </div>
                </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setMostrarConfirmacion(false)} className="flex-1 bg-slate-100 text-slate-500 font-black py-5 rounded-2xl uppercase text-[11px]">EDITAR</button>
              <button ref={btnConfirmarRef} onClick={guardarSobrante} className="flex-1 bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl uppercase text-[11px] border-b-4 border-indigo-800 active:border-b-0">CONFIRMAR</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8 p-4 min-h-screen flex flex-col relative bg-slate-50">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 shrink-0 pt-4">
          <div>
            <h2 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em] mb-1 ml-1">Control de Inventario</h2>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">
              SOBRANTE<span className="text-indigo-600">.PROD</span>
            </h1>
          </div>

          <div className="flex items-center gap-4 bg-white p-3 rounded-[2.5rem] shadow-xl border border-slate-100">
            <div className="flex items-center gap-3 px-4 cursor-pointer" onClick={togglePeriodo}>
              <span className={`text-[10px] font-black uppercase transition-colors ${esSemana ? 'text-indigo-600' : 'text-slate-300'}`}>Semana</span>
              <div className={`relative w-16 h-8 rounded-full transition-colors duration-300 ${esMes ? 'bg-slate-900' : 'bg-indigo-600'}`}>
                <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform duration-300 shadow-md ${esMes ? 'translate-x-8' : 'translate-x-0'}`} />
              </div>
              <span className={`text-[10px] font-black uppercase transition-colors ${esMes ? 'text-slate-900' : 'text-slate-300'}`}>Mes</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 pb-10">
          {/* FORMULARIO */}
          <div className="lg:col-span-4 self-start sticky top-4">
            <div className="bg-white p-8 rounded-[3rem] shadow-2xl border-b-[12px] border-indigo-600">
              <div className="space-y-5" onKeyDown={(e) => e.key === "Enter" && !mostrarConfirmacion && revisarRegistro()}>
                <div>
                  <label className="text-[10px] font-black text-indigo-600 uppercase mb-2 block tracking-widest ml-1">Descripción</label>
                  <input autoFocus placeholder="EJ. POWERADE AZUL" value={nuevo.producto} onChange={(e) => setNuevo({ ...nuevo, producto: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-sm font-black text-slate-900 focus:border-indigo-600 focus:bg-white transition-all outline-none uppercase" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-indigo-600 uppercase mb-2 block tracking-widest ml-1">Cantidad</label>
                    <input type="number" placeholder="0" value={nuevo.cantidad} onChange={(e) => setNuevo({ ...nuevo, cantidad: e.target.value })} className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-center text-2xl font-black text-slate-900 focus:border-indigo-600 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-indigo-600 uppercase mb-2 block tracking-widest ml-1">Precio Unit.</label>
                    <input type="number" placeholder="0.00" value={nuevo.precio} onChange={(e) => setNuevo({ ...nuevo, precio: e.target.value })} className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-center text-2xl font-black text-slate-900 focus:border-indigo-600 outline-none transition-all" />
                  </div>
                </div>
                <button onClick={revisarRegistro} className="w-full bg-indigo-600 text-white font-black py-6 rounded-2xl shadow-xl uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all border-b-4 border-indigo-900 active:border-b-0">REGISTRAR PRODUCTO</button>
              </div>
            </div>
          </div>

          {/* TABLA DE REGISTROS */}
          <div className="lg:col-span-8 bg-white rounded-[3.5rem] shadow-xl border border-slate-100 flex flex-col overflow-hidden min-h-[500px]">
            <div className="bg-slate-900 p-6 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-indigo-500">
              <div>
                 <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Stock Excedente</p>
                 <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">
                  {esMes ? "HISTORIAL DEL MES" : "HISTORIAL DE SEMANA"}
                 </h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-slate-800 border border-slate-700 px-4 py-3 rounded-2xl flex items-center gap-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Items:</span>
                  <span className="text-sm font-black text-white">{productos.length}</span>
                </div>
                <div className="bg-indigo-600 px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg border-b-4 border-indigo-800">
                  <span className="text-[9px] font-black text-indigo-100 uppercase tracking-widest">Sobrante:</span>
                  <span className="text-sm font-black text-white font-mono">S/ {totalDinero.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto p-4">
              <table className="w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
                    <th className="px-6 py-2">Fecha</th>
                    <th className="px-6 py-2">Producto</th>
                    <th className="px-6 py-2 text-center">Cant.</th>
                    <th className="px-6 py-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map((item) => {
                    const { dia, mes } = formatFechaCorta(item.fecha);
                    return (
                      <tr key={item.id} className="group">
                        <td className="px-6 py-3 bg-slate-50 rounded-l-2xl">
                          <div className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl border border-slate-200 ${item.fecha === hoyStr ? 'bg-indigo-600 border-indigo-600 shadow-md' : 'bg-white'}`}>
                            <span className={`text-sm font-black leading-none ${item.fecha === hoyStr ? 'text-white' : 'text-slate-900'}`}>{dia}</span>
                            <span className={`text-[7px] font-black leading-none mt-0.5 ${item.fecha === hoyStr ? 'text-indigo-100' : 'text-indigo-600'}`}>{mes}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 bg-slate-50">
                          <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{item.producto}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Unit: S/ {parseFloat(item.precio).toFixed(2)}</p>
                        </td>
                        <td className="px-6 py-3 bg-slate-50 text-center">
                          <span className="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-xl font-black text-xs">{item.cantidad}</span>
                        </td>
                        <td className="px-6 py-3 bg-slate-50 rounded-r-2xl text-right">
                          <p className="text-lg font-black text-indigo-600 font-mono">S/ {(parseFloat(item.cantidad) * parseFloat(item.precio)).toFixed(2)}</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {productos.length === 0 && !loading && (
                <div className="p-20 text-center text-slate-300 font-black uppercase text-xs tracking-[0.3em]">Sin registros</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}