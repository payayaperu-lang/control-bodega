"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

interface Proveedor {
  id: number;
  nombre: string;
  dia_pedido: string;
  dia_entrega: string;
  color: string;
}

export default function GestionProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [notificacion, setNotificacion] = useState<{ msg: string; tipo: "error" | "exito" } | null>(null);
  const [ultimoId, setUltimoId] = useState<number | null>(null);

  // Estados Formulario
  const [nombre, setNombre] = useState("");
  const [diaPedido, setDiaPedido] = useState("");
  const [diaEntrega, setDiaEntrega] = useState("");
  const [colorSel, setColorSel] = useState("bg-indigo-600");

  // Estados Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState<Proveedor | null>(null);

  const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  
  // PALETA AMPLIADA A 10 COLORES
  const colores = [
    { name: "Indigo", class: "bg-indigo-600" },
    { name: "Ambar", class: "bg-amber-500" },
    { name: "Rojo", class: "bg-rose-600" },
    { name: "Esmeralda", class: "bg-emerald-600" },
    { name: "Azul", class: "bg-blue-600" },
    { name: "Violeta", class: "bg-violet-600" },
    { name: "Fucsia", class: "bg-fuchsia-600" },
    { name: "Naranja", class: "bg-orange-500" },
    { name: "Cian", class: "bg-cyan-500" },
    { name: "Lima", class: "bg-lime-500" },
  ];

  const mostrarToast = (msg: string, tipo: "error" | "exito") => {
    setNotificacion({ msg, tipo });
    setTimeout(() => setNotificacion(null), 3000);
  };

  const fetchProveedores = async () => {
    try {
      const { data, error } = await supabase.from("proveedores").select("*").order("nombre", { ascending: true });
      if (error) throw error;
      setProveedores(data || []);
    } catch (e: any) {
      console.error(e.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { fetchProveedores(); }, []);

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !diaPedido || !diaEntrega) {
      mostrarToast("Completa todos los campos", "error");
      return;
    }

    try {
      const { data, error } = await supabase.from("proveedores").insert([
        { nombre: nombre.toUpperCase().trim(), dia_pedido: diaPedido, dia_entrega: diaEntrega, color: colorSel }
      ]).select();
      
      if (error) throw error;

      if (data && data[0]) {
        setUltimoId(data[0].id);
        // DURACIÓN EXTENDIDA A 5 SEGUNDOS
        setTimeout(() => setUltimoId(null), 5000); 
      }

      setNombre(""); setDiaPedido(""); setDiaEntrega("");
      fetchProveedores();
      mostrarToast("Proveedor registrado con éxito", "exito");
    } catch (e: any) {
      mostrarToast(e.message, "error");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editData) return;
    try {
      const { error } = await supabase.from("proveedores")
        .update({ nombre: editData.nombre.toUpperCase().trim(), dia_pedido: editData.dia_pedido, dia_entrega: editData.dia_entrega, color: editData.color })
        .eq("id", editData.id);
      if (error) throw error;
      setIsModalOpen(false);
      fetchProveedores();
      mostrarToast("Cambios guardados", "exito");
    } catch (e: any) {
      mostrarToast(e.message, "error");
    }
  };

  const handleEliminar = async (id: number) => {
    if (!confirm("¿ELIMINAR REGISTRO DEFINITIVAMENTE?")) return;
    try {
      const { error } = await supabase.from("proveedores").delete().eq("id", id);
      if (error) throw error;
      fetchProveedores();
      mostrarToast("Registro eliminado", "exito");
    } catch (e: any) {
      mostrarToast(e.message, "error");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 relative">
      
      {/* TOAST CUSTOM */}
      {notificacion && (
        <div className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border animate-in slide-in-from-right duration-300 ${
          notificacion.tipo === "exito" ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-rose-50 border-rose-200 text-rose-900"
        }`}>
          <span className="text-xl">{notificacion.tipo === "exito" ? "✅" : "❌"}</span>
          <p className="text-xs font-black uppercase tracking-tight">{notificacion.msg}</p>
        </div>
      )}

      {/* HEADER */}
      <div className="border-b-4 border-slate-900 pb-6">
        <h2 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic">
          Configuración <span className="text-blue-600">Logística</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* FORMULARIO */}
        <form onSubmit={handleGuardar} className="lg:col-span-4 bg-white p-10 rounded-[3.5rem] shadow-2xl border-2 border-slate-100">
          <h3 className="text-xl font-black text-slate-900 uppercase mb-8 italic">Nuevo Proveedor</h3>
          <div className="space-y-6">
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-6 py-5 bg-slate-100 rounded-3xl text-sm font-bold text-slate-900 outline-none border-2 border-transparent focus:border-indigo-600 transition-all"
              placeholder="NOMBRE DEL PROVEEDOR"
            />
            <div className="grid grid-cols-1 gap-4">
              <select value={diaPedido} onChange={(e) => setDiaPedido(e.target.value)} className="w-full px-6 py-5 bg-slate-100 rounded-3xl text-sm font-bold text-slate-900 outline-none">
                <option value="">DÍA DE NOTA</option>
                {diasSemana.map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}
              </select>
              <select value={diaEntrega} onChange={(e) => setDiaEntrega(e.target.value)} className="w-full px-6 py-5 bg-slate-100 rounded-3xl text-sm font-bold text-slate-900 outline-none">
                <option value="">DÍA DE ENTREGA</option>
                {diasSemana.map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}
              </select>
            </div>
            
            {/* SELECTOR DE COLOR AMPLIADO (GRID 5x2) */}
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-slate-400 uppercase ml-4">Escoge un color distintivo</label>
              <div className="grid grid-cols-5 gap-3 px-2">
                {colores.map(c => (
                  <button 
                    key={c.name} 
                    type="button" 
                    onClick={() => setColorSel(c.class)} 
                    className={`w-full aspect-square rounded-xl ${c.class} transition-all duration-300 ${colorSel === c.class ? "scale-110 ring-4 ring-slate-100 shadow-lg" : "opacity-40 hover:opacity-100"}`} 
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            <button type="submit" className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl active:scale-95">
              Registrar en Sistema
            </button>
          </div>
        </form>

        {/* TABLA CON RESALTADO EXTENDIDO */}
        <div className="lg:col-span-8 bg-white rounded-[4rem] shadow-xl border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-8 text-[11px] font-black uppercase tracking-widest">Proveedor</th>
                <th className="p-8 text-[11px] font-black uppercase tracking-widest text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-50">
              {proveedores.map((p) => (
                <tr 
                  key={p.id} 
                  className={`transition-all duration-[1500ms] ${ultimoId === p.id ? 'bg-indigo-50 border-y-2 border-indigo-200' : 'hover:bg-slate-50'}`}
                >
                  <td className="p-8">
                    <div className="flex items-center gap-4">
                      <div className={`w-4 h-12 rounded-full ${p.color} shadow-sm`}></div>
                      <div>
                        <p className={`font-black text-lg uppercase italic transition-colors duration-1000 ${ultimoId === p.id ? 'text-indigo-600' : 'text-slate-900'}`}>
                          {p.nombre}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{p.dia_pedido} → {p.dia_entrega}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-8">
                    <div className="flex justify-center gap-3">
                      <button onClick={() => { setEditData(p); setIsModalOpen(true); }} className="p-4 bg-slate-100 text-slate-900 rounded-2xl font-black text-xs uppercase hover:bg-indigo-600 hover:text-white transition-all">Editar</button>
                      <button onClick={() => handleEliminar(p.id)} className="p-4 bg-slate-100 text-rose-600 rounded-2xl font-black text-xs uppercase hover:bg-rose-600 hover:text-white transition-all">Eliminar Registro</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EDICION CON SELECTOR AMPLIADO */}
      {isModalOpen && editData && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <form onSubmit={handleUpdate} className="bg-white w-full max-w-lg rounded-[3.5rem] p-10 shadow-2xl">
            <h3 className="text-3xl font-black text-slate-900 uppercase italic mb-8">Editar Registro</h3>
            <div className="space-y-6">
              <input type="text" value={editData.nombre} onChange={(e) => setEditData({ ...editData, nombre: e.target.value })} className="w-full px-6 py-4 bg-slate-100 rounded-3xl text-sm font-bold text-slate-900 outline-none border-2 border-transparent focus:border-indigo-600" />
              <div className="grid grid-cols-2 gap-4">
                <select value={editData.dia_pedido} onChange={(e) => setEditData({ ...editData, dia_pedido: e.target.value })} className="w-full px-4 py-4 bg-slate-100 rounded-2xl text-xs font-bold text-slate-900 outline-none">
                  {diasSemana.map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}
                </select>
                <select value={editData.dia_entrega} onChange={(e) => setEditData({ ...editData, dia_entrega: e.target.value })} className="w-full px-4 py-4 bg-slate-100 rounded-2xl text-xs font-bold text-slate-900 outline-none">
                  {diasSemana.map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}
                </select>
              </div>
              
              {/* Color en Modal */}
              <div className="grid grid-cols-5 gap-2">
                {colores.map(c => (
                  <button key={c.name} type="button" onClick={() => setEditData({...editData, color: c.class})} className={`h-8 rounded-lg ${c.class} ${editData.color === c.class ? 'ring-2 ring-offset-2 ring-slate-400' : 'opacity-50'}`} />
                ))}
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-[10px] uppercase">Cancelar</button>
                <button type="submit" className="flex-1 py-5 bg-indigo-600 text-white rounded-3xl font-black text-[10px] uppercase shadow-lg shadow-indigo-200">Guardar Cambios</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}