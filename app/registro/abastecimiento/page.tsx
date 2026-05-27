"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  icono: string;
  esta_falta: boolean;
}

export default function PanelBodegaOptimizado() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState("TODOS");
  const [busqueda, setBusqueda] = useState("");

  const cargarDatos = async () => {
    setCargando(true);
    const { data } = await supabase
      .from("productos_abastecimiento")
      .select("*")
      .order("nombre", { ascending: true });
    setProductos(data || []);
    setCargando(false);
  };

  useEffect(() => { cargarDatos(); }, []);

  const toggleEstado = async (id: string, estadoActual: boolean) => {
    const nuevoEstado = !estadoActual;
    setProductos(prev => prev.map(p => p.id === id ? { ...p, esta_falta: nuevoEstado } : p));
    await supabase.from("productos_abastecimiento").update({ esta_falta: nuevoEstado }).eq("id", id);
  };

  // Lógica de conteo para la barra de alerta
  const totalFaltantes = productos.filter(p => p.esta_falta).length;

  // Obtener categorías dinámicas para los filtros y las secciones
  const categoriasUnicas = Array.from(new Set(productos.map(p => p.categoria)));
  
  const productosFiltrados = productos.filter(p => {
    const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const coincideFiltro = filtroCategoria === "TODOS" || p.categoria === filtroCategoria;
    return coincideBusqueda && coincideFiltro;
  });

  if (cargando) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-black text-slate-400 animate-pulse uppercase tracking-widest">Sincronizando Inventario...</div>;

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* HEADER CON BUSCADOR Y BARRA DE ALERTA */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200">
          <div className="flex flex-col">
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
              Control <span className="text-blue-600">Bodega</span>
            </h2>
            <div className="mt-4 flex items-center gap-3 bg-slate-100 p-2 rounded-2xl border border-slate-200">
              <span className="pl-3 opacity-40">🔍</span>
              <input 
                type="text"
                placeholder="BUSCAR PRODUCTO..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="bg-transparent border-none outline-none text-[11px] font-black uppercase tracking-widest w-full md:w-64 p-2"
              />
            </div>
          </div>

          {/* LA BARRA DE NOTIFICACIÓN QUE TE GUSTABA */}
          <div className={`w-full lg:w-auto px-8 py-5 rounded-[2rem] flex items-center justify-between gap-6 transition-all duration-500 ${
            totalFaltantes > 0 
            ? 'bg-rose-600 text-white shadow-xl shadow-rose-200 animate-pulse' 
            : 'bg-emerald-500 text-white shadow-lg shadow-emerald-100'
          }`}>
            <div className="flex flex-col">
              <span className="text-[10px] font-black opacity-80 uppercase tracking-[0.2em]">Estado General</span>
              <span className="text-lg font-black uppercase italic tracking-tight">
                {totalFaltantes > 0 ? `🚨 Faltan ${totalFaltantes} Productos` : '✅ Todo Abastecido'}
              </span>
            </div>
            <div className="bg-white/20 p-3 rounded-2xl">
              {totalFaltantes > 0 ? "⚠️" : "👍"}
            </div>
          </div>
        </div>

        {/* FILTROS RÁPIDOS */}
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setFiltroCategoria("TODOS")}
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
              filtroCategoria === "TODOS" ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
            }`}
          >
            VER TODOS
          </button>
          {categoriasUnicas.map(cat => (
            <button 
              key={cat}
              onClick={() => setFiltroCategoria(cat)}
              className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                filtroCategoria === cat ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* LISTADO AGRUPADO POR CATEGORÍAS */}
        <div className="space-y-12">
          {categoriasUnicas.map(cat => {
            const productosDeCategoria = productosFiltrados.filter(p => p.categoria === cat);
            if (productosDeCategoria.length === 0) return null;

            return (
              <div key={cat} className="space-y-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-slate-400 font-black text-[11px] uppercase tracking-[0.3em]">{cat}</h3>
                  <div className="h-[1px] flex-grow bg-slate-200"></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {productosDeCategoria.map((prod) => (
                    <button
                      key={prod.id}
                      onClick={() => toggleEstado(prod.id, prod.esta_falta)}
                      className={`relative flex items-center gap-4 p-5 rounded-[2rem] border-2 transition-all active:scale-95 text-left ${
                        prod.esta_falta 
                        ? 'bg-white border-rose-500 shadow-lg shadow-rose-50' 
                        : 'bg-white border-white shadow-sm hover:border-slate-200'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${
                        prod.esta_falta ? 'bg-rose-500 text-white' : 'bg-slate-50 text-slate-400'
                      }`}>
                        {prod.icono}
                      </div>
                      
                      <div className="flex flex-col overflow-hidden">
                        <span className={`text-[12px] font-black uppercase tracking-tight truncate ${
                          prod.esta_falta ? 'text-rose-600' : 'text-slate-700'
                        }`}>
                          {prod.nombre}
                        </span>
                        <span className={`text-[9px] font-bold uppercase tracking-widest ${
                          prod.esta_falta ? 'text-rose-400' : 'text-slate-300'
                        }`}>
                          {prod.esta_falta ? 'Faltante ⚠️' : 'Disponible ✓'}
                        </span>
                      </div>

                      {/* Indicador de color lateral cuando falta */}
                      {prod.esta_falta && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-rose-500 rounded-full"></div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}