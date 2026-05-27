"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  icono: string;
  esta_falta: boolean;
  ultima_actualizacion?: string;
}

export default function PanelAdminConMonitoreo() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  
  // Estados del Formulario
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("");
  const [icono, setIcono] = useState("📦");
  const [mostrarEmojiPicker, setMostrarEmojiPicker] = useState(false);

  // Catálogo de iconos sugeridos
  const catalogoIconos = {
    "Bebidas": ["🥫", "🍺", "🍻", "🥤", "🧃", "🍷", "🍹", "🍾", "🧊", "☕"],
    "Snacks": ["🍟", "🍿", "🥨", "🥜", "🧀", "🍪"],
    "Dulces": ["🍬", "🍭", "🍫", "🍩", "🍦", "🧁"],
    "Varios": ["🚬", "🔋", "🧻", "🧼", "🧴", "📦", "🛍️"]
  };

  const cargarDatos = async () => {
    const { data } = await supabase
      .from("productos_abastecimiento")
      .select("*")
      .order("categoria", { ascending: true });
    setProductos(data || []);
    setCargando(false);
  };

  // Suscripción a cambios en tiempo real desde Supabase para ver las alertas de los trabajadores
  useEffect(() => {
    cargarDatos();

    const canalUrgencias = supabase
      .channel("cambios-inventario-admin")
      .on(
        "postgres_changes",
        { event: "*", scheme: "public", table: "productos_abastecimiento" },
        () => {
          cargarDatos(); // Recargar datos si un trabajador cambia un estado
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalUrgencias);
    };
  }, []);

  const categoriasExistentes = Array.from(new Set(productos.map(p => p.categoria)));
  const productosFaltantes = productos.filter(p => p.esta_falta);

  const guardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    const datos = { 
      nombre: nombre.toUpperCase().trim(), 
      categoria: categoria.toUpperCase().trim(), 
      icono 
    };

    if (editandoId) {
      const { error } = await supabase.from("productos_abastecimiento").update(datos).eq("id", editandoId);
      if (error) console.error(error);
    } else {
      const { error } = await supabase.from("productos_abastecimiento").insert([datos]);
      if (error) console.error(error);
    }

    resetForm();
    cargarDatos();
  };

  const prepararEdicion = (p: Producto) => {
    setEditandoId(p.id);
    setNombre(p.nombre);
    setCategoria(p.categoria);
    setIcono(p.icono);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditandoId(null);
    setNombre("");
    setCategoria("");
    setIcono("📦");
    setMostrarEmojiPicker(false);
  };

  if (cargando) return <div className="p-20 text-center font-black text-slate-900 animate-pulse tracking-widest">SINCRO DE CONTROL...</div>;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* HEADER PRINCIPAL */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-8 rounded-[2.5rem] shadow-md border-b-4 border-indigo-600 gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
              Panel de <span className="text-indigo-600">Control Central</span>
            </h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Administración del catálogo y monitoreo en vivo</p>
          </div>
          <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest">
            Catálogo: {productos.length} Items
          </div>
        </header>

        {/* 🚨 EMBED DE MONITOREO EN TIEMPO REAL (URGENCIAS NOTIFICADAS) */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-rose-500/20">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-rose-500 animate-ping text-xs">🔴</span>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">
                Monitor en Vivo: Quiebres de Stock en Tienda
              </h3>
            </div>
            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${
              productosFaltantes.length > 0 ? "bg-rose-600 text-white animate-pulse" : "bg-emerald-505 bg-emerald-500 text-white"
            }`}>
              {productosFaltantes.length > 0 ? `${productosFaltantes.length} Por Reponer` : "Tienda OK"}
            </span>
          </div>

          {productosFaltantes.length === 0 ? (
            <div className="py-6 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
              ✅ Los trabajadores no han reportado faltas en este momento.
            </div>
          ) : (
            <div className="flex flex-wrap gap-3 max-h-32 overflow-y-auto p-1">
              {productosFaltantes.map(p => (
                <div 
                  key={p.id} 
                  className="bg-rose-50 border border-rose-200 px-4 py-2 rounded-2xl flex items-center gap-2 text-rose-700 font-black text-xs uppercase tracking-tight shadow-sm"
                >
                  <span>{p.icono}</span>
                  <span>{p.nombre}</span>
                  <span className="text-[8px] bg-rose-600 text-white px-2 py-0.5 rounded-md">FALTA</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CUERPO DEL PANEL: FORMULARIO Y TABLA DE PRODUCTOS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* COLUMNA IZQUIERDA: FORMULARIO DE EDICIÓN / REGISTRO */}
          <div className="lg:col-span-5">
            <form onSubmit={guardarProducto} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-200 sticky top-8">
              <h3 className="text-xs font-black uppercase tracking-widest mb-6 text-indigo-500">
                {editandoId ? "🔧 Modificar Producto" : "📝 Registrar Nuevo Producto"}
              </h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-900 uppercase mb-2">Nombre Comercial</label>
                  <input 
                    type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required
                    className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-900 uppercase focus:border-indigo-500 outline-none"
                    placeholder="EJ: TRIDENT MENTA"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-900 uppercase mb-2">Categoría / Sección</label>
                  <input 
                    type="text" value={categoria} onChange={(e) => setCategoria(e.target.value)} required
                    list="categorias-list"
                    className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-900 uppercase focus:border-indigo-500 outline-none"
                    placeholder="EJ: GOLOSINAS"
                  />
                  <datalist id="categorias-list">
                    {categoriasExistentes.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>

                {/* SELECTOR DE ICONOS MEJORADO */}
                <div className="relative">
                  <label className="block text-xs font-black text-slate-900 uppercase mb-2">Asignar Icono</label>
                  <button 
                    type="button"
                    onClick={() => setMostrarEmojiPicker(!mostrarEmojiPicker)}
                    className="w-full p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl text-3xl flex items-center justify-center hover:bg-slate-100 transition-all"
                  >
                    {icono}
                  </button>

                  {mostrarEmojiPicker && (
                    <div className="absolute z-50 mt-2 p-4 bg-white border border-slate-200 rounded-[2rem] shadow-2xl w-full">
                      <div className="space-y-4 max-h-60 overflow-y-auto">
                        {Object.entries(catalogoIconos).map(([cat, icons]) => (
                          <div key={cat}>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{cat}</p>
                            <div className="flex flex-wrap gap-2">
                              {icons.map(i => (
                                <button 
                                  key={i} type="button" 
                                  onClick={() => { setIcono(i); setMostrarEmojiPicker(false); }}
                                  className="text-2xl p-2 hover:bg-indigo-50 rounded-lg transition-transform active:scale-125"
                                >{i}</button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="submit" className="flex-grow py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all">
                    {editandoId ? "Confirmar Cambios" : "Guardar en Catálogo"}
                  </button>
                  {editandoId && (
                    <button type="button" onClick={resetForm} className="px-6 py-5 bg-rose-100 text-rose-600 rounded-2xl font-black">✕</button>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* COLUMNA DERECHA: TABLA DE PRODUCTOS GENERALES */}
          <div className="lg:col-span-7 bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Listado Maestro de Productos</h3>
            </div>
            <table className="w-full text-left">
              <tbody className="divide-y divide-slate-100">
                {productos.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-5">
                      <div className="flex items-center gap-4">
                        <span className="text-3xl bg-white p-2 rounded-xl shadow-sm border border-slate-100">{p.icono}</span>
                        <div>
                          <p className="text-xs font-black text-slate-900 uppercase leading-none">{p.nombre}</p>
                          <p className="text-[9px] font-bold text-indigo-500 uppercase mt-1 tracking-widest">{p.categoria}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => prepararEdicion(p)}
                          className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={async () => { if(confirm(`¿Deseas eliminar ${p.nombre}?`)) { await supabase.from('productos_abastecimiento').delete().eq('id', p.id); cargarDatos(); } }}
                          className="bg-white text-rose-500 border border-rose-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-rose-500 hover:text-white transition-all"
                        >
                          Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}