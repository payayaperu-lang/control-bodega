"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, AreaChart, Area, Legend
} from "recharts";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    faltantes: [] as any[],
    envases: [] as any[],
    sobrantes: [] as any[],
  });

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
  const esMes = fechaDesde === dates.inicioMes;

  useEffect(() => { fetchAllData(); }, [fechaDesde, fechaHasta]);

  async function fetchAllData() {
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
  }

  // --- LÓGICA DE NEGOCIO ---
  const totalPerdida = data.faltantes.reduce((acc, curr) => acc + (Number(curr.cantidad || 0) * Number(curr.precio || 0)), 0);
  const totalSobrante = data.sobrantes.reduce((acc, curr) => acc + Number(curr.dinero || 0), 0);
  const balanceNeto = totalSobrante - totalPerdida;
  
  const envasesPendientes = data.envases.filter(e => e.devuelto === 0).length;
  
  const yapeTotal = data.envases.filter(e => e.pago === "Yape").reduce((acc, curr) => acc + Number(curr.dinero || 0), 0);
  const efecTotal = data.envases.filter(e => e.pago === "Efectivo").reduce((acc, curr) => acc + Number(curr.dinero || 0), 0);

  // Ranking Top 5 Fugas
  const topFugas = [...data.faltantes]
    .sort((a, b) => (b.cantidad * b.precio) - (a.cantidad * a.precio))
    .slice(0, 5);

  const togglePeriodo = () => {
    if (!esMes) { setFechaDesde(dates.inicioMes); setFechaHasta(dates.finMes); }
    else { setFechaDesde(dates.lunes); setFechaHasta(dates.domingo); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando Dashboard...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-6 min-h-screen bg-slate-100 font-sans text-slate-900">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter italic uppercase">DASHBOARD<span className="text-blue-600">.PRO</span></h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Viendo datos del: {fechaDesde} al {fechaHasta}</p>
        </div>
        <button onClick={togglePeriodo} className="bg-white px-6 py-3 rounded-2xl shadow-md font-black text-[10px] uppercase border border-slate-200 hover:bg-slate-50 transition-all">
          Cambiar a: {esMes ? "Semana Actual" : "Mes Actual"}
        </button>
      </header>

      {/* TARJETAS EXPLICATIVAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-8 rounded-[3rem] shadow-2xl border-b-[10px] text-white ${balanceNeto >= 0 ? 'bg-emerald-500 border-emerald-700' : 'bg-rose-500 border-rose-700'}`}>
          <span className="text-[10px] font-black uppercase opacity-60 block mb-1 tracking-widest">Balance Neto</span>
          <div className="text-5xl font-black mb-2">S/ {balanceNeto.toFixed(2)}</div>
          <p className="text-[9px] font-medium leading-tight opacity-80 uppercase italic">Es el dinero que realmente te queda libre restando los productos perdidos (faltantes).</p>
        </div>

        <div className="bg-white p-8 rounded-[3rem] shadow-xl border-b-[10px] border-slate-900">
          <span className="text-[10px] font-black text-slate-400 uppercase block mb-1 tracking-widest italic">Pérdida de Inventario</span>
          <div className="text-5xl font-black text-rose-500 mb-2">S/ {totalPerdida.toFixed(2)}</div>
          <p className="text-[9px] font-medium leading-tight text-slate-400 uppercase italic">Dinero estancado o perdido en productos que faltaron en el conteo.</p>
        </div>

        <div className="bg-white p-8 rounded-[3rem] shadow-xl border-b-[10px] border-blue-600">
          <span className="text-[10px] font-black text-slate-400 uppercase block mb-1 tracking-widest italic">Envases x Recuperar</span>
          <div className="text-5xl font-black text-blue-600 mb-2">{envasesPendientes}</div>
          <p className="text-[9px] font-medium leading-tight text-slate-400 uppercase italic">Botellas o envases que clientes aún no devuelven. Representa stock fuera.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* GRÁFICO DE YAPE VS EFECTIVO (CORREGIDO) */}
        <div className="lg:col-span-4 bg-white p-8 rounded-[3rem] shadow-xl border border-slate-200">
          <h3 className="text-xs font-black uppercase mb-6 tracking-widest italic border-b pb-4 text-purple-600">Caja por Método de Pago</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Yape', total: yapeTotal },
                { name: 'Efectivo', total: efecTotal }
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '1rem', border: 'none'}} />
                <Bar dataKey="total" radius={[8, 8, 8, 8]} barSize={50}>
                  <Cell fill="#7c3aed" /> {/* Color Yape */}
                  <Cell fill="#10b981" /> {/* Color Efectivo */}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex justify-between text-[10px] font-black uppercase italic">
            <span className="text-purple-600">Yape: S/ {yapeTotal.toFixed(2)}</span>
            <span className="text-emerald-600">Efectivo: S/ {efecTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* TOP 5 FUGAS */}
        <div className="lg:col-span-8 bg-white p-8 rounded-[3rem] shadow-xl border border-slate-200">
          <h3 className="text-xs font-black uppercase mb-6 tracking-widest italic border-b pb-4 text-rose-500">Ranking: Top 5 Productos en Fuga</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                  <th className="pb-4">Producto</th>
                  <th className="pb-4">Cantidad</th>
                  <th className="pb-4">Precio Unit.</th>
                  <th className="pb-4 text-right">Pérdida Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {topFugas.map((f, i) => (
                  <tr key={i} className="group hover:bg-slate-50 transition-colors">
                    <td className="py-4 text-xs font-black uppercase text-slate-700">{f.producto}</td>
                    <td className="py-4 text-xs font-bold text-slate-500">{f.cantidad} uds</td>
                    <td className="py-4 text-right text-xs font-black text-rose-500 font-mono">-S/ {(f.cantidad * f.precio).toFixed(2)}</td>
                  </tr>
                ))}
                {topFugas.length === 0 && (
                  <tr><td colSpan={4} className="py-8 text-center text-[10px] font-black uppercase text-slate-300 italic">No hay fugas registradas en este periodo</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* TABLA DE ÚLTIMOS MOVIMIENTOS GENERALES */}
      <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xs font-black uppercase tracking-widest italic text-blue-400 underline decoration-blue-500 underline-offset-8">Historial Crítico Reciente</h3>
          <span className="text-[9px] font-bold opacity-40 uppercase">Viendo últimos registros de la semana</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase opacity-40 tracking-[0.2em] mb-4">Últimos Envases</h4>
            {data.envases.slice(-3).reverse().map((e, i) => (
              <div key={i} className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border-l-4 border-orange-500">
                <div>
                  <div className="text-[11px] font-black uppercase">{e.cliente || 'S/N'}</div>
                  <div className="text-[9px] font-bold opacity-50 uppercase italic">{e.pago}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-orange-500 font-mono">S/ {Number(e.dinero || 0).toFixed(2)}</div>
                  <div className="text-[8px] font-black opacity-30">{e.fecha}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase opacity-40 tracking-[0.2em] mb-4">Últimos Faltantes</h4>
            {data.faltantes.slice(-3).reverse().map((f, i) => (
              <div key={i} className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border-l-4 border-rose-500">
                <div>
                  <div className="text-[11px] font-black uppercase">{f.producto}</div>
                  <div className="text-[9px] font-bold opacity-50 uppercase italic">{f.cantidad} unidades</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-rose-500 font-mono">-S/ {(f.cantidad * f.precio).toFixed(2)}</div>
                  <div className="text-[8px] font-black opacity-30">{f.fecha}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}