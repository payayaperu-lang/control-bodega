"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { supabase } from "../../lib/supabase";

export default function EnvasesRegistroPage() {
  const [registros, setRegistros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmando, setConfirmando] = useState(false);
  const [bloqueoEnter, setBloqueoEnter] = useState(false);
  const [notificacion, setNotificacion] = useState<string | null>(null);
  const btnConfirmarRef = useRef<HTMLButtonElement>(null);

  // --- LÓGICA DE FECHAS PARA HISTORIAL ---
  const { lunesActual, domingoActual, primerDiaMes, ultimoDiaMes, hoyStr } = useMemo(() => {
    const hoy = new Date();
    const diaSemana = hoy.getDay(); 
    const dif = hoy.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1);
    const getStr = (d: Date) => d.toISOString().split('T')[0];
    
    const lunes = new Date(new Date().setDate(dif));
    const domingo = new Date(new Date(lunes).setDate(lunes.getDate() + 6));
    const primero = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ultimo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    
    return { 
      lunesActual: getStr(lunes), 
      domingoActual: getStr(domingo), 
      primerDiaMes: getStr(primero), 
      ultimoDiaMes: getStr(ultimo), 
      hoyStr: getStr(hoy) 
    };
  }, []);

  const [fechaDesde, setFechaDesde] = useState(lunesActual);
  const [fechaHasta, setFechaHasta] = useState(domingoActual);
  const [filtroEstado, setFiltroEstado] = useState("pendientes");
  const [nuevo, setNuevo] = useState({ cliente: "", envase: "", cantidad: "", dinero: "", pago: "Efectivo" });

  const esSemana = fechaDesde === lunesActual && fechaHasta === domingoActual;
  const esMes = fechaDesde === primerDiaMes && fechaHasta === ultimoDiaMes;

  const totalesPorDevolver = useMemo(() => {
    return registros
      .filter(r => r.devuelto === 0)
      .reduce((acc, item) => {
        const monto = parseFloat(item.dinero) || 0;
        if (item.pago === "Efectivo") acc.efectivo += monto;
        else acc.yape += monto;
        return acc;
      }, { efectivo: 0, yape: 0 });
  }, [registros]);

  const registrosFiltrados = useMemo(() => {
    let filtrados = [...registros];
    if (filtroEstado === "pendientes") filtrados = filtrados.filter(r => r.devuelto === 0);
    if (filtroEstado === "devueltos") filtrados = filtrados.filter(r => r.devuelto === 1);
    return filtrados;
  }, [registros, filtroEstado]);

  useEffect(() => { fetchEnvases(); }, [fechaDesde, fechaHasta]);

  const togglePeriodo = () => {
    if (esSemana) {
      setFechaDesde(primerDiaMes); setFechaHasta(ultimoDiaMes);
    } else {
      setFechaDesde(lunesActual); setFechaHasta(domingoActual);
    }
  };

  async function fetchEnvases() {
    setLoading(true);
    let query = supabase.from("envases").select("*").order("id", { ascending: false });
    if (fechaDesde && fechaHasta) query = query.gte("fecha", fechaDesde).lte("fecha", fechaHasta);
    const { data } = await query;
    setRegistros(data || []);
    setLoading(false);
  }

  async function toggleDevuelto(id: number, estadoActual: number) {
    const nuevoEstado = estadoActual === 1 ? 0 : 1;
    const { error } = await supabase.from("envases").update({ devuelto: nuevoEstado }).eq("id", id);
    if (!error) {
      setNotificacion(`Estado actualizado correctamente`);
      fetchEnvases();
    }
  }

  const prepararRegistro = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!nuevo.cliente.trim() || !nuevo.envase || !nuevo.cantidad || !nuevo.dinero) {
      return alert("⚠️ Completa todos los campos");
    }
    setConfirmando(true);
  };

  async function guardarRegistro() {
    if (bloqueoEnter) return;
    const { error } = await supabase.from("envases").insert([{
      ...nuevo,
      cliente: nuevo.cliente.toUpperCase(),
      fecha: hoyStr,
      cantidad: parseInt(nuevo.cantidad),
      dinero: parseFloat(nuevo.dinero),
      devuelto: 0 
    }]);

    if (!error) {
      setNotificacion(`Registro guardado con éxito`);
      setNuevo({ cliente: "", envase: "", cantidad: "", dinero: "", pago: "Efectivo" });
      setConfirmando(false);
      fetchEnvases();
    }
  }
  
  const formatHora = (fechaStr: string) => {
  const fecha = new Date(fechaStr);
  // Usamos el locale de Perú para asegurar la hora correcta
  return fecha.toLocaleTimeString('es-PE', { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true 
  }).toUpperCase();
};

  const formatFechaCorta = (fechaStr: string) => {
  // Creamos el objeto fecha (ahora sí soporta el formato completo)
  const fecha = new Date(fechaStr);
  
  // Verificamos si la fecha es válida para evitar el NaN
  if (isNaN(fecha.getTime())) {
    return { dia: '00', mes: '---' };
  }

  const dia = fecha.getDate();
  const mes = fecha.toLocaleString('es-ES', { month: 'short' })
                   .replace('.', '')
                   .toUpperCase();
                   
  return { dia, mes };
};

  return (
    <>
      {notificacion && (
        <div className="fixed top-6 right-6 z-[1000] animate-in slide-in-from-right duration-500">
          <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border-l-4 border-emerald-500 flex items-center gap-3">
            <div className="bg-emerald-500/20 p-1 rounded-full text-emerald-500 font-black text-xs">✓</div>
            <p className="text-[11px] font-black uppercase tracking-wider">{notificacion}</p>
          </div>
        </div>
      )}

      {confirmando && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md" onClick={() => setConfirmando(false)}></div>
          <div className="bg-white rounded-[3rem] p-10 shadow-2xl border-t-[15px] border-blue-600 text-center relative z-10 animate-in zoom-in duration-300 max-w-sm w-full">
            <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter mb-6 leading-none">REVISAR<br/>SALIDA</h2>
            <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 mb-8 space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Cliente</p>
                <p className="text-xl font-black text-slate-900 uppercase leading-tight">{nuevo.cliente}</p>
              </div>
              <p className="text-2xl font-black text-blue-600 uppercase leading-none">{nuevo.cantidad} {nuevo.envase}</p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setConfirmando(false)} className="flex-1 bg-slate-100 text-slate-500 font-black py-5 rounded-2xl uppercase text-[11px]">CORREGIR</button>
              <button onClick={guardarRegistro} className="flex-1 bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl uppercase text-[11px] border-b-4 border-blue-800 active:border-b-0">CONFIRMAR</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8 p-4 min-h-screen flex flex-col relative bg-slate-50 text-slate-800 font-sans">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 shrink-0 pt-4">
          <div>
            <h2 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mb-1 ml-1">Terminal de Control</h2>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">ENVASES<span className="text-blue-600">.SYS</span></h1>
          </div>

          {/* SWITCH DE HISTORIAL */}
          <div className="flex items-center gap-4 bg-white p-3 rounded-[2.5rem] shadow-xl border border-slate-100">
            <div className="flex items-center gap-3 px-4 cursor-pointer" onClick={togglePeriodo}>
              <span className={`text-[10px] font-black uppercase transition-colors ${esSemana ? 'text-blue-600' : 'text-slate-300'}`}>Semana</span>
              <div className={`relative w-16 h-8 rounded-full transition-colors duration-300 ${esMes ? 'bg-slate-900' : 'bg-blue-600'}`}>
                <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform duration-300 shadow-md ${esMes ? 'translate-x-8' : 'translate-x-0'}`} />
              </div>
              <span className={`text-[10px] font-black uppercase transition-colors ${esMes ? 'text-slate-900' : 'text-slate-300'}`}>Mes</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 pb-10">
          
          {/* FORMULARIO */}
          <div className="lg:col-span-4 self-start sticky top-4">
            <div className="bg-white p-8 rounded-[3rem] shadow-2xl border-b-[12px] border-blue-600">
              <div className="space-y-5" onKeyDown={(e) => e.key === "Enter" && !confirmando && prepararRegistro()}>
                <div>
                  <label className="text-[10px] font-black text-blue-600 uppercase mb-2 block tracking-widest ml-1">Cliente</label>
                  <input autoFocus placeholder="NOMBRE..." value={nuevo.cliente} onChange={(e) => setNuevo({ ...nuevo, cliente: e.target.value })} className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-sm font-black text-slate-900 focus:border-blue-600 outline-none uppercase transition-all" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-blue-600 uppercase mb-2 block tracking-widest ml-1">Envase</label>
                  <select value={nuevo.envase} onChange={(e) => setNuevo({ ...nuevo, envase: e.target.value })} className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-sm font-black text-slate-900 outline-none focus:border-blue-600 uppercase transition-all cursor-pointer">
                    <option value="">SELECCIONAR...</option>
                    <option value="Pirañita 192ml">Pirañita 192ml</option>
                    <option value="Envase 296ml">Envase 296ml</option>
                    <option value="Inca Kola 1L">Inca Kola 1L</option>
                    <option value="Coca Cola 1L">Coca Cola 1L</option>
                    <option value="Inca K. 1.5L">Inca K. 1.5L</option>
                    <option value="Coca C. 1.5L">Coca C. 1.5L</option>
                    <option value="Inca Gordita">Inca Gordita</option>
                    <option value="Inca K. 2.5L">Inca K. 2.5L</option>
                    <option value="Coca C. 2.5L">Coca C. 2.5L</option>
                    <option value="Cerveza 630ML">Cerveza 630ML</option>
                    <option value="Cerveza 1L">Cerveza 1L</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-blue-600 block">CANTIDAD</label>
                    <input type="number" placeholder="0" value={nuevo.cantidad} onChange={(e) => setNuevo({ ...nuevo, cantidad: e.target.value })} className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-center text-xl font-black text-slate-900 focus:border-blue-600 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-blue-600 text-center block">S/ GARANTÍA</label>
                    <input type="number" placeholder="0.00" value={nuevo.dinero} onChange={(e) => setNuevo({ ...nuevo, dinero: e.target.value })} className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-center text-xl font-black text-slate-900 focus:border-blue-600 outline-none font-mono" />
                  </div>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-2xl">
                  <button type="button" onClick={() => setNuevo({...nuevo, pago: 'Efectivo'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${nuevo.pago === 'Efectivo' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>EFECTIVO</button>
                  <button type="button" onClick={() => setNuevo({...nuevo, pago: 'Yape'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${nuevo.pago === 'Yape' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-400'}`}>YAPE</button>
                </div>
                <button onClick={prepararRegistro} className="w-full bg-blue-600 text-white font-black py-6 rounded-2xl shadow-xl uppercase text-xs tracking-widest border-b-4 border-blue-900 active:border-b-0 hover:bg-blue-700 transition-colors">REGISTRAR SALIDA</button>
              </div>
            </div>
          </div>

          {/* TABLA DE REGISTROS */}
          <div className="lg:col-span-8 bg-white rounded-[3.5rem] shadow-xl border border-slate-100 flex flex-col overflow-hidden min-h-[600px]">
            <div className="bg-slate-900 p-6 flex flex-col sm:flex-row justify-between items-center gap-6 border-b border-blue-500">
              
              {/* TÍTULO HISTORIAL DINÁMICO REESTABLECIDO */}
              <div className="text-left w-full sm:w-auto">
                <p className="text-[9px] font-black text-blue-400 uppercase mb-1">Auditoría de Salidas</p>
                <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">
                  HISTORIAL <span >{esMes ? "DEL MES" : "DE SEMANA"}</span>
                </h3>
              </div>

              <div className="flex gap-8">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-emerald-400 uppercase leading-none mb-1">Cash Pendiente</span>
                  <span className="text-xl font-black text-white font-mono leading-none tracking-tighter">S/ {totalesPorDevolver.efectivo.toFixed(2)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-purple-400 uppercase leading-none mb-1">Yape Pendiente</span>
                  <span className="text-xl font-black text-white font-mono leading-none tracking-tighter">S/ {totalesPorDevolver.yape.toFixed(2)}</span>
                </div>
              </div>
              
              <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="bg-blue-600 text-white text-[10px] font-black px-4 py-2.5 rounded-xl uppercase outline-none cursor-pointer">
                <option value="pendientes">PENDIENTES</option>
                <option value="devueltos">SOLO DEVUELTOS</option>
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
                    const { dia, mes } = formatFechaCorta(item.fecha);
                    const isYape = item.pago === 'Yape';
                    return (
                      <tr key={item.id}>
                        <td className="px-4 py-3 bg-slate-50 rounded-l-2xl">
                          <div className="flex flex-col items-center gap-1">
                          {/* CUADRITO DE FECHA (Tu diseño original) */}
                          <div className="flex flex-col items-center justify-center bg-slate-100 w-12 h-12 rounded-xl border border-slate-200">
                            <span className="text-lg font-black text-slate-900 leading-none">{dia}</span>
                            <span className="text-[8px] font-black text-blue-600 leading-none mt-1">{mes}</span>
                          </div>
                          
                          {/* LA HORA JUSTO DEBAJO */}
                          <span className="text-[11px] font-black text-slate-400 tracking-tighter">
                            {formatHora(item.fecha)}
                          </span>
                        </div>
                        </td>
                        <td className="px-4 py-3 bg-slate-50">
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{item.cliente}</p>
                          <p className="text-sm font-black text-slate-900 uppercase italic leading-none">{item.envase}</p>
                        </td>
                        <td className="px-4 py-3 bg-slate-50 text-center">
                          <span className="text-lg font-black text-blue-600 font-mono">{item.cantidad}</span>
                        </td>
                        <td className="px-4 py-3 bg-slate-50 text-right">
                          <p className="text-md font-black text-slate-900 font-mono">S/ {parseFloat(item.dinero).toFixed(2)}</p>
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${isYape ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            {item.pago}
                          </span>
                        </td>
                        <td className="px-4 py-3 bg-slate-50 rounded-r-2xl text-center">
                          <button onClick={() => toggleDevuelto(item.id, item.devuelto)} className={`text-[9px] font-black px-4 py-2 rounded-xl transition-all border-2 ${item.devuelto === 1 ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                            {item.devuelto === 1 ? 'ENTREGADO' : 'DEVUELTO'}
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