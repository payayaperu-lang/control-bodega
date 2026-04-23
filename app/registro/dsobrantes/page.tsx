"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "../../lib/supabase";

export default function DineroSobrantePage() {
  const [registros, setRegistros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificacion, setNotificacion] = useState<string | null>(null); 
  
  const { lunesActual, domingoActual, primerDiaMes, ultimoDiaMes, hoyStr } = useMemo(() => {
    const hoy = new Date();
    const diaSemana = hoy.getDay(); 
    const dif = hoy.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1);
    const lunes = new Date(new Date().setDate(dif)).toISOString().split('T')[0];
    const domingo = new Date(new Date(lunes).setDate(new Date(lunes).getDate() + 6)).toISOString().split('T')[0];
    const primero = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
    const ultimo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0];
    return { lunesActual: lunes, domingoActual: domingo, primerDiaMes: primero, ultimoDiaMes: ultimo, hoyStr: hoy.toISOString().split("T")[0] };
  }, []);

  const [fechaDesde, setFechaDesde] = useState(lunesActual);
  const [fechaHasta, setFechaHasta] = useState(domingoActual);
  const [filtroCajero, setFiltroCajero] = useState("todos");

  const [confirmando, setConfirmando] = useState(false);
  const [bloqueoEnter, setBloqueoEnter] = useState(false);
  const btnConfirmarRef = useRef<HTMLButtonElement>(null);

  const [nuevo, setNuevo] = useState({ cajero: "", dinero: "", tipo: "1" });
  const listaCajeros = ["Katherine", "Maria", "Enma", "Axel"];

  const esSemana = fechaDesde === lunesActual && fechaHasta === domingoActual;
  const esMes = fechaDesde === primerDiaMes && fechaHasta === ultimoDiaMes;

  // CÁLCULOS DIVIDIDOS POR TIPO
  const resumenDinero = useMemo(() => {
    return registros.reduce((acc, item) => {
      const monto = parseFloat(item.dinero) || 0;
      acc.total += monto;
      if (item.tipo === 0 || item.tipo === "0") {
        acc.yape += monto;
      } else {
        acc.efectivo += monto;
      }
      return acc;
    }, { total: 0, efectivo: 0, yape: 0 });
  }, [registros]);

  const formatFechaCorta = (fechaStr: string) => {
    const fecha = new Date(fechaStr + "T00:00:00");
    const dia = fecha.getDate();
    const mes = fecha.toLocaleString('es-ES', { month: 'short' }).replace('.', '').toUpperCase();
    return { dia, mes };
  };

  useEffect(() => { fetchDatos(); }, [fechaDesde, fechaHasta, filtroCajero]);

  useEffect(() => {
    if (confirmando) {
      setBloqueoEnter(true);
      const timer = setTimeout(() => {
        btnConfirmarRef.current?.focus();
        setBloqueoEnter(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [confirmando]);

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

  async function fetchDatos() {
    setLoading(true);
    let querySob = supabase.from("dine_sobrante").select("*").order("id", { ascending: false });
    if (fechaDesde && fechaHasta) querySob = querySob.gte("fecha", fechaDesde).lte("fecha", fechaHasta);
    if (filtroCajero !== "todos") querySob = querySob.eq("cajero", filtroCajero);
    const { data } = await querySob;
    setRegistros(data || []);
    setLoading(false);
  }

  const prepararRegistro = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!nuevo.cajero || !nuevo.dinero || parseFloat(nuevo.dinero) <= 0) {
      return alert("⚠️ Selecciona un cajero e ingresa un monto válido");
    }
    setConfirmando(true);
  };

  async function guardarSobrante() {
    if (bloqueoEnter) return;
    const { error } = await supabase.from("dine_sobrante").insert([{
      cajero: nuevo.cajero,
      dinero: parseFloat(nuevo.dinero),
      tipo: parseInt(nuevo.tipo),
      fecha: hoyStr
    }]);
    if (!error) {
      setNotificacion(`INGRESO DE ${nuevo.cajero} REGISTRADO`);
      setNuevo({ cajero: "", dinero: "", tipo: "1" });
      setConfirmando(false);
      fetchDatos();
    }
  }

  return (
    <>
      {notificacion && (
        <div className="fixed top-6 right-6 z-[1000] animate-in slide-in-from-right duration-500">
          <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border-l-4 border-emerald-500 flex items-center gap-3">
            <div className="bg-emerald-500/20 p-1 rounded-full text-emerald-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <p className="text-[11px] font-black uppercase tracking-wider">{notificacion}</p>
          </div>
        </div>
      )}

      {confirmando && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md" onClick={() => setConfirmando(false)}></div>
          <div className="bg-white rounded-[4rem] p-10 shadow-2xl border-t-[15px] border-emerald-600 text-center relative z-10 max-w-sm w-full animate-in zoom-in duration-200">
            <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter mb-6 leading-none">VALIDAR<br/>SOBRANTE</h2>
            <div className="bg-slate-50 p-6 rounded-[2.5rem] border-2 border-slate-100 mb-8 space-y-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Cajero y Método</p>
                <p className="text-xl font-black text-slate-900 uppercase">
                  {nuevo.cajero} <span className="text-emerald-500">•</span> {nuevo.tipo === "1" ? "EFECTIVO" : "YAPE"}
                </p>
              </div>
              <div className="pt-4 border-t-2 border-dashed border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Monto a Ingresar</p>
                <p className="text-5xl font-black text-emerald-600">S/ {parseFloat(nuevo.dinero).toFixed(2)}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setConfirmando(false)} className="flex-1 bg-slate-100 text-slate-500 font-black py-5 rounded-2xl uppercase text-[10px]">CORREGIR</button>
              <button ref={btnConfirmarRef} onClick={guardarSobrante} className="flex-1 bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl uppercase text-[10px] border-b-4 border-emerald-900 active:border-b-0">CONFIRMAR</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8 p-4 min-h-screen flex flex-col relative bg-slate-50">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 shrink-0 pt-4">
          <div>
            <h2 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em] mb-1 ml-1">Terminal de Auditoría</h2>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">SOBRANTE<span className="text-emerald-600">.CASH</span></h1>
          </div>

          <div className="flex items-center gap-4 bg-white p-3 rounded-[2.5rem] shadow-xl border border-slate-100">
            <div className="flex items-center gap-3 px-2 cursor-pointer" onClick={togglePeriodo}>
              <span className={`text-[10px] font-black uppercase transition-colors ${esSemana ? 'text-emerald-600' : 'text-slate-300'}`}>Semana</span>
              <div className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${esMes ? 'bg-slate-900' : 'bg-emerald-500'}`}>
                <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow-sm ${esMes ? 'translate-x-7' : 'translate-x-0'}`} />
              </div>
              <span className={`text-[10px] font-black uppercase transition-colors ${esMes ? 'text-slate-900' : 'text-slate-300'}`}>Mes</span>
            </div>
            <div className="h-8 w-[1px] bg-slate-200 mx-1"></div>
            <select value={filtroCajero} onChange={(e) => setFiltroCajero(e.target.value)} className="text-[10px] font-black p-3 bg-emerald-50 rounded-2xl outline-none uppercase text-emerald-700 appearance-none px-8">
              <option value="todos">PERSONAL</option>
              {listaCajeros.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 pb-10">
          {/* FORMULARIO */}
          <div className="lg:col-span-4 self-start sticky top-4">
            <div className="bg-white p-8 rounded-[3.5rem] shadow-2xl border-b-[12px] border-emerald-600" onKeyDown={(e) => e.key === "Enter" && !confirmando && prepararRegistro()}>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-emerald-600 uppercase mb-3 block tracking-widest ml-1">Cajero de Turno</label>
                  <select value={nuevo.cajero} onChange={(e) => setNuevo({ ...nuevo, cajero: e.target.value })} className="w-full border-2 border-slate-100 bg-slate-50/50 p-4 rounded-2xl text-sm font-black text-slate-900 outline-none uppercase appearance-none focus:border-emerald-500 transition-all">
                    <option value="">SELECCIONAR...</option>
                    {listaCajeros.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-emerald-600 uppercase mb-3 block tracking-widest ml-1">Método de Recibo</label>
                  <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
                    <button onClick={() => setNuevo({...nuevo, tipo: "1"})} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${nuevo.tipo === "1" ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>EFECTIVO</button>
                    <button onClick={() => setNuevo({...nuevo, tipo: "0"})} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${nuevo.tipo === "0" ? 'bg-[#7322e1] text-white shadow-sm' : 'text-slate-400'}`}>YAPE</button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-emerald-600 uppercase mb-3 block tracking-widest ml-1">Monto Excedente</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-5 text-2xl font-black text-emerald-500">S/</span>
                    <input type="number" placeholder="0.00" value={nuevo.dinero} onChange={(e) => setNuevo({ ...nuevo, dinero: e.target.value })} className="w-full border-2 border-slate-100 bg-slate-50/50 p-6 pl-14 rounded-3xl text-center text-5xl font-black text-slate-900 outline-none focus:border-emerald-500 transition-all" />
                  </div>
                </div>
                <button onClick={prepararRegistro} className="w-full bg-emerald-600 text-white font-black py-6 rounded-2xl shadow-xl uppercase text-xs tracking-widest border-b-4 border-emerald-900 active:border-b-0 hover:bg-emerald-700 transition-all">REGISTRAR INGRESO</button>
              </div>
            </div>
          </div>

          {/* TABLA DE REGISTROS CON VALORES DIVIDIDOS */}
          <div className="lg:col-span-8 bg-white rounded-[3.5rem] shadow-xl border border-slate-100 flex flex-col overflow-hidden min-h-[500px]">
            <div className="bg-slate-900 p-7 flex flex-col xl:flex-row justify-between items-center gap-6 border-b border-emerald-500">
              <div>
                 <p className="text-[9px] font-black text-emerald-400 uppercase mb-1">Auditoría de Flujo</p>
                 <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">{esMes ? "REGISTROS DEL MES" : "REGISTROS DE SEMANA"}</h3>
              </div>
              
              <div className="flex flex-wrap justify-center items-center gap-3">
                {/* EFECTIVO */}
                <div className="bg-slate-800/50 border border-slate-700 px-4 py-2 rounded-xl flex flex-col items-center min-w-[90px]">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Efectivo</span>
                  <span className="text-sm font-black text-white font-mono leading-none">S/ {resumenDinero.efectivo.toFixed(2)}</span>
                </div>
                
                {/* YAPE */}
                <div className="bg-[#7322e1]/10 border border-[#7322e1]/30 px-4 py-2 rounded-xl flex flex-col items-center min-w-[90px]">
                  <span className="text-[8px] font-black text-[#a77df3] uppercase tracking-widest mb-0.5">Yape</span>
                  <span className="text-sm font-black text-[#d0bcff] font-mono leading-none">S/ {resumenDinero.yape.toFixed(2)}</span>
                </div>

                {/* TOTAL */}
                <div className="bg-emerald-600 px-5 py-3 rounded-2xl flex flex-col items-center shadow-lg border-b-4 border-emerald-800 min-w-[110px]">
                  <span className="text-[9px] font-black text-emerald-100 uppercase tracking-tighter mb-0.5">Total Acumulado</span>
                  <span className="text-lg font-black text-white font-mono leading-none tracking-tighter">S/ {resumenDinero.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-2">
              <table className="w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
                    <th className="px-6 py-2">Fecha</th>
                    <th className="px-6 py-2">Cajero</th>
                    <th className="px-6 py-2 text-center">Tipo</th>
                    <th className="px-6 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((item) => {
                    const { dia, mes } = formatFechaCorta(item.fecha);
                    return (
                      <tr key={item.id} className="group">
                        <td className="px-6 py-3 bg-slate-50 rounded-l-2xl">
                          <div className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl border border-slate-200 ${item.fecha === hoyStr ? 'bg-emerald-600 border-emerald-600 shadow-md' : 'bg-white'}`}>
                            <span className={`text-sm font-black leading-none ${item.fecha === hoyStr ? 'text-white' : 'text-slate-900'}`}>{dia}</span>
                            <span className={`text-[7px] font-black leading-none mt-0.5 ${item.fecha === hoyStr ? 'text-emerald-100' : 'text-emerald-600'}`}>{mes}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 bg-slate-50">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center font-black text-[10px] uppercase">{item.cajero.charAt(0)}</div>
                            <p className="text-sm font-black text-slate-900 uppercase">{item.cajero}</p>
                          </div>
                        </td>
                        <td className="px-6 py-3 bg-slate-50 text-center">
                          {item.tipo === 0 || item.tipo === "0" ? (
                            <span className="text-[8px] font-black bg-[#7322e1] text-white px-3 py-1 rounded-full uppercase">Yape</span>
                          ) : (
                            <span className="text-[8px] font-black bg-slate-200 text-slate-600 px-3 py-1 rounded-full uppercase">Cash</span>
                          )}
                        </td>
                        <td className="px-6 py-3 bg-slate-50 rounded-r-2xl text-right">
                          <p className="text-xl font-black text-emerald-600 font-mono">S/ {parseFloat(item.dinero).toFixed(2)}</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {registros.length === 0 && !loading && (
                <div className="p-20 text-center text-slate-300 font-black uppercase text-xs tracking-[0.3em]">Sin registros</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}