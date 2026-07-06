"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from "recharts";

export default function DashboardAdminElite() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [alertasVivas, setAlertasVivas] = useState<any[]>([]);
  const [data, setData] = useState({
    faltantes: [] as any[],
    envases: [] as any[],
    sobrantes: [] as any[],
  });

  const dates = useMemo(() => {
    const hoy = new Date();
    const diaSemana = hoy.getDay();
    const difLunes = hoy.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1);
    
    const lunesDate = new Date(hoy.setDate(difLunes));
    const domingoDate = new Date(lunesDate);
    domingoDate.setDate(lunesDate.getDate() + 6);

    return {
      lunes: lunesDate.toISOString().split('T')[0],
      domingo: domingoDate.toISOString().split('T')[0],
      inicioMes: new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0],
      finMes: new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0]
    };
  }, []);

  const [fechaDesde, setFechaDesde] = useState(dates.lunes);
  const [fechaHasta, setFechaHasta] = useState(dates.domingo);
  
  const esMes = fechaDesde === dates.inicioMes;

  const fetchAlertas = async () => {
    const { data: faltas } = await supabase.from("productos_abastecimiento").select("*").eq("esta_falta", true);
    setAlertasVivas(faltas || []);
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [falt, env, sob] = await Promise.all([
        supabase.from("prod_faltantes").select("*").gte("fecha", fechaDesde).lte("fecha", fechaHasta),
        supabase.from("envases").select("*").gte("fecha", fechaDesde).lte("fecha", fechaHasta),
        supabase.from("dine_sobrante").select("*").gte("fecha", fechaDesde).lte("fecha", fechaHasta)
      ]);
      setData({ faltantes: falt.data || [], envases: env.data || [], sobrantes: sob.data || [] });
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
    fetchAlertas();
    const channel = supabase.channel('db_cambios').on('postgres_changes', { event: '*', schema: 'public', table: 'productos_abastecimiento' }, () => {
      fetchAlertas();
      fetchAllData();
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fechaDesde, fechaHasta]);

  const totalPerdida = data.faltantes.reduce((acc, curr) => acc + (Number(curr.cantidad || 0) * Number(curr.precio || 0)), 0);
  const totalSobrante = data.sobrantes.reduce((acc, curr) => acc + Number(curr.dinero || 0), 0);
  const balanceNeto = totalSobrante - totalPerdida;
  const envasesPendientes = data.envases.filter((e: any) => e.devuelto === 0).length;
  const yapeTotal = data.envases.filter((e: any) => e.pago === "Yape").reduce((acc, curr) => acc + Number(curr.dinero || 0), 0);
  const efecTotal = data.envases.filter((e: any) => e.pago === "Efectivo").reduce((acc, curr) => acc + Number(curr.dinero || 0), 0);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-slate-900 bg-slate-100 animate-pulse uppercase tracking-[0.5em]">SISTEMA EN LINEA...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-10 p-6 min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      
      {/* HEADER PRINCIPAL */}
      <header className="relative overflow-hidden bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-indigo-500 w-3 h-3 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400">Panel de Control General</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter italic uppercase leading-none">CORE<span className="text-indigo-500">.DATA</span></h1>
            <p className="text-xs font-bold opacity-50 mt-4 uppercase tracking-widest">
              Mostrando: <span className="text-indigo-400">{esMes ? "Todo el Mes" : "Semana Completa"}</span> ({fechaDesde} al {fechaHasta})
            </p>
          </div>
          <div className="flex flex-wrap gap-4 justify-center">
            <button 
              onClick={() => { 
                if (esMes) {
                  setFechaDesde(dates.lunes); 
                  setFechaHasta(dates.domingo);
                } else {
                  setFechaDesde(dates.inicioMes); 
                  setFechaHasta(dates.finMes);
                }
              }}
              className="bg-white/10 backdrop-blur-md border border-white/20 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all"
            >
              {esMes ? "Ver Semana Actual (Lun-Dom)" : "Ver Mes Completo"}
            </button>
            
            {/* CORREGIDO: Redirección directa a la carpeta de Proveedores */}
            <button 
              onClick={() => router.push('/dashboard/proveedores')} 
              className="bg-indigo-600 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-105 transition-all text-center text-white"
            >
              Ver Proveedores 🚚
            </button>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-[100px] -mr-32 -mt-32"></div>
      </header>

      {/* KPIs PRINCIPALES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`relative overflow-hidden p-10 rounded-[3.5rem] text-white shadow-2xl transition-all ${balanceNeto >= 0 ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-rose-500 shadow-rose-500/20'}`}>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Balance Neto del Periodo</span>
          <div className="text-6xl font-black my-4 tracking-tighter italic">S/ {balanceNeto.toFixed(2)}</div>
          <div className="text-[9px] font-bold uppercase leading-relaxed bg-black/10 p-4 rounded-2xl border border-white/10">
            Dinero real disponible en caja después de descontar el valor de los productos perdidos (fugas).
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-200 relative overflow-hidden group">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Pérdida por Inventario</span>
          <div className="text-6xl font-black my-4 tracking-tighter italic text-rose-600">S/ {totalPerdida.toFixed(2)}</div>
          <div className="text-[9px] font-bold uppercase leading-relaxed text-slate-400 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            Suma total del valor de los productos que el personal reportó como faltantes.
          </div>
          <div className="absolute bottom-0 right-0 text-9xl font-black text-slate-50 -mb-10 -mr-5 opacity-50 pointer-events-none group-hover:text-rose-50 transition-colors">!</div>
        </div>

        <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-200">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Envases por Recuperar</span>
          <div className="text-6xl font-black my-4 tracking-tighter italic text-blue-600">{envasesPendientes}</div>
          <div className="text-[9px] font-bold uppercase leading-relaxed text-slate-400 bg-blue-50 p-4 rounded-2xl border border-blue-100">
            Cantidad de botellas/envases que salieron de la bodega y aún no han sido devueltos por clientes.
          </div>
        </div>
      </div>

      {/* ANÁLISIS GRÁFICO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-200">
          <h3 className="text-xs font-black uppercase mb-10 tracking-[0.2em] border-b pb-4 inline-block">Caja: Yape vs Efectivo</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ name: 'YAPE', total: yapeTotal }, { name: 'EFECTIVO', total: efecTotal }]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '1.5rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="total" radius={[15, 15, 15, 15]} barSize={80}>
                  <Cell fill="#7c3aed" />
                  <Cell fill="#059669" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="p-4 bg-indigo-50 rounded-2xl text-center">
              <p className="text-[9px] font-black uppercase text-indigo-400 mb-1">Total Yape</p>
              <p className="text-xl font-black text-slate-900 font-mono">S/ {yapeTotal.toFixed(2)}</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl text-center">
              <p className="text-[9px] font-black uppercase text-emerald-400 mb-1">Total Efectivo</p>
              <p className="text-xl font-black text-slate-900 font-mono">S/ {efecTotal.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-200">
          <div className="flex justify-between items-center mb-10 border-b pb-4">
            <h3 className="text-xs font-black uppercase tracking-[0.2em]">Ranking Crítico: Top Fugas</h3>
            <span className="text-[9px] font-black text-rose-500 uppercase px-3 py-1 bg-rose-50 rounded-full">Alerta de Pérdida</span>
          </div>
          <div className="space-y-4">
            {data.faltantes.length > 0 ? [...data.faltantes]
              .sort((a, b) => (b.cantidad * b.precio) - (a.cantidad * a.precio))
              .slice(0, 5)
              .map((f, i) => (
                <div key={i} className="flex justify-between items-center p-5 bg-slate-50 rounded-[2rem] border border-slate-100 hover:border-rose-200 transition-colors group">
                  <div className="flex items-center gap-4">
                    <span className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-lg shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">📉</span>
                    <div>
                      <p className="text-xs font-black uppercase text-slate-900 leading-none">{f.producto}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">{f.cantidad} UNIDADES PERDIDAS</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-rose-600 font-mono">- S/ {(f.cantidad * f.precio).toFixed(2)}</p>
                    <p className="text-[8px] font-black text-slate-300 uppercase italic">Merma Directa</p>
                  </div>
                </div>
              )) : (
              <div className="h-full flex flex-col items-center justify-center py-20 text-slate-300">
                <span className="text-4xl mb-4 opacity-30">🛡️</span>
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Inventario sin discrepancias</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}