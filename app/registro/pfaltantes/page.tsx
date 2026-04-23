"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { supabase } from "../../lib/supabase";

export default function FaltantesTrabajadorPage() {
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [bloqueoEnter, setBloqueoEnter] = useState(false); 
  const [notificacion, setNotificacion] = useState<string | null>(null); // Estado para la notificación
  const btnConfirmarRef = useRef<HTMLButtonElement>(null);

  const { lunesActual, domingoActual, primerDiaMes, ultimoDiaMes, hoyStr } = useMemo(() => {
    const hoy = new Date();
    const diaSemana = hoy.getDay(); 
    const dif = hoy.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1);
    const getStr = (d: Date) => d.toISOString().split('T')[0];
    const lunes = new Date(new Date().setDate(dif));
    const domingo = new Date(new Date(lunes).setDate(lunes.getDate() + 6));
    const primero = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ultimo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    return { lunesActual: getStr(lunes), domingoActual: getStr(domingo), primerDiaMes: getStr(primero), ultimoDiaMes: getStr(ultimo), hoyStr: getStr(hoy) };
  }, []);

  const [fechaDesde, setFechaDesde] = useState(lunesActual);
  const [fechaHasta, setFechaHasta] = useState(domingoActual);
  const [nuevo, setNuevo] = useState({ producto: "", cantidad: "", precio: "" });

  const esSemana = fechaDesde === lunesActual && fechaHasta === domingoActual;
  const esMes = fechaDesde === primerDiaMes && fechaHasta === ultimoDiaMes;

  const totalPerdido = useMemo(() => {
    return productos.reduce((acc, item) => acc + (item.cantidad * item.precio || 0), 0);
  }, [productos]);

  // Función para formatear fecha a Día y Mes
  const formatFechaCorta = (fechaStr: string) => {
    const fecha = new Date(fechaStr + "T00:00:00");
    const dia = fecha.getDate();
    const mes = fecha.toLocaleString('es-ES', { month: 'short' }).replace('.', '').toUpperCase();
    return { dia, mes };
  };

  useEffect(() => { fetchFaltantes(); }, [fechaDesde, fechaHasta]);
  
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

  // Efecto para autocerrar la notificación
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

  async function fetchFaltantes() {
    setLoading(true);
    let query = supabase.from("prod_faltantes").select("*").order("id", { ascending: false });
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
      return alert("⚠️ Error: Ingresa un producto y valores mayores a 0");
    }
    setMostrarConfirmacion(true);
  };

  async function guardarFaltante() {
    if (bloqueoEnter) return;
    const { error } = await supabase.from("prod_faltantes").insert([{
      producto: nuevo.producto.toUpperCase(),
      cantidad: parseInt(nuevo.cantidad),
      precio: parseFloat(nuevo.precio),
      fecha: hoyStr 
    }]);

    if (!error) {
      setNotificacion(`${nuevo.producto.toUpperCase()} GUARDADO`); // Dispara notificación
      setNuevo({ producto: "", cantidad: "", precio: "" });
      setMostrarConfirmacion(false);
      fetchFaltantes();
    }
  }

  return (
    <>
      {/* NOTIFICACIÓN ARRIBA A LA DERECHA */}
      {notificacion && (
        <div className="fixed top-6 right-6 z-[1000] animate-in slide-in-from-right duration-500">
          <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border-l-4 border-orange-500 flex items-center gap-3">
            <div className="bg-orange-500/20 p-1 rounded-full">
              <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <p className="text-[11px] font-black uppercase tracking-wider">{notificacion}</p>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN */}
      {mostrarConfirmacion && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md" onClick={() => setMostrarConfirmacion(false)}></div>
          <div className="bg-white rounded-[3rem] p-8 shadow-2xl border-t-[15px] border-orange-600 text-center relative z-10 animate-in zoom-in duration-200 max-w-md w-full">
            <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter mb-6">REVISAR DATOS</h2>
            <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 mb-8">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Producto</p>
                <p className="text-2xl font-black text-orange-600 uppercase mb-4">{nuevo.producto}</p>
                <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-4">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Cantidad</p>
                        <p className="text-2xl font-black text-slate-900">{nuevo.cantidad}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Precio Unit.</p>
                        <p className="text-2xl font-black text-slate-900">S/ {parseFloat(nuevo.precio).toFixed(2)}</p>
                    </div>
                </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setMostrarConfirmacion(false)} className="flex-1 bg-slate-100 text-slate-500 font-black py-5 rounded-2xl uppercase text-[11px]">CORREGIR</button>
              <button ref={btnConfirmarRef} onClick={guardarFaltante} className="flex-1 bg-orange-600 text-white font-black py-5 rounded-2xl shadow-xl uppercase text-[11px] border-b-4 border-orange-800 active:border-b-0">GUARDAR</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8 p-4 min-h-screen flex flex-col relative bg-slate-50">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 shrink-0 pt-4">
          <div>
            <h2 className="text-[10px] font-black text-orange-600 uppercase tracking-[0.4em] mb-1 ml-1 text-center md:text-left">Auditoría de Productos</h2>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">
              FALTANTES<span className="text-orange-600">.LOG</span>
            </h1>
          </div>

          <div className="bg-white p-3 rounded-[2.5rem] shadow-xl border border-slate-100 flex items-center">
            <div className="flex items-center gap-3 px-4 cursor-pointer" onClick={togglePeriodo}>
              <span className={`text-[10px] font-black uppercase transition-colors ${esSemana ? 'text-orange-600' : 'text-slate-300'}`}>Semana</span>
              <div className={`relative w-16 h-8 rounded-full transition-colors duration-300 ${esMes ? 'bg-slate-900' : 'bg-orange-600'}`}>
                <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform duration-300 shadow-md ${esMes ? 'translate-x-8' : 'translate-x-0'}`} />
              </div>
              <span className={`text-[10px] font-black uppercase transition-colors ${esMes ? 'text-slate-900' : 'text-slate-300'}`}>Mes</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 pb-10">
          <div className="lg:col-span-4 self-start sticky top-4">
            <div className="bg-white p-8 rounded-[3rem] shadow-2xl border-b-[12px] border-orange-600">
              <div className="space-y-5" onKeyDown={(e) => e.key === "Enter" && !mostrarConfirmacion && revisarRegistro()}>
                <div>
                  <label className="text-[10px] font-black text-orange-600  uppercase mb-2 block tracking-widest ml-1">Producto</label>
                  <input autoFocus placeholder="Producto..." value={nuevo.producto} onChange={(e) => setNuevo({ ...nuevo, producto: e.target.value })} className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-sm font-black text-slate-900 focus:border-orange-600 focus:bg-white outline-none uppercase transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-orange-600  uppercase mb-2 block tracking-widest ml-1">Cantidad</label>
                    <input type="number" placeholder="0" value={nuevo.cantidad} onChange={(e) => setNuevo({ ...nuevo, cantidad: e.target.value })} className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-center text-xl font-black text-slate-900 focus:border-orange-600 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-orange-600  uppercase mb-2 block tracking-widest ml-1">Precio S/</label>
                    <input type="number" placeholder="0.00" value={nuevo.precio} onChange={(e) => setNuevo({ ...nuevo, precio: e.target.value })} className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-center text-xl font-black text-slate-900 focus:border-orange-600 outline-none transition-all" />
                  </div>
                </div>
                <button onClick={revisarRegistro} className="w-full bg-orange-600 text-white font-black py-6 rounded-2xl shadow-xl uppercase text-xs tracking-widest border-b-4 border-orange-900 active:border-b-0">REGISTRAR FALTANTE</button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 bg-white rounded-[3rem] shadow-xl border border-slate-100 flex flex-col overflow-hidden min-h-[500px]">
            <div className="bg-slate-900 p-6 flex justify-between items-center border-b border-orange-600">
              <div>
                <p className="text-[9px] font-black text-orange-400 uppercase mb-1">Auditoría de Stock</p>
                <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">
                  {esMes ? "HISTORIAL DEL MES" : "HISTORIAL DE SEMANA"}
                </h3>
              </div>
              <div className="flex gap-2">
                <span className="bg-slate-800 text-slate-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase">{productos.length} REG.</span>
                <span className="bg-orange-600 text-white px-4 py-2 rounded-xl text-[11px] font-black uppercase shadow-lg border-b-2 border-orange-800">
                  TOTAL: S/ {totalPerdido.toFixed(2)}
                </span>
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
                <tbody className="divide-y divide-slate-50">
                  {productos.map((item) => {
                    const { dia, mes } = formatFechaCorta(item.fecha);
                    return (
                      <tr key={item.id} className="hover:bg-orange-50/40 transition-colors group">
                        {/* FECHA FORMATEADA DIA Y MES */}
                        <td className="px-6 py-3 bg-slate-50 rounded-l-2xl">
                          <div className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl border border-slate-200 ${item.fecha === hoyStr ? 'bg-orange-600 border-orange-600 shadow-md' : 'bg-white'}`}>
                            <span className={`text-sm font-black leading-none ${item.fecha === hoyStr ? 'text-white' : 'text-slate-900'}`}>{dia}</span>
                            <span className={`text-[7px] font-black leading-none mt-0.5 ${item.fecha === hoyStr ? 'text-orange-100' : 'text-orange-600'}`}>{mes}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 bg-slate-50">
                          <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{item.producto}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Unit: S/ {parseFloat(item.precio).toFixed(2)}</p>
                        </td>
                        <td className="px-6 py-3 bg-slate-50 text-center">
                          <span className="px-4 py-1.5 bg-orange-100 text-orange-700 rounded-xl font-black text-xs">{item.cantidad}</span>
                        </td>
                        <td className="px-6 py-3 bg-slate-50 text-right rounded-r-2xl">
                          <p className="text-sm font-black text-slate-900 font-mono">S/ {(item.cantidad * item.precio).toFixed(2)}</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {productos.length === 0 && !loading && (
                <div className="p-20 text-center text-slate-300 font-black uppercase text-xs tracking-[0.3em]">Sin faltantes registrados</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}