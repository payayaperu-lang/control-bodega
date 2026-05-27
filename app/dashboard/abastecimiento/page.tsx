"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";

interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  icono: string;
  esta_falta: boolean;
  color?: string;
  ultima_actualizacion?: string;
}

// Componente contenedor para permitir arrastrar con el mouse de izquierda a derecha
function ContenedorDesplazable({ children, className }: { children: React.ReactNode, className: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    isDown.current = true;
    containerRef.current.classList.add("cursor-grabbing");
    startX.current = e.pageX - containerRef.current.offsetLeft;
    scrollLeft.current = containerRef.current.scrollLeft;
  };

  const handleMouseLeave = () => {
    isDown.current = false;
    containerRef.current?.classList.remove("cursor-grabbing");
  };

  const handleMouseUp = () => {
    isDown.current = false;
    containerRef.current?.classList.remove("cursor-grabbing");
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDown.current || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5; // Velocidad de arrastre
    containerRef.current.scrollLeft = scrollLeft.current - walk;
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseLeave={handleMouseLeave}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      className={`${className} cursor-grab`}
    >
      {children}
    </div>
  );
}

export default function PanelAdminConMonitoreo() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  
  // Estados para el Buscador y Filtro del Monitor en Vivo
  const [busquedaMonitor, setBusquedaMonitor] = useState("");
  const [filtroCategoriaMonitor, setFiltroCategoriaMonitor] = useState("TODOS");

  // Estados del Formulario de Catálogo
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("");
  const [icono, setIcono] = useState("📦");
  const [color, setColor] = useState("#64748b");
  const [mostrarEmojiPicker, setMostrarEmojiPicker] = useState(false);

  const paletaColores = [
    { nombre: "Gris Base", hex: "#64748b" },
    { nombre: "Chocolate / Café", hex: "#78350f" },
    { nombre: "Naranja / Citrus", hex: "#f97316" },
    { nombre: "Fresa / Rojo", hex: "#ef4444" },
    { nombre: "Menta / Verde", hex: "#22c55e" },
    { nombre: "Chicha / Morado", hex: "#a855f7" },
    { nombre: "Vainilla / Amarillo", hex: "#eab308" },
    { nombre: "Azul / Mirtilo", hex: "#3b82f6" },
    { nombre: "Rosa / Dulce", hex: "#ec4899" },
    { nombre: "Negro / Dark", hex: "#0f172a" },
  ];

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
      .order("categoria", { ascending: true })
      .order("nombre", { ascending: true });
    setProductos(data || []);
    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();

    const canalUrgencias = supabase
      .channel("cambios-inventario-admin")
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "productos_abastecimiento" },
        () => {
          cargarDatos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalUrgencias);
    };
  }, []);

  const categoriasExistentes = Array.from(new Set(productos.map(p => p.categoria)));
  const productosFaltantes = productos.filter(p => p.esta_falta);
  
  // Filtrado dinámico específico para el Monitor en Vivo
  const productosFaltantesFiltrados = productosFaltantes.filter(p => {
    const coincideBusqueda = p.nombre.toLowerCase().includes(busquedaMonitor.toLowerCase());
    const coincideFiltro = filtroCategoriaMonitor === "TODOS" || p.categoria === filtroCategoriaMonitor;
    return coincideBusqueda && coincideFiltro;
  });

  const categoriasFaltantesActivas = Array.from(new Set(productosFaltantes.map(p => p.categoria)));
  const categoriasFaltantesUnicasFiltradas = Array.from(new Set(productosFaltantesFiltrados.map(p => p.categoria)));

  const guardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    const datos = { 
      nombre: nombre.toUpperCase().trim(), 
      categoria: categoria.toUpperCase().trim(), 
      icono,
      color
    };

    if (editandoId) {
      const { error } = await supabase.from("productos_abastecimiento").update(datos).eq("id", editandoId);
      if (error) console.error(error);
    } else {
      const { error } = await supabase.from("productos_abastecimiento").insert([{ ...datos, esta_falta: false }]);
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
    setColor(p.color || "#64748b");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditandoId(null);
    setNombre("");
    setCategoria("");
    setIcono("📦");
    setColor("#64748b");
    setMostrarEmojiPicker(false);
  };

  if (cargando) return <div className="p-20 text-center font-black text-slate-900 animate-pulse tracking-widest">SINCRO DE CONTROL...</div>;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        
        {/* HEADER PRINCIPAL */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-[2rem] shadow-md border-b-4 border-indigo-600 gap-3">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
              Panel de <span className="text-indigo-600">Control Central</span>
            </h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Administración del catálogo y monitoreo en vivo</p>
          </div>
          <div className="bg-slate-900 text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest">
            Catálogo: {productos.length} Items
          </div>
        </header>

        {/* 🚨 EMBED DE MONITOREO EN TIEMPO REAL CON CAROUSEL HORIZONTAL MEJORADO */}
        <div className="bg-white p-5 rounded-[2rem] shadow-xl border-2 border-rose-500/20 space-y-4">
          
          {/* Subheader del Monitor */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-3 gap-3">
            <div className="flex items-center gap-2">
              <span className="text-rose-500 animate-ping text-xs">🔴</span>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">
                Monitor en Vivo: Quiebres de Stock en Tienda
              </h3>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              {/* Buscador interno con Tipografía Corregida y Legible */}
              <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 w-full md:w-64">
                <span className="opacity-50 text-xs">🔍</span>
                <input 
                  type="text"
                  placeholder="Buscar producto en falta..."
                  value={busquedaMonitor}
                  onChange={(e) => setBusquedaMonitor(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs font-semibold text-slate-700 placeholder-slate-400 w-full"
                />
              </div>
              <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${
                productosFaltantes.length > 0 ? "bg-rose-600 text-white animate-pulse" : "bg-emerald-500 text-white"
              }`}>
                {productosFaltantes.length > 0 ? `${productosFaltantes.length} Totales` : "Tienda OK"}
              </span>
            </div>
          </div>

          {/* Barra de Filtros por Categoría */}
          {productosFaltantes.length > 0 && categoriasFaltantesActivas.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-3">
              <button 
                onClick={() => setFiltroCategoriaMonitor("TODOS")}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all ${
                  filtroCategoriaMonitor === "TODOS" 
                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm' 
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-rose-400'
                }`}
              >
                💥 VER TODAS LAS FALTAS
              </button>
              {categoriasFaltantesActivas.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setFiltroCategoriaMonitor(cat)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all ${
                    filtroCategoriaMonitor === cat 
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-rose-400'
                }`}
                >
                  {cat} ({productosFaltantes.filter(p => p.categoria === cat).length})
                </button>
              ))}
            </div>
          )}

          {/* Lista de Resultados Compacta y Desplazable con el Mouse (Drag) */}
          {productosFaltantes.length === 0 ? (
            <div className="py-4 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
              ✅ Los trabajadores no han reportado faltas en este momento.
            </div>
          ) : productosFaltantesFiltrados.length === 0 ? (
            <div className="py-4 text-center text-amber-500 font-bold text-xs uppercase tracking-wider">
              ⚠️ No se encontraron quiebres que coincidan con la búsqueda "{busquedaMonitor}".
            </div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto p-1">
              {categoriasFaltantesUnicasFiltradas.map(cat => {
                const faltantesDeCategoria = productosFaltantesFiltrados.filter(p => p.categoria === cat);
                return (
                  <div key={cat} className="space-y-1 bg-slate-50/60 p-2 rounded-xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">{cat}</p>
                    
                    {/* Contenedor optimizado con Drag and Drop nativo */}
                    <ContenedorDesplazable className="flex flex-nowrap gap-2 overflow-x-auto pb-1 pt-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {faltantesDeCategoria.map(p => (
                        <div 
                          key={p.id} 
                          className="bg-white border border-rose-200 pl-2.5 pr-3 py-1.5 rounded-xl flex items-center gap-2 text-rose-700 font-black text-xs uppercase tracking-tight shadow-sm flex-none select-none"
                        >
                          <div 
                            className="w-1 h-3.5 rounded-full flex-none" 
                            style={{ backgroundColor: p.color || "#64748b" }}
                          />
                          <span className="text-base">{p.icono}</span>
                          <span className="whitespace-nowrap text-[11px]">{p.nombre}</span>
                          <span className="text-[7px] bg-rose-600 text-white px-1.5 py-0.5 rounded-md font-bold tracking-wide flex-none">FALTA</span>
                        </div>
                      ))}
                    </ContenedorDesplazable>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CUERPO DEL PANEL: FORMULARIO Y TABLA MAESTRA COMPACTA */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* COLUMNA IZQUIERDA: FORMULARIO */}
          <div className="lg:col-span-5">
            <form onSubmit={guardarProducto} className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-200 sticky top-6 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-indigo-500">
                {editandoId ? "🔧 Modificar Producto" : "📝 Registrar Nuevo Producto"}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-900 uppercase mb-1">Nombre Comercial</label>
                  <input 
                    type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required
                    className="w-full p-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-900 uppercase focus:border-indigo-500 outline-none"
                    placeholder="EJ: TRIDENT MENTA"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-900 uppercase mb-1">Categoría / Sección</label>
                  <input 
                    type="text" value={categoria} onChange={(e) => setCategoria(e.target.value)} required
                    list="categorias-list"
                    className="w-full p-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-900 uppercase focus:border-indigo-500 outline-none"
                    placeholder="EJ: GOLOSINAS"
                  />
                  <datalist id="categorias-list">
                    {categoriasExistentes.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>

                {/* SELECTOR DE ICONOS */}
                <div className="relative">
                  <label className="block text-xs font-black text-slate-900 uppercase mb-1">Asignar Icono</label>
                  <button 
                    type="button"
                    onClick={() => setMostrarEmojiPicker(!mostrarEmojiPicker)}
                    className="w-full p-3 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl text-2xl flex items-center justify-center hover:bg-slate-100 transition-all"
                  >
                    {icono}
                  </button>

                  {mostrarEmojiPicker && (
                    <div className="absolute z-50 mt-1 p-3 bg-white border border-slate-200 rounded-[1.5rem] shadow-2xl w-full">
                      <div className="space-y-3 max-h-52 overflow-y-auto">
                        {Object.entries(catalogoIconos).map(([cat, icons]) => (
                          <div key={cat}>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{cat}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {icons.map(i => (
                                <button 
                                  key={i} type="button" 
                                  onClick={() => { setIcono(i); setMostrarEmojiPicker(false); }}
                                  className="text-xl p-1.5 hover:bg-indigo-50 rounded-lg transition-transform active:scale-125"
                                >{i}</button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* SELECTOR DE COLOR */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Color de Sabor / Variante: <span className="text-indigo-600 font-bold">({paletaColores.find(c => c.hex === color)?.nombre})</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {paletaColores.map((col) => (
                      <button
                        key={col.hex}
                        type="button"
                        onClick={() => setColor(col.hex)}
                        className={`w-6 h-6 rounded-full border-2 transition-all transform active:scale-95 relative ${
                          color === col.hex ? "border-slate-900 scale-110 shadow-sm" : "border-transparent hover:scale-105"
                        }`}
                        style={{ backgroundColor: col.hex }}
                        title={col.nombre}
                      >
                        {color === col.hex && (
                          <span className="absolute inset-0 flex items-center justify-center text-[9px] text-white font-bold drop-shadow">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button type="submit" className="flex-grow py-4 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all">
                    {editandoId ? "Confirmar Cambios" : "Guardar en Catálogo"}
                  </button>
                  {editandoId && (
                    <button type="button" onClick={resetForm} className="px-4 py-4 bg-rose-100 text-rose-600 rounded-xl font-black hover:bg-rose-200 transition-all">✕</button>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* COLUMNA DERECHA: TABLA MAESTRA COMPACTA */}
          <div className="lg:col-span-7 bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Listado Maestro de Productos</h3>
            </div>
            <div className="max-h-[32rem] overflow-y-auto">
              <table className="w-full text-left">
                <tbody className="divide-y divide-slate-100">
                  {productos.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xl bg-white p-1.5 rounded-lg shadow-sm border border-slate-100">{p.icono}</span>
                          <div>
                            <p className="text-xs font-black text-slate-900 uppercase leading-none flex items-center gap-2">
                              {p.nombre}
                              <span 
                                className="w-2 h-2 rounded-full inline-block border border-black/10" 
                                style={{ backgroundColor: p.color || "#64748b" }}
                              />
                            </p>
                            <p className="text-[8px] font-bold text-indigo-500 uppercase mt-1 tracking-widest">{p.categoria}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          {/* CORREGIDO: Llamando a prepararEdicion en lugar de abrirEdicion */}
                          <button 
                            onClick={() => prepararEdicion(p)}
                            className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all"
                          >
                            Editar
                          </button>
                          <button 
                            onClick={async () => { if(confirm(`¿Deseas eliminar ${p.nombre}?`)) { await supabase.from('productos_abastecimiento').delete().eq('id', p.id); cargarDatos(); } }}
                            className="bg-white text-rose-500 border border-rose-100 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-rose-500 hover:text-white transition-all"
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
    </div>
  );
}