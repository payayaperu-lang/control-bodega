"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const getLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatFechaCorta = (fechaStr: string) => {
  const fecha = new Date(fechaStr + "T00:00:00");
  const dia = fecha.getDate();
  const mes = fecha.toLocaleString('es-ES', { month: 'short' }).replace('.', '').toUpperCase();
  return { dia, mes };
};

function FaltantesForm() {
  const searchParams = useSearchParams();
  const router = useRouter(); // Instanciamos el router de Next.js
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [notificacion, setNotificacion] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState({ producto: "", cantidad: "", precio: "" });
  
  // Estados de control para bloquear inputs si vienen por GET
  const [productoBloqueado, setProductoBloqueado] = useState(false);
  const [precioBloqueado, setPrecioBloqueado] = useState(false);
  
  // Capturar el producto y el precio de la URL al cargar el componente
  useEffect(() => {
    const prodUrl = searchParams.get("producto");
    const precioUrl = searchParams.get("precio");

    if (prodUrl) {
      setNuevo(prev => ({ ...prev, producto: prodUrl.toUpperCase() }));
      setProductoBloqueado(true);
    } else {
      setProductoBloqueado(false);
    }
    
    if (precioUrl) {
      const precioNumerico = parseFloat(precioUrl);
      if (precioNumerico > 0) {
        setNuevo(prev => ({ ...prev, precio: precioUrl }));
        setPrecioBloqueado(true);
      } else {
        setNuevo(prev => ({ ...prev, precio: "" }));
        setPrecioBloqueado(false);
      }
    } else {
      setPrecioBloqueado(false);
    }
  }, [searchParams]);

  const { lunesActual, domingoActual } = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - (day === 0 ? 6 : day - 1);
    const lunes = new Date(d.setDate(diff));
    const domingo = new Date(new Date(lunes).setDate(lunes.getDate() + 6));
    return { lunesActual: getLocalDate(lunes), domingoActual: getLocalDate(domingo) };
  }, []);

  const [fechaDesde, setFechaDesde] = useState(lunesActual);
  const [fechaHasta, setFechaHasta] = useState(domingoActual);

  const totalDinero = useMemo(() => {
    return productos.reduce((acc, item) => acc + (parseFloat(item.cantidad) * parseFloat(item.precio) || 0), 0);
  }, [productos]);

  useEffect(() => {
    fetchProductos();
  }, [fechaDesde, fechaHasta]);

  async function fetchProductos() {
    setLoading(true);
    let query = supabase.from("prod_faltantes").select("*").order("id", { ascending: false });
    if (fechaDesde && fechaHasta) {
      query = query.gte("fecha", fechaDesde).lte("fecha", fechaHasta);
    }
    const { data } = await query;
    setProductos(data || []);
    setLoading(false);
  }

  const validarYRevisar = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!nuevo.producto || !nuevo.cantidad || !nuevo.precio) {
      return alert("⚠️ Completa todos los campos");
    }
    setMostrarConfirmacion(true);
  };

  async function guardar() {
    const { error } = await supabase.from("prod_faltantes").insert([{
      producto: nuevo.producto.toUpperCase(),
      cantidad: parseInt(nuevo.cantidad),
      precio: parseFloat(nuevo.precio),
      fecha: getLocalDate(new Date())
    }]);

    if (!error) {
      setNotificacion(`${nuevo.producto.toUpperCase()} REGISTRADO`);
      
      // 1. Resetear el estado local de los inputs por completo
      setNuevo({ producto: "", cantidad: "", precio: "" });
      setProductoBloqueado(false);
      setPrecioBloqueado(false);
      setMostrarConfirmacion(false);
      
      // 2. Limpiar la URL borrando los datos GET (vuelve a dejar la ruta limpia)
      router.replace("/registro/faltantes");
      
      fetchProductos();
      setTimeout(() => setNotificacion(null), 3000);
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 bg-slate-50 min-h-screen">
      {notificacion && (
        <div className="fixed top-6 right-6 z-[1000] animate-in slide-in-from-right duration-300">
          <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border-l-4 border-orange-500 flex items-center gap-3">
            <p className="text-xs font-black uppercase tracking-wider">{notificacion}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div>
          <h2 className="text-[10px] font-black text-orange-600 uppercase tracking-[0.3em] mb-1">Logística y Auditoría</h2>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 italic uppercase tracking-tighter">FALTANTES<span className="text-orange-600">.LOG</span></h1>
        </div>

        {/* CONTENEDOR CENTRAL: Filtros y Botón de Retorno */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2 rounded-2xl w-full md:w-auto">
          
          {/* BOTÓN VOLVER A ABASTECIMIENTO */}
          <button 
            onClick={() => router.push("/registro/abastecimiento")}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-black text-[9px] uppercase tracking-wider rounded-xl border border-slate-200/80 shadow-xs transition-all flex items-center gap-1.5"
          >
            ⬅️ ABASTECIMIENTO
          </button>

          <div className="h-5 w-[1px] bg-slate-200 hidden sm:block"></div>

          <div className="flex items-center gap-2">
            <div className="flex flex-col px-2">
              <span className="text-[8px] font-black text-slate-400 uppercase">Desde</span>
              <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="bg-transparent text-xs font-black text-slate-800 outline-none" />
            </div>
            <span className="text-slate-300 font-bold">→</span>
            <div className="flex flex-col px-2">
              <span className="text-[8px] font-black text-slate-400 uppercase">Hasta</span>
              <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="bg-transparent text-xs font-black text-slate-800 outline-none" />
            </div>
          </div>
        </div>

        <div className="bg-orange-600 w-full md:w-auto px-6 py-4 rounded-2xl shadow-xl border-b-4 border-orange-800 text-white flex justify-between md:block items-center">
          <span className="text-[9px] font-black opacity-80 uppercase tracking-wider block">Total Rango</span>
          <span className="text-xl font-black font-mono">S/ {totalDinero.toFixed(2)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulario */}
        <div className="lg:col-span-4">
          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl border-b-[10px] border-orange-600 space-y-4">
            
            {/* Input Producto */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[9px] font-black text-slate-400 uppercase block">Producto</label>
                {productoBloqueado && <span className="text-[8px] font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-wider">Automático</span>}
              </div>
              <input 
                placeholder="PRODUCTO" 
                value={nuevo.producto} 
                disabled={productoBloqueado}
                onChange={e => setNuevo({...nuevo, producto: e.target.value})} 
                className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-xl font-black text-slate-900 outline-none focus:border-orange-500 uppercase transition-all text-sm disabled:opacity-60 disabled:bg-slate-100 disabled:cursor-not-allowed disabled:border-slate-200" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Cant.</label>
                <input 
                  autoFocus
                  type="number" 
                  placeholder="CANT" 
                  value={nuevo.cantidad} 
                  onChange={e => setNuevo({...nuevo, cantidad: e.target.value})} 
                  className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-xl text-center font-black text-xl outline-none focus:border-orange-500 transition-all" 
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase block">Precio Unit.</label>
                  {precioBloqueado && <span className="text-[7px] font-black text-blue-500 bg-blue-50 px-1 py-0.2 rounded uppercase">Fijo</span>}
                </div>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="PRECIO" 
                  value={nuevo.precio} 
                  disabled={precioBloqueado}
                  onChange={e => setNuevo({...nuevo, precio: e.target.value})} 
                  className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-xl text-center font-black text-xl outline-none focus:border-orange-500 transition-all disabled:opacity-60 disabled:bg-slate-100 disabled:cursor-not-allowed disabled:border-slate-200" 
                />
              </div>
            </div>

            <button onClick={validarYRevisar} className="w-full bg-orange-600 text-white font-black py-5 rounded-xl shadow-lg uppercase text-xs tracking-wider border-b-4 border-orange-800 active:translate-y-0.5 active:border-b-0 transition-all pt-4">
              REGISTRAR
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="lg:col-span-8 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[400px]">
          <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
            <span className="text-xs font-black uppercase tracking-wider text-orange-400">Registros Encontrados ({productos.length})</span>
          </div>

          <div className="p-4 flex-1">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-left">
                    <th className="px-6 py-2">Fecha</th>
                    <th className="px-6 py-2">Producto</th>
                    <th className="px-6 py-2 text-center">Cant</th>
                    <th className="px-6 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map(item => {
                    const { dia, mes } = formatFechaCorta(item.fecha);
                    return (
                      <tr key={item.id} className="bg-slate-50 hover:bg-orange-50/40 transition-colors">
                        <td className="px-6 py-3 rounded-l-xl">
                          <div className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-white border border-slate-200 font-black">
                            <span className="text-xs text-slate-800">{dia}</span>
                            <span className="text-[7px] text-orange-600">{mes}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 font-black text-slate-900 uppercase text-sm">{item.producto}</td>
                        <td className="px-6 py-3 text-center"><span className="px-3 py-1 bg-orange-100 text-orange-700 font-black text-xs rounded-md">{item.cantidad}</span></td>
                        <td className="px-6 py-3 rounded-r-xl text-right font-black font-mono text-slate-900">S/ {(item.cantidad * item.precio).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="block md:hidden space-y-3">
              {productos.map(item => {
                const { dia, mes } = formatFechaCorta(item.fecha);
                return (
                  <div key={item.id} className="bg-slate-50 p-4 rounded-2xl border-l-4 border-orange-500 flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 font-black shrink-0">
                        <span className="text-xs text-slate-800">{dia}</span>
                        <span className="text-[7px] text-orange-600">{mes}</span>
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{item.producto}</p>
                        <p className="text-[9px] font-bold text-slate-400">CANT: {item.cantidad} x S/ {parseFloat(item.precio).toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black font-mono text-slate-900">S/ {(item.cantidad * item.precio).toFixed(2)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {productos.length === 0 && !loading && (
              <div className="py-20 text-center text-slate-300 font-black uppercase text-xs tracking-widest">Sin registros en este rango</div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Confirmación */}
      {mostrarConfirmacion && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/80 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-6 md:p-10 max-w-sm w-full text-center border-t-[12px] border-orange-600 shadow-2xl">
            <h2 className="text-2xl font-black uppercase italic tracking-tight mb-4">¿CONFIRMAR?</h2>
            <div className="bg-slate-50 p-4 rounded-xl text-left mb-6 space-y-1">
              <p className="text-xs font-black text-slate-800 uppercase"><span className="text-slate-400">Prod:</span> {nuevo.producto.toUpperCase()}</p>
              <p className="text-xs font-black text-slate-800 uppercase"><span className="text-slate-400">Cant:</span> {nuevo.cantidad}</p>
              <p className="text-xs font-black text-orange-600 uppercase"><span className="text-slate-400">Total:</span> S/ {(parseFloat(nuevo.cantidad) * parseFloat(nuevo.precio)).toFixed(2)}</p>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={guardar} className="w-full bg-orange-600 text-white font-black py-4 rounded-xl uppercase text-xs shadow-lg tracking-wider">SÍ, REGISTRAR</button>
              <button onClick={() => setMostrarConfirmacion(false)} className="w-full bg-slate-100 text-slate-400 font-black py-3 rounded-xl uppercase text-xs">CANCELAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FaltantesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center font-black text-slate-400">CARGANDO MÓDULO...</div>}>
      <FaltantesForm />
    </Suspense>
  );
}