"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export default function EnvasesPage() {
  const [registros, setRegistros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificacion, setNotificacion] = useState<{ msg: string; tipo: 'success' | 'error' | 'info' } | null>(null);

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
  const [filtroEstado, setFiltroEstado] = useState("todos");

  const esSemanaActual = fechaDesde === dates.lunes && fechaHasta === dates.domingo;
  const esMesActual = fechaDesde === dates.inicioMes && fechaHasta === dates.finMes;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const [nuevo, setNuevo] = useState({
    cliente: "", envase: "", cantidad: "", dinero: "", pago: "Efectivo",
  });

  const registroValido = nuevo.cliente.trim() !== "" && nuevo.envase !== "" && Number(nuevo.cantidad) > 0 && Number(nuevo.dinero) > 0;

  useEffect(() => { fetchEnvases(); }, [fechaDesde, fechaHasta, filtroEstado]);

  const mostrarAviso = (msg: string, tipo: 'success' | 'error' | 'info' = 'success') => {
    setNotificacion({ msg, tipo });
    setTimeout(() => setNotificacion(null), 3000);
  };

  const togglePeriodo = () => {
    if (esSemanaActual) {
      setFechaDesde(dates.inicioMes); setFechaHasta(dates.finMes);
    } else {
      setFechaDesde(dates.lunes); setFechaHasta(dates.domingo);
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

  // CÁLCULO DE DINERO PENDIENTE (Suma de registros con devuelto === 0)
  const dineroFaltante = registros
    .filter(r => r.devuelto === 0)
    .reduce((acc, curr) => acc + parseFloat(curr.dinero), 0);

  const registrosFiltrados = useMemo(() => {
    if (filtroEstado === "pendientes") return registros.filter(r => r.devuelto === 0);
    if (filtroEstado === "devueltos") return registros.filter(r => r.devuelto === 1);
    return registros;
  }, [registros, filtroEstado]);
  
  const formatHora = (fechaStr: string) => {
  const fecha = new Date(fechaStr);
  // Usamos el locale de Perú para asegurar la hora correcta
  return fecha.toLocaleTimeString('es-PE', { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true 
  }).toUpperCase();
};

  async function guardarRegistro() {
  if (!registroValido) return;
  const { error } = await supabase.from("envases").insert([{
    ...nuevo,
    cliente: nuevo.cliente.toUpperCase(),
    // Cambiamos esto para que guarde fecha y hora completa
    fecha: new Date().toISOString(), // Esto guarda: 2024-05-02T14:30:00Z 
    cantidad: parseInt(nuevo.cantidad),
    dinero: parseFloat(nuevo.dinero),
    devuelto: 0 
  }]);
  if (!error) {
    setNuevo({ cliente: "", envase: "", cantidad: "", dinero: "", pago: "Efectivo" });
    fetchEnvases();
    mostrarAviso("Registro guardado con éxito");
  }
}

  async function actualizarRegistro() {
    const { error } = await supabase.from("envases").update({
      cliente: editingItem.cliente.toUpperCase(),
      envase: editingItem.envase,
      cantidad: parseInt(editingItem.cantidad),
      dinero: parseFloat(editingItem.dinero),
      pago: editingItem.pago
    }).eq("id", editingItem.id);
    if (!error) { 
      setIsModalOpen(false); 
      fetchEnvases(); 
      mostrarAviso("Cambios actualizados");
    }
  }

  async function eliminarRegistro(id: number) {
    if (confirm("¿Eliminar definitivamente?")) {
      const { error } = await supabase.from("envases").delete().eq("id", id);
      if (!error) { 
        setIsModalOpen(false); 
        fetchEnvases(); 
        mostrarAviso("Registro eliminado", "info");
      }
    }
  }

  async function cambiarEstadoDevuelto(id: number, nuevoEstado: number) {
    await supabase.from("envases").update({ devuelto: nuevoEstado }).eq("id", id);
    fetchEnvases();
    mostrarAviso(nuevoEstado === 1 ? "Estado: Recibido ✔" : "Estado: Pendiente ⏳");
  }

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

  const pendientes = registros.filter(r => r.devuelto === 0).length;
  const entregados = registros.filter(r => r.devuelto === 1).length;
  const porcentaje = registros.length > 0 ? Math.round((entregados / registros.length) * 100) : 0;
  const dataGrafico = [{ name: "P", value: pendientes }, { name: "D", value: entregados }].filter(d => d.value > 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 min-h-screen font-sans text-slate-900 relative">
      
      {notificacion && (
        <div className={`fixed top-6 right-6 z-[100] px-6 py-3 rounded-2xl shadow-2xl border-2 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
          notificacion.tipo === 'success' ? 'bg-emerald-600 border-emerald-400 text-white' : 
          notificacion.tipo === 'error' ? 'bg-rose-600 border-rose-400 text-white' : 
          'bg-slate-800 border-slate-600 text-white'
        }`}>
          <span className="text-[10px] font-black uppercase tracking-widest">{notificacion.msg}</span>
        </div>
      )}

      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.3em] mb-1">Bodega Payaya</h2>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
            CONTROL<span className="text-blue-600">.ENVASES</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-200">
          <div className="flex gap-4 px-3 border-r border-slate-200">
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase text-slate-400 italic">Desde</span>
              <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="text-xs font-bold bg-transparent outline-none text-slate-700" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase text-slate-400 italic">Hasta</span>
              <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="text-xs font-bold bg-transparent outline-none text-slate-700" />
            </div>
          </div>
          <div className="flex items-center gap-3 px-3 cursor-pointer select-none" onClick={togglePeriodo}>
            <span className={`text-[10px] font-black uppercase transition-colors ${esSemanaActual ? 'text-emerald-600 font-bold' : 'text-slate-300'}`}>Semana</span>
            <div className={`w-12 h-6 rounded-full relative transition-colors ${esMesActual ? 'bg-blue-600' : 'bg-emerald-500'}`}>
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${esMesActual ? 'translate-x-6' : 'translate-x-0'}`} />
            </div>
            <span className={`text-[10px] font-black uppercase transition-colors ${esMesActual ? 'text-blue-600 font-bold' : 'text-slate-300'}`}>Mes</span>
          </div>
        </div>
      </header>

      {/* STATS */}
      {/* STATS ACTUALIZADO CON TARJETA DE GARANTÍA */}
<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
  {/* Tarjeta 1: Cantidad Pendiente */}
  <div className="bg-white p-5 rounded-2xl border-2 border-slate-50 shadow-sm text-center">
    <span className="text-[10px] font-bold text-slate-500 uppercase mb-1 block tracking-widest">Botellas Pend.</span>
    <span className="text-4xl font-black text-rose-600 tracking-tighter">{pendientes}</span>
  </div>

  {/* Tarjeta 2: Cantidad Recuperados */}
  <div className="bg-white p-5 rounded-2xl border-2 border-slate-50 shadow-sm text-center">
    <span className="text-[10px] font-bold text-slate-500 uppercase mb-1 block tracking-widest">Recuperados</span>
    <span className="text-4xl font-black text-emerald-600 tracking-tighter">{entregados}</span>
  </div>

  {/* NUEVA TARJETA 3: DINERO DE GARANTÍA (Solo pendientes) */}
  <div className="bg-amber-50 p-5 rounded-2xl border-2 border-amber-100 shadow-sm text-center">
    <span className="text-[10px] font-bold text-amber-600 uppercase mb-1 block tracking-widest italic">Garantía x Devolver</span>
    <div className="flex flex-col">
      <span className="text-3xl font-black text-amber-700 tracking-tighter font-mono">
        S/ {dineroFaltante.toFixed(2)}
      </span>
      <span className="text-[8px] font-black text-amber-500 uppercase mt-1">Capital en calle</span>
    </div>
  </div>

  {/* Tarjeta 4: Eficiencia (Ahora ocupa 2 columnas en PC) */}
  <div className="bg-slate-900 p-5 rounded-2xl flex items-center justify-between col-span-2 text-white">
    <div>
       <span className="text-[10px] font-bold opacity-70 uppercase block tracking-widest">Eficiencia</span>
       <span className="text-4xl font-black tracking-tighter">{porcentaje}%</span>
    </div>
    <div className="w-16 h-16">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={dataGrafico} innerRadius={20} outerRadius={30} dataKey="value" stroke="none">
            <Cell fill="#fb7185" /><Cell fill="#34d399" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  </div>
</div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* FORM */}
        <div className="lg:col-span-4 bg-slate-50 p-6 rounded-3xl border border-slate-200">
          <h2 className="text-[10px] font-black text-slate-900 uppercase mb-4 tracking-widest italic border-b border-slate-200 pb-2">Nueva Salida</h2>
          <div className="space-y-3">
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Cliente</label>
              <input placeholder="NOMBRE..." value={nuevo.cliente} onChange={(e) => setNuevo({ ...nuevo, cliente: e.target.value })} className="w-full bg-white p-3 rounded-xl text-sm font-bold border border-slate-200 outline-none uppercase focus:border-blue-500" />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Producto</label>
              <select value={nuevo.envase} onChange={(e) => setNuevo({ ...nuevo, envase: e.target.value })} className="w-full bg-white p-3 rounded-xl text-sm font-bold border border-slate-200 outline-none">
                <option value="">SELECCIONAR...</option>
                <option value="Coca Cola 296ml">Coca Cola 296ml</option>
                <option value="Pirañita">Pirañita</option>
                <option value="Inca Kola 1L">Inca Kola 1L</option>
                <option value="Coca Cola 1L">Coca Cola 1L</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Cant.</label>
                <input type="number" placeholder="0" value={nuevo.cantidad} onChange={(e) => setNuevo({ ...nuevo, cantidad: e.target.value })} className="w-full bg-white p-3 rounded-xl text-sm font-bold border border-slate-200 outline-none" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Monto S/</label>
                <input type="number" placeholder="0.00" value={nuevo.dinero} onChange={(e) => setNuevo({ ...nuevo, dinero: e.target.value })} className="w-full bg-white p-3 rounded-xl text-sm font-bold border border-slate-200 outline-none font-mono" />
              </div>
            </div>
            <button 
              onClick={guardarRegistro} 
              disabled={!registroValido}
              className={`w-full font-black py-4 mt-2 rounded-xl uppercase text-xs tracking-widest transition-all ${registroValido ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
              Registrar Salida
            </button>
          </div>
        </div>

        {/* TABLA CON INDICADOR DE DINERO FALTANTE */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl overflow-hidden flex flex-col h-[600px] shadow-sm">
          <div className="bg-slate-900 p-4 px-6 flex justify-between items-center flex-wrap gap-4">
            <h3 className="text-white font-black uppercase italic tracking-widest text-xs">
               Historial de Movimientos
            </h3>
            
            <div className="flex items-center gap-4">
              {/* TOTAL DINERO FALTANTE */}
              <div className="flex flex-col items-end">
                <span className="text-[8px] font-black text-amber-500 uppercase tracking-tighter leading-none">Total por Devolver</span>
                <span className="text-sm font-black text-white font-mono tracking-tighter">S/ {dineroFaltante.toFixed(2)}</span>
              </div>

              <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="bg-white/10 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg border border-white/20 uppercase outline-none">
                  <option className="text-slate-900" value="todos">Todos</option>
                  <option className="text-slate-900" value="pendientes">Pendientes</option>
                  <option className="text-slate-900" value="devueltos">Recibidos</option>
              </select>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10 text-left">
                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-4 py-4">Cliente / Envase</th>
                  <th className="px-4 py-4 text-center">Cant.</th>
                  <th className="px-4 py-4 text-right">Monto</th>
                  <th className="px-6 py-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registrosFiltrados.map((item) => {
                  const { dia, mes } = formatFechaCorta(item.fecha);
                  return (
                    <tr key={item.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="px-6 py-6">
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
                      
                      <td className="px-4 py-4">
                        <div className="font-black text-slate-900 uppercase text-sm tracking-tight">{item.cliente}</div>
                        <div className="text-[11px] font-bold text-slate-500 uppercase italic">{item.envase}</div>
                      </td>
                      <td className="px-4 py-4 text-center font-black text-blue-700 text-xl">{item.cantidad}</td>
                      <td className="px-4 py-4 text-right">
                        <div className="font-black text-slate-900 font-mono text-sm tracking-tighter">S/ {parseFloat(item.dinero).toFixed(2)}</div>
                        <div className={`text-[10px] font-black uppercase ${item.pago === 'Yape' ? 'text-purple-600' : 'text-orange-600'}`}>{item.pago}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 justify-center">
                          <button 
                            onClick={() => cambiarEstadoDevuelto(item.id, item.devuelto === 0 ? 1 : 0)} 
                            className={`text-[10px] font-black px-4 py-2 rounded-xl border-2 transition-all ${item.devuelto === 0 ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}
                          >
                            {item.devuelto === 0 ? 'PENDIENTE' : 'RECIBIDO'}
                          </button>
                          <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL EDITOR */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 border-t-[10px] border-blue-600 shadow-2xl">
            <h2 className="text-sm font-black text-slate-900 mb-6 uppercase text-center tracking-widest italic">Editar Movimiento</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-1 tracking-widest">Nombre del Cliente</label>
                <input value={editingItem.cliente} onChange={(e) => setEditingItem({ ...editingItem, cliente: e.target.value.toUpperCase() })} className="w-full bg-slate-50 p-4 rounded-xl font-bold uppercase text-xs border border-slate-200 outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-1 tracking-widest">Tipo de Envase</label>
                <select value={editingItem.envase} onChange={(e) => setEditingItem({ ...editingItem, envase: e.target.value })} className="w-full bg-slate-50 p-4 rounded-xl font-bold text-xs border border-slate-200 outline-none focus:border-blue-500">
                  <option value="Coca Cola 296ml">Coca Cola 296ml</option>
                  <option value="Pirañita">Pirañita</option>
                  <option value="Inca Kola 1L">Inca Kola 1L</option>
                  <option value="Coca Cola 1L">Coca Cola 1L</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-1 tracking-widest">Cantidad</label>
                  <input type="number" value={editingItem.cantidad} onChange={(e) => setEditingItem({ ...editingItem, cantidad: e.target.value })} className="w-full bg-slate-50 p-4 rounded-xl font-bold text-xs border border-slate-200 outline-none text-center" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-1 tracking-widest">Monto (S/)</label>
                  <input type="number" value={editingItem.dinero} onChange={(e) => setEditingItem({ ...editingItem, dinero: e.target.value })} className="w-full bg-slate-50 p-4 rounded-xl font-bold text-xs border border-slate-200 outline-none text-right font-mono" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-1 tracking-widest">Método de Pago</label>
                <select value={editingItem.pago} onChange={(e) => setEditingItem({ ...editingItem, pago: e.target.value })} className="w-full bg-slate-50 p-4 rounded-xl font-bold text-xs border border-slate-200 outline-none focus:border-blue-500">
                  <option value="Efectivo">EFECTIVO</option>
                  <option value="Yape">YAPE</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 text-slate-500 font-black py-4 rounded-xl text-[10px] uppercase">Cancelar</button>
                <button onClick={actualizarRegistro} className="flex-1 bg-blue-600 text-white font-black py-4 rounded-xl text-[10px] uppercase shadow-lg shadow-blue-200">Actualizar</button>
              </div>
              <button onClick={() => eliminarRegistro(editingItem.id)} className="w-full text-rose-500 text-[9px] font-black uppercase mt-4 hover:underline tracking-widest text-center">Eliminar permanentemente ✘</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}