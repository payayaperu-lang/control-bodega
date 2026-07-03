"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from "../lib/supabase";

// ==========================================
// INTERFACES Y DATOS BASE
// ==========================================
interface LogActividad {
  id: string;
  usuario: string;
  accion: string;
  fecha?: string;
  tiempo?: string;
  xp: number;
  gif?: string;
  tipo?: 'alerta' | 'novedad' | 'logro' | 'general';
}

const INSIGNIAS = [
  { id: 'i1', titulo: 'Ojo de Halcón', desc: '5 Logros Mermas', desbloqueado: false, icono: '🦅', color: 'from-slate-300 to-slate-400' },
  { id: 'i2', titulo: 'Empleado Estrella', desc: '15 Logros', desbloqueado: true, icono: '⭐', color: 'from-amber-400 to-yellow-500' },
];

const GALERIA_GIFS_DB = [
  { id: 'g1', url: 'https://media.giphy.com/media/xT0xezQGU5xCDJuCPe/giphy.gif', tag: 'exito bien ok' },
  { id: 'g2', url: 'https://media.giphy.com/media/l41lTjJp8yYyG2bkc/giphy.gif', tag: 'trabajo cansado' },
  { id: 'g3', url: 'https://media.giphy.com/media/11sBLVxNs7v6WA/giphy.gif', tag: 'ok pulgar genial' },
  { id: 'g4', url: 'https://media.giphy.com/media/3o7TKDk86KxNpqQjG0/giphy.gif', tag: 'alerta peligro emergencia' },
  { id: 'g5', url: 'https://media.giphy.com/media/26AHONQ79FdWZhAIw/giphy.gif', tag: 'fiesta celebrar feliz' },
  { id: 'g6', url: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif', tag: 'pensando duda hmm' },
  { id: 'g7', url: 'https://media.giphy.com/media/xUPGGDNsLvqsBOhuU0/giphy.gif', tag: 'risa jaja gracioso' },
  { id: 'g8', url: 'https://media.giphy.com/media/3o85xwxr06YNoFdSbm/giphy.gif', tag: 'triste error mal' },
];

// ==========================================
// COMPONENTES MODULARES (ENVASES)
// ==========================================

const FormularioEnvase = ({ formEnvase, setFormEnvase, formularioEnvaseValido, setConfirmandoEnvase, horaActual }: any) => {
  return (
    <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-xl border-b-[10px] border-blue-600 animate-in fade-in zoom-in duration-300 relative">
      {/* SELECTOR DE TRABAJADOR DISCRETO */}
      <div className="absolute top-6 right-1 flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity focus-within:opacity-100 z-10">
        <select 
          value={formEnvase.trabajador || ""}
          onChange={(e) => setFormEnvase({...formEnvase, trabajador: e.target.value})}
          className="text-[11.5px] font-black uppercase tracking-wider bg-transparent text-slate-600 outline-none cursor-pointer appearance-none text-right"
        >
          <option value="Catherine">{horaActual < 16 ? "Catherine" : "Catherine"}</option>
          <option value="María">María</option>
          <option value="Axel">Axel</option>
        </select>
        <svg className="w-3 h-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
      </div>

      <h3 className="text-xl font-black text-slate-900 uppercase text-center mb-6 italic">Nuevo Envase</h3>
      
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); if(formularioEnvaseValido) setConfirmandoEnvase(true); }}>
        <div className="text-left">
          <label className="text-[10px] font-black text-blue-600 uppercase mb-2 block tracking-widest ml-1">Cliente *</label>
          <input required value={formEnvase.cliente} onChange={(e) => setFormEnvase({ ...formEnvase, cliente: e.target.value })} className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-sm font-black text-slate-900 focus:border-blue-600 outline-none uppercase" />
        </div>
        <div className="text-left">
          <label className="text-[10px] font-black text-blue-600 uppercase mb-2 block tracking-widest ml-1">Envase *</label>
          <select required value={formEnvase.envase} onChange={(e) => setFormEnvase({ ...formEnvase, envase: e.target.value })} className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-sm font-black text-slate-900 outline-none focus:border-blue-600 uppercase cursor-pointer">
            <option value="">SELECCIONAR...</option>
            <option value="Pirañita 192ml">Pirañita 192ml</option>
            <option value="Envase 296ml">Envase 296ml</option>
            <option value="Inca Kola 1L">🟡 Inca Kola 1L</option>
            <option value="Coca Cola 1L">🔴 Coca Cola 1L</option>
            <option value="Inca K. 1.5L">🟡 Inca K. 1.5L</option>
            <option value="Coca C. 1.5L">🔴 Coca C. 1.5L</option>
            <option value="Fanta 1.5L">🟨 Fanta 1.5L</option>
            <option value="Inca Gordita">🟡 Inca Gordita</option>
            <option value="Inca K. 2.5L">🟡 Inca K. 2.5L</option>
            <option value="Coca C. 2.5L">🔴 Coca C. 2.5L</option>
            <option value="Cerveza 630ML">🍺 Cerveza 630ML</option>
            <option value="Cerveza 1L">🍺 Cerveza 1L</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 text-left">
            <label className="text-[10px] font-black text-blue-600 block">CANTIDAD *</label>
            <input required type="number" value={formEnvase.cantidad} onChange={(e) => setFormEnvase({ ...formEnvase, cantidad: e.target.value })} className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-center text-xl font-black text-slate-900 focus:border-blue-600 outline-none" />
          </div>
          <div className="space-y-2 text-left">
            <label className="text-[10px] font-black text-blue-600 text-center block">S/ GARANTÍA *</label>
            <input required type="number" min="0.50" step="0.5" value={formEnvase.dinero} onChange={(e) => setFormEnvase({ ...formEnvase, dinero: e.target.value })} className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-center text-xl font-black text-slate-900 focus:border-blue-600 outline-none font-mono" />
          </div>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button type="button" onClick={() => setFormEnvase({...formEnvase, pago: 'Efectivo'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${formEnvase.pago === 'Efectivo' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>EFECTIVO</button>
          <button type="button" onClick={() => setFormEnvase({...formEnvase, pago: 'Yape'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${formEnvase.pago === 'Yape' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-400'}`}>YAPE</button>
        </div>
        <button type="submit" disabled={!formularioEnvaseValido} className={`w-full font-black py-5 rounded-2xl shadow-xl uppercase text-xs tracking-widest border-b-4 transition-all ${formularioEnvaseValido ? 'bg-blue-600 text-white border-blue-900 active:border-b-0 active:translate-y-1' : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'}`}>REGISTRAR SALIDA</button>
      </form>
    </div>
  );
};

const HistorialEnvases = ({ statsEnvases, envasesFiltrados, nuevoIdEnvase, formatFechaCorta, toggleDevuelto }: any) => {
  return (
    <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300 w-full mx-auto">
      <div className="bg-slate-900 p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-blue-500">
        <div className="text-left w-full sm:w-auto"><h3 className="text-lg font-black text-white uppercase italic tracking-tighter">HISTORIAL RECIENTE</h3></div>
        <div className="flex gap-6 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex flex-col text-right"><span className="text-[8px] font-black text-emerald-400 uppercase mb-1">EFECTIVO</span><span className="text-xl font-black text-white font-mono">S/ {statsEnvases.cashPendiente.toFixed(2)}</span></div>
          <div className="flex flex-col text-right"><span className="text-[8px] font-black text-purple-400 uppercase mb-1">YAPE</span><span className="text-xl font-black text-white font-mono">S/ {statsEnvases.yapePendiente.toFixed(2)}</span></div>
        </div>
      </div>
      <div className="flex-1 p-2 sm:p-4 bg-slate-50 max-h-[500px] overflow-y-auto">
        <div className="sm:hidden space-y-3">
          {envasesFiltrados.map((item: any) => {
            const { dia, mes, esHoy } = formatFechaCorta(item.fecha);
            const esReciente = item.id === nuevoIdEnvase;
            return (
              <div key={item.id} className={`bg-white p-4 rounded-3xl border flex items-center justify-between transition-all duration-700 ${esReciente ? 'scale-[1.02] border-blue-400 ring-2 ring-blue-200 animate-pulse' : 'border-slate-100'}`}>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center justify-center">
                    <div className={`flex flex-col items-center p-2 rounded-xl w-12 border ${esReciente || esHoy ? 'bg-blue-600 border-blue-700 text-white' : 'bg-white border-slate-200'}`}>
                      <span className="text-md font-black">{dia}</span><span className={`text-[9px] uppercase font-bold ${esReciente || esHoy ? 'text-blue-100' : 'text-slate-400'}`}>{mes}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[12px] font-black text-slate-600 uppercase">{item.cliente}</p>
                    <p className="text-[11px] font-black uppercase italic">{item.envase}</p>
                    {item.trabajador && <p className="text-[8px] font-black text-slate-400 mt-1">TRAB: {item.trabajador.toUpperCase()}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black font-mono">S/ {Number(item.dinero).toFixed(2)}</p>
                  <button onClick={() => toggleDevuelto(item.id, item.devuelto)} className={`mt-1 text-[8px] font-black px-3 py-1 rounded-lg ${item.devuelto === 1 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    {item.devuelto === 1 ? 'RECIBIDO' : 'PENDIENTE'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden sm:block">
          <table className="w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
                <th className="px-4 py-2">Fecha</th><th className="px-4 py-2">Detalle</th><th className="px-4 py-2 text-center">Cant.</th><th className="px-4 py-2 text-right">Garantía</th><th className="px-4 py-2 text-center">Acc.</th>
              </tr>
            </thead>
            <tbody>
              {envasesFiltrados.map((item: any) => {
                const { dia, mes, esHoy } = formatFechaCorta(item.fecha);
                const esReciente = item.id === nuevoIdEnvase;
                return (
                  <tr key={item.id} className={`transition-all duration-1000 ease-in-out ${esReciente ? 'scale-[1.01]' : 'scale-100'}`}>
                    <td className={`px-4 py-3 rounded-l-2xl transition-colors duration-1000 ${esReciente ? 'bg-blue-600' : 'bg-white border-y border-l border-slate-100'}`}>
                      <div className="flex flex-col items-center justify-center">
                        <div className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl border ${esReciente ? 'bg-white text-blue-600 border-white' : esHoy ? 'bg-blue-600 text-white border-blue-700' : 'bg-slate-50 text-slate-900 border-slate-200'}`}>
                          <span className="text-sm font-black leading-none">{dia}</span><span className="text-[7px] font-black mt-1 uppercase">{mes}</span>
                        </div>
                      </div>
                    </td>
                    <td className={`px-4 py-3 ${esReciente ? 'bg-blue-600' : 'bg-white border-y border-slate-100'}`}>
                      <p className={`text-[10px] font-black uppercase ${esReciente ? 'text-blue-100' : 'text-slate-400'}`}>{item.cliente}</p>
                      <p className={`text-xs font-black uppercase italic ${esReciente ? 'text-white' : 'text-slate-900'}`}>{item.envase}</p>
                      {item.trabajador && <p className={`text-[9px] uppercase mt-1 font-bold ${esReciente ? 'text-blue-200' : 'text-slate-400'}`}>Atendido: {item.trabajador}</p>}
                    </td>
                    <td className={`px-4 py-3 text-center ${esReciente ? 'bg-blue-600' : 'bg-white border-y border-slate-100'}`}>
                      <span className={`text-lg font-black font-mono ${esReciente ? 'text-white' : 'text-blue-600'}`}>{item.cantidad}</span>
                    </td>
                    <td className={`px-4 py-3 text-right ${esReciente ? 'bg-blue-600' : 'bg-white border-y border-slate-100'}`}>
                      <p className={`text-md font-black font-mono ${esReciente ? 'text-white' : 'text-slate-900'}`}>S/ {Number(item.dinero).toFixed(2)}</p>
                      <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded inline-block mt-1 ${esReciente ? 'bg-blue-400 text-white' : (item.pago === 'Yape' ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600')}`}>{item.pago}</span>
                    </td>
                    <td className={`px-4 py-3 rounded-r-2xl text-center ${esReciente ? 'bg-blue-600' : 'bg-white border-y border-r border-slate-100'}`}>
                      <button onClick={() => toggleDevuelto(item.id, item.devuelto)} className={`text-[9px] font-black px-3 py-2 rounded-xl border-2 transition-all ${item.devuelto === 1 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                        {item.devuelto === 1 ? 'RECIBIDO' : 'PENDIENTE'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};


// ==========================================
// PÁGINA PRINCIPAL
// ==========================================
export default function GamificacionPage() {
  // ==========================================
  // ESTADOS GAMIFICACIÓN
  // ==========================================
  const [userXP, setUserXP] = useState<number>(0);
  const [puntos, setPuntos] = useState<number>(0); 
  const XP_POR_NIVEL = 1000;
  const userLevel = Math.floor(userXP / XP_POR_NIVEL) + 1;
  const progresoNivel = ((userXP % XP_POR_NIVEL) / XP_POR_NIVEL) * 100;

  // UI y Modales
  const [accionActiva, setAccionActiva] = useState<string | null>(null); 
  const [loadingDB, setLoadingDB] = useState(false);
  const [notificacion, setNotificacion] = useState<string | null>(null);
  
  const [vistaModal, setVistaModal] = useState<'form' | 'tabla'>('form');

  const dates = useMemo(() => {
    const hoy = new Date();
    const diaSemana = hoy.getDay();
    const difLunes = hoy.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1);
    const lunes = new Date(new Date().setDate(difLunes)).toISOString().split('T')[0];
    const domingo = new Date(new Date(lunes).setDate(new Date(lunes).getDate() + 6)).toISOString().split('T')[0];
    return { lunes, domingo, hoyStr: hoy.toISOString().split("T")[0] };
  }, []);

  const [fechaDesde, setFechaDesde] = useState(dates.lunes); 
  const [fechaHasta, setFechaHasta] = useState(dates.domingo);

  // ==========================================
  // ESTADOS Y LÓGICA DE TRABAJADOR
  // ==========================================
  const [horaActual, setHoraActual] = useState(new Date().getHours());
  const [turnoActual, setTurnoActual] = useState("");

  const determinarTrabajadorTurno = () => {
    const hoy = new Date();
    const hora = hoy.getHours();
    const dia = hoy.getDay(); // 0 = Domingo, 6 = Sábado

    if (hora < 16) {
      return "Catherine"; // Mañanas (Lunes a Domingo)
    } else {
      if (dia === 0 || dia === 6) {
        return "Axel"; // Tardes de fin de semana
      } else {
        return "María"; // Tardes de Lunes a Viernes
      }
    }
  };

  // ==========================================
  // ESTADOS ENVASES
  // ==========================================
  const [registrosEnvases, setRegistrosEnvases] = useState<any[]>([]);
  const [confirmandoEnvase, setConfirmandoEnvase] = useState(false);
  const [nuevoIdEnvase, setNuevoIdEnvase] = useState<number | null>(null);
  const [filtroEstadoEnvase, setFiltroEstadoEnvase] = useState("pendientes");

  const [formEnvase, setFormEnvase] = useState({ 
    cliente: "", envase: "", cantidad: "1", dinero: "2", pago: "Efectivo", trabajador: "" 
  });

  const formularioEnvaseValido = useMemo(() => {
    return (
      formEnvase.cliente.trim() !== "" && formEnvase.envase !== "" && 
      formEnvase.cantidad !== "" && Number(formEnvase.cantidad) > 0 &&
      formEnvase.dinero !== "" && Number(formEnvase.dinero) >= 0
    );
  }, [formEnvase]);

  const statsEnvases = useMemo(() => {
    const cashPendiente = registrosEnvases.filter(r => r.devuelto === 0 && r.pago === "Efectivo").reduce((acc, curr) => acc + (Number(curr.dinero) || 0), 0);
    const yapePendiente = registrosEnvases.filter(r => r.devuelto === 0 && r.pago === "Yape").reduce((acc, curr) => acc + (Number(curr.dinero) || 0), 0);
    return { cashPendiente, yapePendiente };
  }, [registrosEnvases]);

  const envasesFiltrados = useMemo(() => {
    let filtrados = [...registrosEnvases];
    if (filtroEstadoEnvase === "pendientes") filtrados = filtrados.filter(r => r.devuelto === 0);
    if (filtroEstadoEnvase === "devueltos") filtrados = filtrados.filter(r => r.devuelto === 1);
    return filtrados;
  }, [registrosEnvases, filtroEstadoEnvase]);

  // ==========================================
  // ESTADOS DINERO SOBRANTE
  // ==========================================
  const [registrosDinero, setRegistrosDinero] = useState<any[]>([]);
  const [confirmandoDinero, setConfirmandoDinero] = useState(false);
  const [nuevoIdDinero, setNuevoIdDinero] = useState<number | null>(null);

  const [formDinero, setFormDinero] = useState({ cajero: '', dinero: '', tipo: "1" });
  const listaCajeros = ["Katherine", "Maria", "Enma", "Nicol", "Axel"];

  const formularioDineroValido = useMemo(() => {
    return formDinero.cajero !== "" && formDinero.dinero !== "" && parseFloat(formDinero.dinero) > 0;
  }, [formDinero]);

  const resumenDinero = useMemo(() => {
    return registrosDinero.reduce((acc, item) => {
      const monto = parseFloat(item.dinero) || 0;
      acc.total += monto;
      if (item.tipo === 0 || item.tipo === "0") acc.yape += monto;
      else acc.efectivo += monto;
      return acc;
    }, { total: 0, efectivo: 0, yape: 0 });
  }, [registrosDinero]);

  // ==========================================
  // ESTADOS AUDITORÍA DE INVENTARIO
  // ==========================================
  const [tipoInventario, setTipoInventario] = useState<"faltantes" | "sobrantes">("faltantes");
  const [registrosInventario, setRegistrosInventario] = useState<any[]>([]);
  const [confirmandoInventario, setConfirmandoInventario] = useState(false);
  const [nuevoIdInventario, setNuevoIdInventario] = useState<number | null>(null);

  const [formInventario, setFormInventario] = useState({ producto: "", cantidad: "", precio: "" });

  const formularioInventarioValido = useMemo(() => {
    return formInventario.producto.trim() !== "" && formInventario.cantidad !== "" && parseFloat(formInventario.cantidad) > 0 && formInventario.precio !== "" && parseFloat(formInventario.precio) >= 0;
  }, [formInventario]);

  const INV_CONFIG = useMemo(() => ({
    faltantes: { color: "orange", bgBtn: "bg-orange-600", borderBtn: "border-orange-800", text: "text-orange-600", textLight: "text-orange-100", tablaBD: "prod_faltantes", label: "FALTANTES" },
    sobrantes: { color: "indigo", bgBtn: "bg-indigo-600", borderBtn: "border-indigo-800", text: "text-indigo-600", textLight: "text-indigo-100", tablaBD: "prod_sobrante", label: "SOBRANTES" }
  }[tipoInventario]), [tipoInventario]);

  const totalInventario = useMemo(() => {
    return registrosInventario.reduce((acc, item) => acc + (parseFloat(item.cantidad) * parseFloat(item.precio) || 0), 0);
  }, [registrosInventario]);

  // ==========================================
  // ESTADOS MURO Y MASCOTA
  // ==========================================
  const [animacionPersonaje, setAnimacionPersonaje] = useState<'idle' | 'saludar' | 'bailar' | 'dormir'>('idle');
  const [mensajeMascota, setMensajeMascota] = useState<string>("¡Hola! Listo para registrar.");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ==========================================
  // LOGROS DINÁMICOS
  // ==========================================
  const LOGROS_DINAMICOS = useMemo(() => {
    return [
      { id: 'l1', titulo: 'Cazador de Mermas', progreso: registrosInventario.filter(r => parseFloat(r.cantidad) > 0).length, total: 5, icono: '🔍' },
      { id: 'l2', titulo: 'Rey del Retorno', progreso: registrosEnvases.length, total: 20, icono: '♻️' },
      { id: 'l3', titulo: 'Negociador', progreso: registrosEnvases.length, total: 20, icono: '🔍'},
    ];
  }, [registrosEnvases, registrosInventario]);

  // ==========================================
  // EFECTOS Y FETCH DE DATOS
  // ==========================================

  // Efecto para inicializar y trackear el turno del trabajador
  useEffect(() => {
    const inicial = determinarTrabajadorTurno();
    setTurnoActual(inicial);
    setFormEnvase(prev => ({ ...prev, trabajador: inicial }));

    const interval = setInterval(() => {
      setHoraActual(new Date().getHours());
      const nuevoTurno = determinarTrabajadorTurno();
      if (nuevoTurno !== turnoActual) {
        setTurnoActual(nuevoTurno);
        setFormEnvase(prev => ({ ...prev, trabajador: nuevoTurno }));
      }
    }, 60000); // Revisa cada minuto

    return () => clearInterval(interval);
  }, [turnoActual]);


  useEffect(() => {
    fetchMuroYXP();
    fetchEnvases();
    fetchInventario();
  }, []);

  async function fetchMuroYXP() {
    const { data, error } = await supabase
      .from('gamificacion_logs')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(50);

    if (!error && data) {
      const totalXP = data.reduce((acc, curr) => acc + (curr.xp || 0), 0);
      setUserXP(totalXP);
      setPuntos(Math.floor(totalXP * 0.5));
    }
  }

  useEffect(() => { 
    if (accionActiva === 'envases') fetchEnvases(); 
    if (accionActiva === 'dine_sobrante') fetchDineroSobrante();
  }, [accionActiva, fechaDesde, fechaHasta]);

  useEffect(() => {
    if (accionActiva === 'inventario') fetchInventario();
  }, [accionActiva, fechaDesde, fechaHasta, tipoInventario]);

  async function fetchEnvases() {
    let query = supabase.from("envases").select("*").order("id", { ascending: false });
    if (fechaDesde && fechaHasta) query = query.gte("fecha", `${fechaDesde}T00:00:00`).lte("fecha", `${fechaHasta}T23:59:59`);
    const { data } = await query;
    setRegistrosEnvases(data || []);
  }

  async function fetchDineroSobrante() {
    let query = supabase.from("dine_sobrante").select("*").order("id", { ascending: false });
    if (fechaDesde && fechaHasta) query = query.gte("fecha", fechaDesde).lte("fecha", fechaHasta);
    const { data } = await query;
    setRegistrosDinero(data || []);
  }

  async function fetchInventario() {
    let query = supabase.from(INV_CONFIG.tablaBD).select("*").order("id", { ascending: false });
    if (fechaDesde && fechaHasta) query = query.gte("fecha", fechaDesde).lte("fecha", fechaHasta);
    const { data } = await query;
    setRegistrosInventario(data || []);
  }

  // ==========================================
  // LÓGICA DE DIBUJO DEL HUEVO (CANVAS)
  // ==========================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationFrameId: number;
    let tick = 0;
    const render = () => {
      tick += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      
      const cy = canvas.height / 2 + 10;
      let bodyY = cy; let rotation = 0; let wave = 0;

      if (animacionPersonaje === 'bailar') { bodyY += Math.abs(Math.sin(tick * 3)) * 10 - 5; rotation = Math.sin(tick * 2) * 0.2; }
      else if (animacionPersonaje === 'saludar') { wave = Math.sin(tick * 4) * 0.5; }
      else if (animacionPersonaje === 'dormir') { bodyY += Math.sin(tick * 1) * 2; }

      ctx.fillStyle = 'rgba(0,0,0,0.05)'; ctx.beginPath(); ctx.ellipse(cx, 
      cy + 55, 30 + (animacionPersonaje === 'bailar' ? Math.abs(Math.sin(tick * 3)) * 5 : 0), 8, 0, 0, 2 * Math.PI);
      ctx.fill();
      ctx.save(); ctx.translate(cx, bodyY); ctx.rotate(rotation);
      const breatheY = animacionPersonaje === 'idle' ? Math.sin(tick) * 3 : 0;
      const breatheX = animacionPersonaje === 'idle' ? Math.cos(tick) * 1.5 : 0;
      
      ctx.fillStyle = animacionPersonaje === 'dormir' ?
      '#fdba74' : '#fb923c'; ctx.beginPath(); ctx.ellipse(0, 10, 38 + breatheX, 42 + breatheY, 0, 0, 2 * Math.PI); ctx.fill();
      ctx.strokeStyle = '#ea580c'; ctx.lineWidth = 3; ctx.stroke();
      if (animacionPersonaje === 'saludar' || animacionPersonaje === 'bailar') {
        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = 8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(35, 10); ctx.quadraticCurveTo(55, -10 + (wave * 20), 45, -30 + (wave * 20));
        ctx.stroke();
      }
      ctx.fillStyle = '#1e293b';
      if (animacionPersonaje === 'dormir') {
        ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(-7, 0);
        ctx.stroke(); ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(15, 0); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 15, 4, 0, Math.PI * 2); ctx.fill();
      } else {
        const parpadeo = Math.sin(tick * 0.5) > 0.96 ?
        1 : 8; ctx.beginPath(); ctx.ellipse(-12, 0, 5, parpadeo, 0, 0, 2 * Math.PI); ctx.fill(); ctx.beginPath();
        ctx.ellipse(12, 0, 5, parpadeo, 0, 0, 2 * Math.PI); ctx.fill();
        ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2.5; ctx.beginPath();
        ctx.arc(0, 10, animacionPersonaje === 'bailar' ? 12 : 8, 0, Math.PI, false); ctx.stroke();
      }
      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };
    render(); return () => cancelAnimationFrame(animationFrameId);
  }, [animacionPersonaje]);

  useEffect(() => {
    const interval = setInterval(() => setAnimacionPersonaje(Math.random() > 0.5 ? 'idle' : 'saludar'), 6000);
    return () => clearInterval(interval);
  }, []);

  // ==========================================
  // FUNCIONES BD Y GAMIFICACIÓN
  // ==========================================
  const ejecutarMision = async (xpGanada: number, puntosGanados: number, accionMensaje: string) => {
    await supabase.from('gamificacion_logs').insert([{ 
      usuario: 'Sistema', 
      accion: accionMensaje, 
      xp: xpGanada, 
      tipo: 'logro' 
    }]);
    setMensajeMascota(`¡Bien! +${xpGanada} XP 🪙`); 
    setAnimacionPersonaje('bailar');
    fetchMuroYXP();
  };

  const guardarRegistroEnvase = async () => {
    if (!formularioEnvaseValido) return;
    const { data, error } = await supabase.from("envases").insert([{
      cliente: formEnvase.cliente.toUpperCase(), 
      envase: formEnvase.envase, 
      cantidad: Number(formEnvase.cantidad), 
      dinero: Number(formEnvase.dinero), 
      pago: formEnvase.pago, 
      trabajador: formEnvase.trabajador, // Se incluye el trabajador actual
      fecha: new Date().toISOString(), 
      devuelto: 0 
    }]).select();

    if (!error && data) {
      setNotificacion(`Envase guardado exitosamente`);
      ejecutarMision(10, 5, `♻️ Retorno registrado: ${formEnvase.envase}`);
      // Mantiene al trabajador logeado
      setFormEnvase({ cliente: "", envase: "", cantidad: "", dinero: "", pago: "Efectivo", trabajador: formEnvase.trabajador });
      setConfirmandoEnvase(false);
      setNuevoIdEnvase(data[0].id);
      fetchEnvases();
      setVistaModal('tabla'); 
      setTimeout(() => setNuevoIdEnvase(null), 8000);
    }
  }

  const toggleDevuelto = async (id: number, estadoActual: number) => {
    const nuevoEstado = estadoActual === 1 ? 0 : 1;
    const { error } = await supabase.from("envases").update({ devuelto: nuevoEstado }).eq("id", id);
    if (!error) fetchEnvases();
  }

  const guardarRegistroDinero = async () => {
    if (!formularioDineroValido) return;
    const { data, error } = await supabase.from("dine_sobrante").insert([{
      cajero: formDinero.cajero, dinero: parseFloat(formDinero.dinero), tipo: parseInt(formDinero.tipo), fecha: dates.hoyStr
    }]).select();
    
    if (!error && data) {
      setNotificacion(`Ingreso de ${formDinero.cajero} guardado`);
      ejecutarMision(30, 15, `💵 Sobrante reportado: S/ ${formDinero.dinero}`);
      setFormDinero({ cajero: '', dinero: '', tipo: "1" });
      setConfirmandoDinero(false);
      setNuevoIdDinero(data[0].id);
      fetchDineroSobrante();
      setVistaModal('tabla');
      setTimeout(() => setNuevoIdDinero(null), 8000);
    }
  }

  const guardarRegistroInventario = async () => {
    if (!formularioInventarioValido) return;
    const { data, error } = await supabase.from(INV_CONFIG.tablaBD).insert([{
      producto: formInventario.producto.toUpperCase(),
      cantidad: parseInt(formInventario.cantidad),
      precio: parseFloat(formInventario.precio),
      fecha: dates.hoyStr
    }]).select();

    if (!error && data) {
      setNotificacion(`${INV_CONFIG.label} REGISTRADO EXITOSAMENTE`);
      ejecutarMision(20, 10, `📦 ${INV_CONFIG.label} reportado: ${formInventario.producto}`);
      setFormInventario({ producto: "", cantidad: "", precio: "" });
      setConfirmandoInventario(false);
      setNuevoIdInventario(data[0].id);
      fetchInventario();
      setVistaModal('tabla');
      setTimeout(() => setNuevoIdInventario(null), 8000);
    }
  }

  const formatFechaCorta = (fechaStr: string) => {
    const fecha = new Date(fechaStr);
    const hoy = new Date();
    const esHoy = fecha.getDate() === hoy.getDate() && fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear();
    const dia = fecha.getDate();
    const mes = fecha.toLocaleString('es-ES', { month: 'short' }).replace('.', '').toUpperCase();
    const horaFormateada = fecha.toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'}).toUpperCase();
    return { dia, mes, horaFormateada, esHoy };
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-12 overflow-x-hidden">
      
      {notificacion && (
        <div className="fixed top-6 right-6 z-[1000] animate-in slide-in-from-right duration-500">
          <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border-l-4 border-emerald-500 flex items-center gap-3">
            <p className="text-[11px] font-black uppercase tracking-wider">{notificacion}</p>
          </div>
        </div>
      )}

      {/* HEADER GAMIFICACIÓN */}
      <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm p-4">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex-1 max-w-xs">
            <h1 className="text-sm font-black text-slate-900">NIVEL {userLevel}</h1>
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden my-1">
              <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${progresoNivel}%` }}></div>
            </div>
            <p className="text-[10px] font-bold text-slate-500">{userXP} / {(userLevel) * XP_POR_NIVEL} XP</p>
          </div>
          <div className="bg-amber-100 border border-amber-200 px-4 py-2 rounded-xl font-black text-amber-800 text-lg">
            🪙 {puntos}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMNA IZQUIERDA (Principal) */}
        <div className="lg:col-span-2 space-y-6">
           
          <section>
            <h3 className="text-sm font-black text-slate-800 uppercase mb-3">⚡ Acciones del Turno</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button onClick={() => { setAccionActiva('envases'); setVistaModal('form'); }} className="bg-blue-600 text-white p-4 rounded-2xl shadow-sm hover:scale-105 transition-all text-left">
                <span className="text-2xl block mb-2">♻️</span><span className="font-bold text-sm block">Retorno Envases</span>
              </button>
              <button onClick={() => { setAccionActiva('dine_sobrante'); setVistaModal('form'); }} className="bg-emerald-600 text-white p-4 rounded-2xl shadow-sm hover:scale-105 transition-all text-left">
                <span className="text-2xl block mb-2">💵</span><span className="font-bold text-sm block">Dinero Sobrante</span>
              </button>
              <button onClick={() => { setAccionActiva('inventario'); setVistaModal('form'); }} className="bg-orange-600 text-white p-4 rounded-2xl shadow-sm hover:scale-105 transition-all text-left">
                <span className="text-2xl block mb-2">📦</span><span className="font-bold text-sm block">Auditoría Prod.</span>
              </button>
              <a href="registro/proveedores" className="bg-indigo-600 text-white p-4 rounded-2xl shadow-sm hover:scale-105 transition-all text-left block">
                <span className="text-2xl block mb-2">🚚</span>
                <span className="font-bold text-sm block">Proveedores</span>
              </a>
            </div>
          </section>

          <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-8">
              <div className="flex-1">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">Logros</h3>
                <div className="space-y-4">
                  {LOGROS_DINAMICOS.map(l => (
                    <div key={l.id} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl">{l.icono}</div>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1"><span className="font-bold">{l.titulo}</span><span className="font-black text-blue-600">{l.progreso}/{l.total}</span></div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{width: `${(l.progreso/l.total)*100}%`}}></div></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 border-t sm:border-t-0 sm:border-l border-slate-100 pt-6 sm:pt-0 sm:pl-8">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">Insignias</h3>
                <div className="grid grid-cols-1 gap-3">
                  {INSIGNIAS.map(i => (
                    <div key={i.id} className={`flex items-center gap-4 p-3 rounded-2xl border ${i.desbloqueado ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl bg-gradient-to-br ${i.color}`}>{i.icono}</div>
                      <div><h4 className="font-bold text-sm">{i.titulo}</h4><p className="text-[10px] text-slate-500">{i.desc}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* COLUMNA DERECHA (Mascota) */}
        <div className="space-y-6">
          <aside className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col items-center sticky top-24">
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3 mb-2 w-full text-center min-h-[50px] flex items-center justify-center relative">
              <p className="text-xs font-bold text-indigo-800">{mensajeMascota}</p>
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-indigo-50 border-b border-r border-indigo-100 rotate-45"></div>
            </div>
            <canvas ref={canvasRef} width={200} height={180} className="bg-transparent mt-2" />
          </aside>
        </div>
      </main>

      {/* =========================================
          POP-UPS CONFIRMACIONES
      ========================================= */}
      {confirmandoEnvase && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md" onClick={() => setConfirmandoEnvase(false)}></div>
          <div className="bg-white rounded-[3rem] p-8 shadow-2xl border-t-[15px] border-blue-600 text-center relative z-10 animate-in zoom-in duration-300 max-w-sm w-full">
            <h2 className="text-3xl font-black text-slate-900 uppercase italic mb-6 leading-none">REVISAR SALIDA</h2>
            <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 mb-8">
              <p className="text-xl font-black text-slate-900 uppercase">{formEnvase.cliente}</p>
              <p className="text-2xl font-black text-blue-600 uppercase">{formEnvase.cantidad} {formEnvase.envase}</p>
              <p className="text-2xl font-black text-emerald-600 font-mono">S/ {Number(formEnvase.dinero).toFixed(2)}</p>
              {/* VISUALIZAMOS AL TRABAJADOR EN EL RESUMEN */}
              <p className="text-[10px] font-black text-slate-400 mt-4 uppercase">Atendido por: {formEnvase.trabajador}</p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setConfirmandoEnvase(false)} className="flex-1 bg-slate-100 text-slate-500 font-black py-4 rounded-2xl uppercase text-[11px]">CORREGIR</button>
              <button onClick={guardarRegistroEnvase} className="flex-1 bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl uppercase text-[11px]">CONFIRMAR</button>
            </div>
          </div>
        </div>
      )}

      {confirmandoDinero && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md" onClick={() => setConfirmandoDinero(false)}></div>
          <div className="bg-white rounded-[3rem] p-8 shadow-2xl border-t-[15px] border-emerald-600 text-center relative z-10 animate-in zoom-in duration-300 max-w-sm w-full">
            <h2 className="text-3xl font-black text-slate-900 uppercase italic mb-6 leading-none">VALIDAR SOBRANTE</h2>
            <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 mb-8 space-y-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Cajero y Método</p>
                <p className="text-xl font-black text-slate-900 uppercase">{formDinero.cajero} <span className="text-emerald-500">•</span> {formDinero.tipo === "1" ? "EFECTIVO" : "YAPE"}</p>
              </div>
              <div className="pt-4 border-t-2 border-dashed border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Monto a Ingresar</p>
                <p className="text-4xl font-black text-emerald-600">S/ {parseFloat(formDinero.dinero).toFixed(2)}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setConfirmandoDinero(false)} className="flex-1 bg-slate-100 text-slate-500 font-black py-4 rounded-2xl uppercase text-[11px]">CORREGIR</button>
              <button onClick={guardarRegistroDinero} className="flex-1 bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl uppercase text-[11px]">CONFIRMAR</button>
            </div>
          </div>
        </div>
      )}

      {confirmandoInventario && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md" onClick={() => setConfirmandoInventario(false)}></div>
          <div className={`bg-white rounded-[3rem] p-8 shadow-2xl border-t-[15px] ${INV_CONFIG.borderBtn} text-center relative z-10 animate-in zoom-in duration-300 max-w-sm w-full`}>
            <h2 className="text-3xl font-black text-slate-900 uppercase italic mb-6 leading-none">REVISAR REGISTRO</h2>
            <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 mb-8 space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{INV_CONFIG.label}</p>
              <p className="text-xl font-black text-slate-900 uppercase my-2">{formInventario.producto.toUpperCase()}</p>
              <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Cantidad</p>
                  <p className="text-2xl font-black text-slate-900">{formInventario.cantidad}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Subtotal</p>
                  <p className={`text-2xl font-black ${INV_CONFIG.text}`}>S/ {(parseFloat(formInventario.cantidad) * parseFloat(formInventario.precio)).toFixed(2)}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setConfirmandoInventario(false)} className="flex-1 bg-slate-100 text-slate-500 font-black py-4 rounded-2xl uppercase text-[11px]">CORREGIR</button>
              <button onClick={guardarRegistroInventario} className={`flex-1 ${INV_CONFIG.bgBtn} text-white font-black py-4 rounded-2xl shadow-xl uppercase text-[11px]`}>CONFIRMAR</button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          MODALES DE ACCIONES PRINCIPALES
      ========================================= */}
      {accionActiva && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4">
          <div className={`relative w-full ${vistaModal === 'tabla' ? 'max-w-2xl' : 'max-w-md'} max-h-[95vh] overflow-y-auto bg-slate-50 rounded-[2rem] sm:rounded-[3rem] shadow-2xl transition-all duration-300`}>

            <button onClick={() => { setAccionActiva(null); setVistaModal('form'); }} className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 w-10 h-10 bg-slate-800 text-white rounded-full flex items-center justify-center font-bold hover:bg-slate-900 shadow-md">✕</button>

            <div className="p-4 sm:p-8 pt-2">
  
            {/* TABS PARA CAMBIAR ENTRE FORMULARIO E HISTORIAL */}
            <div className="flex bg-slate-200 p-1 rounded-xl mb-6">
              <button
                onClick={() => setVistaModal('form')}
                className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  vistaModal === 'form' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                ✏️ Registrar
              </button>
              <button
                onClick={() => setVistaModal('tabla')}
                className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  vistaModal === 'tabla' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                📋 Historial
              </button>
            </div>
                      
            {/* MODAL ENVASES */}
            {accionActiva === 'envases' && (
                <>
                  {vistaModal === 'form' && (
                    <FormularioEnvase 
                      formEnvase={formEnvase}
                      setFormEnvase={setFormEnvase}
                      formularioEnvaseValido={formularioEnvaseValido}
                      setConfirmandoEnvase={setConfirmandoEnvase}
                      horaActual={horaActual}
                    />
                  )}

                  {vistaModal === 'tabla' && (
                    <HistorialEnvases 
                      statsEnvases={statsEnvases}
                      envasesFiltrados={envasesFiltrados}
                      nuevoIdEnvase={nuevoIdEnvase}
                      formatFechaCorta={formatFechaCorta}
                      toggleDevuelto={toggleDevuelto}
                    />
                  )}
                </>
              )}

              {/* MODAL DINERO SOBRANTE */}
              {accionActiva === 'dine_sobrante' && (
                <>
                  {vistaModal === 'form' && (
                    <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-xl border-b-[10px] border-emerald-600 animate-in fade-in zoom-in duration-300">
                      <h3 className="text-xl font-black text-slate-900 uppercase text-center mb-6 italic">Dinero Sobrante</h3>
                      <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); if(formularioDineroValido) setConfirmandoDinero(true); }}>
                        <div>
                          <label className="text-[10px] font-black text-emerald-600 uppercase mb-3 block tracking-widest ml-1">Cajero de Turno</label>
                          <select required value={formDinero.cajero} onChange={(e) => setFormDinero({ ...formDinero, cajero: e.target.value })} className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-sm font-black text-slate-900 outline-none uppercase appearance-none transition-all">
                            <option value="">SELECCIONAR...</option>
                            {listaCajeros.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-emerald-600 uppercase mb-3 block tracking-widest ml-1">Método</label>
                          <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
                            <button type="button" onClick={() => setFormDinero({...formDinero, tipo: "1"})} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${formDinero.tipo === "1" ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>EFECTIVO</button>
                            <button type="button" onClick={() => setFormDinero({...formDinero, tipo: "0"})} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${formDinero.tipo === "0" ? 'bg-[#7322e1] text-white shadow-sm' : 'text-slate-400'}`}>YAPE</button>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-emerald-600 uppercase mb-3 block tracking-widest ml-1">Monto Excedente</label>
                          <div className="relative flex items-center">
                            <span className="absolute left-5 text-2xl font-black text-emerald-500">S/</span>
                            <input required type="number" step="0.10" placeholder="0.00" value={formDinero.dinero} onChange={(e) => setFormDinero({ ...formDinero, dinero: e.target.value })} className="w-full border-2 border-slate-100 bg-slate-50 p-6 pl-14 rounded-3xl text-center text-5xl font-black text-slate-900 outline-none transition-all" />
                          </div>
                        </div>
                        <button type="submit" disabled={!formularioDineroValido} className={`w-full font-black py-5 rounded-2xl shadow-xl uppercase text-xs tracking-widest border-b-4 transition-all ${formularioDineroValido ? 'bg-emerald-600 text-white border-emerald-900 active:border-b-0 active:translate-y-1' : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'}`}>REGISTRAR INGRESO</button>
                      </form>
                    </div>
                  )}

                  {vistaModal === 'tabla' && (
                    <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300 w-full mx-auto">
                      <div className="bg-slate-900 p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-emerald-500">
                        <div className="text-left w-full sm:w-auto"><h3 className="text-lg font-black text-white uppercase italic tracking-tighter">HISTORIAL RECIENTE</h3></div>
                        <div className="flex gap-4 w-full sm:w-auto justify-between sm:justify-end">
                          <div className="flex flex-col text-right"><span className="text-[8px] font-black text-slate-400 uppercase mb-1">EFECTIVO</span><span className="text-lg font-black text-white font-mono">S/ {resumenDinero.efectivo.toFixed(2)}</span></div>
                          <div className="flex flex-col text-right"><span className="text-[8px] font-black text-[#a77df3] uppercase mb-1">YAPE</span><span className="text-lg font-black text-[#d0bcff] font-mono">S/ {resumenDinero.yape.toFixed(2)}</span></div>
                          <div className="flex flex-col text-right pl-4 border-l border-slate-700"><span className="text-[8px] font-black text-emerald-400 uppercase mb-1">TOTAL</span><span className="text-lg font-black text-emerald-400 font-mono">S/ {resumenDinero.total.toFixed(2)}</span></div>
                        </div>
                      </div>
                      <div className="flex-1 p-2 sm:p-4 bg-slate-50 max-h-[500px] overflow-y-auto">
                        <table className="w-full border-separate border-spacing-y-2">
                          <thead>
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
                              <th className="px-4 py-2">Fecha</th>
                              <th className="px-4 py-2">Cajero</th>
                              <th className="px-4 py-2 text-center">Tipo</th>
                              <th className="px-4 py-2 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {registrosDinero.map((item) => {
                              const { dia, mes, esHoy } = formatFechaCorta(item.fecha);
                              const esReciente = item.id === nuevoIdDinero;
                              return (
                                <tr key={item.id} className={`transition-all duration-1000 ease-in-out ${esReciente ? 'scale-[1.01]' : 'scale-100'}`}>
                                  <td className={`px-4 py-3 rounded-l-2xl transition-colors duration-1000 ${esReciente ? 'bg-emerald-600' : 'bg-white border-y border-l border-slate-100'}`}>
                                    <div className="flex flex-col items-center justify-center">
                                      <div className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl border ${esReciente ? 'bg-white text-emerald-600 border-white' : esHoy ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-slate-50 text-slate-900 border-slate-200'}`}>
                                        <span className="text-sm font-black leading-none">{dia}</span><span className="text-[7px] font-black mt-1 uppercase">{mes}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className={`px-4 py-3 ${esReciente ? 'bg-emerald-600' : 'bg-white border-y border-slate-100'}`}>
                                    <p className={`text-xs font-black uppercase ${esReciente ? 'text-white' : 'text-slate-900'}`}>{item.cajero}</p>
                                  </td>
                                  <td className={`px-4 py-3 text-center ${esReciente ? 'bg-emerald-600' : 'bg-white border-y border-slate-100'}`}>
                                    {item.tipo === 0 || item.tipo === "0" ? (
                                      <span className={`text-[8px] font-black px-3 py-1 rounded-full uppercase ${esReciente ? 'bg-white text-[#7322e1]' : 'bg-[#7322e1] text-white'}`}>Yape</span>
                                    ) : (
                                      <span className={`text-[8px] font-black px-3 py-1 rounded-full uppercase ${esReciente ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-200 text-slate-600'}`}>Cash</span>
                                    )}
                                  </td>
                                  <td className={`px-4 py-3 rounded-r-2xl text-right ${esReciente ? 'bg-emerald-600' : 'bg-white border-y border-r border-slate-100'}`}>
                                    <p className={`text-lg font-black font-mono ${esReciente ? 'text-white' : 'text-emerald-600'}`}>S/ {parseFloat(item.dinero).toFixed(2)}</p>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* MODAL INVENTARIO (FALTANTES Y SOBRANTES) */}
              {accionActiva === 'inventario' && (
                <>
                  <div className="flex justify-center gap-2 mb-4">
                    <button onClick={() => setTipoInventario("faltantes")} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${tipoInventario === "faltantes" ? "bg-orange-600 text-white shadow-md" : "bg-white text-slate-400 border border-slate-200 hover:text-orange-500"}`}>📉 Faltantes</button>
                    <button onClick={() => setTipoInventario("sobrantes")} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${tipoInventario === "sobrantes" ? "bg-indigo-600 text-white shadow-md" : "bg-white text-slate-400 border border-slate-200 hover:text-indigo-500"}`}>📦 Sobrantes</button>
                  </div>
                  
                  {vistaModal === 'form' && (
                    <div className={`bg-white p-6 sm:p-8 rounded-[2rem] shadow-xl border-b-[10px] ${INV_CONFIG.borderBtn} animate-in fade-in zoom-in duration-300`}>
                      <h3 className={`text-xl font-black ${INV_CONFIG.text} uppercase text-center mb-6 italic`}>Reporte de {INV_CONFIG.label.split('.')[0]}</h3>
                      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); if(formularioInventarioValido) setConfirmandoInventario(true); }}>
                        <input required placeholder="PRODUCTO (Ej. COCA COLA 1L)" value={formInventario.producto} onChange={(e) => setFormInventario({ ...formInventario, producto: e.target.value })} className={`w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-sm font-black outline-none uppercase transition-all focus:${INV_CONFIG.borderBtn}`} />
                        <div className="grid grid-cols-2 gap-4">
                          <input required type="number" placeholder="CANTIDAD" value={formInventario.cantidad} onChange={(e) => setFormInventario({ ...formInventario, cantidad: e.target.value })} className={`w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-center font-black outline-none transition-all focus:${INV_CONFIG.borderBtn}`} />
                          <input required type="number" step="0.10" placeholder="PRECIO UNIT. S/" value={formInventario.precio} onChange={(e) => setFormInventario({ ...formInventario, precio: e.target.value })} className={`w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-center font-black outline-none transition-all focus:${INV_CONFIG.borderBtn}`} />
                        </div>
                        <button type="submit" disabled={!formularioInventarioValido} className={`w-full ${INV_CONFIG.bgBtn} text-white font-black py-5 rounded-2xl shadow-xl uppercase border-b-4 ${INV_CONFIG.borderBtn} active:border-b-0 text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed`}>REGISTRAR {INV_CONFIG.label.split('.')[0]}</button>
                      </form>
                    </div>
                  )}

                  {vistaModal === 'tabla' && (
                    <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300 w-full mx-auto">
                      <div className={`p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-center gap-4 border-b ${INV_CONFIG.bgBtn} text-white`}>
                        <div className="text-left w-full sm:w-auto"><h3 className="text-lg font-black uppercase italic tracking-tighter">HISTORIAL {INV_CONFIG.label.split('.')[0]}</h3></div>
                        <div className="flex gap-4 w-full sm:w-auto justify-between sm:justify-end">
                          <div className="flex flex-col text-right"><span className={`text-[8px] font-black ${INV_CONFIG.textLight} uppercase mb-1`}>TOTAL ACUMULADO</span><span className="text-xl font-black font-mono">S/ {totalInventario.toFixed(2)}</span></div>
                        </div>
                      </div>
                      <div className="flex-1 p-2 sm:p-4 bg-slate-50 max-h-[400px] overflow-y-auto">
                        <table className="w-full border-separate border-spacing-y-2">
                          <thead>
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
                              <th className="px-4 py-2">Fecha</th>
                              <th className="px-4 py-2">Producto</th>
                              <th className="px-4 py-2 text-center">Cant.</th>
                              <th className="px-4 py-2 text-right">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {registrosInventario.map((item) => {
                              const { dia, mes, esHoy } = formatFechaCorta(item.fecha);
                              const esReciente = item.id === nuevoIdInventario;
                              return (
                                <tr key={item.id} className={`transition-all duration-1000 ease-in-out ${esReciente ? 'scale-[1.01]' : 'scale-100'}`}>
                                  <td className={`px-4 py-3 rounded-l-2xl transition-colors duration-1000 ${esReciente ? INV_CONFIG.bgBtn : 'bg-white border-y border-l border-slate-100'}`}>
                                    <div className="flex flex-col items-center justify-center">
                                      <div className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl border ${esReciente ? `bg-white ${INV_CONFIG.text} border-white` : esHoy ? `${INV_CONFIG.bgBtn} text-white ${INV_CONFIG.borderBtn}` : 'bg-slate-50 text-slate-900 border-slate-200'}`}>
                                        <span className="text-sm font-black leading-none">{dia}</span><span className="text-[7px] font-black mt-1 uppercase">{mes}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className={`px-4 py-3 ${esReciente ? INV_CONFIG.bgBtn : 'bg-white border-y border-slate-100'}`}>
                                    <p className={`text-xs font-black uppercase ${esReciente ? 'text-white' : 'text-slate-900'}`}>{item.producto}</p>
                                    <p className={`text-[9px] font-bold uppercase ${esReciente ? INV_CONFIG.textLight : 'text-slate-400'}`}>Unit: S/ {parseFloat(item.precio).toFixed(2)}</p>
                                  </td>
                                  <td className={`px-4 py-3 text-center ${esReciente ? INV_CONFIG.bgBtn : 'bg-white border-y border-slate-100'}`}>
                                    <span className={`text-[10px] font-black px-3 py-1 rounded-full ${esReciente ? `bg-white ${INV_CONFIG.text}` : `${INV_CONFIG.bgBtn.replace('bg-', 'bg-').concat('/10')} ${INV_CONFIG.text}`}`}>{item.cantidad}</span>
                                  </td>
                                  <td className={`px-4 py-3 rounded-r-2xl text-right ${esReciente ? INV_CONFIG.bgBtn : 'bg-white border-y border-r border-slate-100'}`}>
                                    <p className={`text-lg font-black font-mono ${esReciente ? 'text-white' : INV_CONFIG.text}`}>S/ {(parseFloat(item.cantidad) * parseFloat(item.precio)).toFixed(2)}</p>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}