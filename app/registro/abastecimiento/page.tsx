"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  icono: string;
  esta_falta: boolean;
  color?: string;
}

export default function PanelBodegaOptimizado() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState("TODOS");
  const [busqueda, setBusqueda] = useState("");

  // Estados para el Modal (Inserción y Edición)
  const [mostrarModal, setMostrarModal] = useState(false);
  const [productoEnEdicion, setProductoEnEdicion] = useState<Producto | null>(null);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [nuevoIcono, setNuevoIcono] = useState("📦");
  const [nuevoColor, setNuevoColor] = useState("#64748b");
  const [mostrarEmojiPickerModal, setMostrarEmojiPickerModal] = useState(false);

  // Control de menú de acciones por producto
  const [menuAccionesId, setMenuAccionesId] = useState<string | null>(null);

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
    setCargando(true);
    const { data } = await supabase
      .from("productos_abastecimiento")
      .select("*")
      .order("nombre", { ascending: true });
    setProductos(data || []);
    setCargando(false);
  };

  useEffect(() => { 
    cargarDatos(); 
  }, []);

  // Cerrar menús flotantes al hacer clic en cualquier lugar externo
  useEffect(() => {
    const limbiarMenu = () => setMenuAccionesId(null);
    window.addEventListener("click", limbiarMenu);
    return () => window.removeEventListener("click", limbiarMenu);
  }, []);

  const toggleEstado = async (id: string, estadoActual: boolean) => {
    const nuevoEstado = !estadoActual;
    setProductos(prev => prev.map(p => p.id === id ? { ...p, esta_falta: nuevoEstado } : p));
    await supabase.from("productos_abastecimiento").update({ esta_falta: nuevoEstado }).eq("id", id);
  };

  const abrirModalCrear = (nombreInicial = "") => {
    setProductoEnEdicion(null);
    setNuevoNombre(nombreInicial);
    setNuevaCategoria("");
    setNuevoIcono("📦");
    setNuevoColor("#64748b");
    setMostrarModal(true);
  };

  const abrirModalEditar = (prod: Producto) => {
    setProductoEnEdicion(prod);
    setNuevoNombre(prod.nombre);
    setNuevaCategoria(prod.categoria);
    setNuevoIcono(prod.icono);
    setNuevoColor(prod.color || "#64748b");
    setMostrarModal(true);
  };

  const handleEliminarProducto = async (id: string) => {
    if (confirm("¿ESTÁS SEGURO DE QUE DESEAS ELIMINAR ESTE PRODUCTO POR COMPLETO?")) {
      setProductos(prev => prev.filter(p => p.id !== id));
      await supabase.from("productos_abastecimiento").delete().eq("id", id);
    }
  };

  const handleGuardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre.trim() || !nuevaCategoria.trim()) return;

    const datosProducto = {
      nombre: nuevoNombre.toUpperCase().trim(),
      categoria: nuevaCategoria.toUpperCase().trim(),
      icono: nuevoIcono,
      color: nuevoColor,
    };

    if (productoEnEdicion) {
      // Operación de Edición
      const { error } = await supabase
        .from("productos_abastecimiento")
        .update(datosProducto)
        .eq("id", productoEnEdicion.id);

      if (!error) cargarDatos();
    } else {
      // Operación de Inserción Nueva
      const { error } = await supabase
        .from("productos_abastecimiento")
        .insert([{ ...datosProducto, esta_falta: true }]);

      if (!error) cargarDatos();
    }

    setMostrarModal(false);
    setMostrarEmojiPickerModal(false);
  };

  // Cálculos de contadores faltantes para los filtros dinámicos
  const totalFaltantes = productos.filter(p => p.esta_falta).length;
  const categoriasUnicas = Array.from(new Set(productos.map(p => p.categoria)));

  const obtenerFaltantesPorCategoria = (cat: string) => {
    return productos.filter(p => p.categoria === cat && p.esta_falta).length;
  };
  
  const productosFiltrados = productos.filter(p => {
    const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const coincideFiltro = filtroCategoria === "TODOS" || p.categoria === filtroCategoria;
    return coincideBusqueda && coincideFiltro;
  });

  const productosSimilares = nuevoNombre.trim().length > 2 && !productoEnEdicion
    ? productos.filter(p => p.nombre.toLowerCase().includes(nuevoNombre.toLowerCase()))
    : [];

  if (cargando) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-black text-slate-400 animate-pulse uppercase tracking-widest">Sincronizando Inventario...</div>;

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 p-4 md:p-8 relative">
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

          <div className={`w-full lg:w-auto px-8 py-5 rounded-[2rem] flex items-center justify-between gap-6 transition-all duration-500 ${
            totalFaltantes > 0 
            ? 'bg-rose-600 text-white shadow-xl shadow-rose-200' 
            : 'bg-emerald-500 text-white shadow-lg shadow-emerald-100'
          }`}>
            <div className="flex flex-col">
              <span className="text-[10px] font-black opacity-80 uppercase tracking-[0.2em]">Estado General</span>
              <span className="text-lg font-black uppercase italic tracking-tight">
                {totalFaltantes > 0 ? `🚨 Abastecer ${totalFaltantes} Productos` : '✅ Todo Abastecido'}
              </span>
            </div>
            <div className="bg-white/20 p-3 rounded-2xl">
              {totalFaltantes > 0 ? "⚠️" : "👍"}
            </div>
          </div>
        </div>

        {/* FILTROS RÁPIDOS CON SCROLL HACIA LOS LADOS */}
        <div className="w-full overflow-x-auto no-scrollbar pb-2 flex gap-2 scroll-smooth -mx-4 px-4 md:mx-0 md:px-0">
          <button 
            onClick={() => setFiltroCategoria("TODOS")}
            className={`whitespace-nowrap px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2.5 ${
              filtroCategoria === "TODOS" ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
            }`}
          >
            <span>VER TODOS</span>
            <span className={`px-2 py-0.5 rounded-lg text-[9px] ${filtroCategoria === "TODOS" ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {totalFaltantes}
            </span>
          </button>
          
          {categoriasUnicas.map(cat => {
            const faltantesCat = obtenerFaltantesPorCategoria(cat);
            return (
              <button 
                key={cat}
                onClick={() => setFiltroCategoria(cat)}
                className={`whitespace-nowrap px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2.5 ${
                  filtroCategoria === cat ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-400'
                }`}
              >
                <span>{cat}</span>
                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${
                  filtroCategoria === cat 
                    ? 'bg-white/20 text-white' 
                    : faltantesCat > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'
                }`}>
                  {faltantesCat}
                </span>
              </button>
            );
          })}
        </div>

        {/* INTERFAZ DINÁMICA SI NO SE ENCUENTRA EL PRODUCTO */}
        {productosFiltrados.length === 0 && busqueda.trim() !== "" && (
          <div className="bg-white border-2 border-dashed border-slate-300 p-10 rounded-[2.5rem] text-center max-w-xl mx-auto space-y-5 shadow-sm">
            <span className="text-4xl">📦</span>
            <div className="space-y-1">
              <h4 className="text-sm font-black uppercase text-slate-900">¿No encontraste "{busqueda}" en la lista?</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Puedes ingresarlo al sistema para reportar que hace falta.</p>
            </div>
            <button
              onClick={() => abrirModalCrear(busqueda)}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-md transition-all active:scale-95"
            >
              + Agregar Nuevo Producto
            </button>
          </div>
        )}

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
                    <div 
                      key={prod.id} 
                      className={`relative rounded-[2rem] border-2 transition-all p-5 flex items-center gap-4 bg-white ${
                        prod.esta_falta ? 'border-rose-500 shadow-lg shadow-rose-50' : 'border-white shadow-sm hover:border-slate-200'
                      }`}
                    >
                      {/* Botón Principal de Toggle de Estado */}
                      <button
                        onClick={() => toggleEstado(prod.id, prod.esta_falta)}
                        className="flex-grow flex items-center gap-4 text-left active:scale-[0.98] transition-transform overflow-hidden pr-6"
                      >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner flex-shrink-0 ${
                          prod.esta_falta ? 'bg-rose-500 text-white' : 'bg-slate-50 text-slate-400'
                        }`}>
                          {prod.icono}
                        </div>
                        
                        <div className="flex flex-col overflow-hidden">
                          <span className={`text-[12px] font-black uppercase tracking-tight truncate ${
                            prod.esta_falta ? 'text-white-600' : 'text-slate-700'
                          }`}>
                            {prod.nombre}
                          </span>
                          <span className={`text-[9px] font-bold uppercase tracking-widest ${
                            prod.esta_falta ? 'text-rose-400' : 'text-green-600'
                          }`}>
                            {prod.esta_falta ? 'Abastecer ⚠️' : 'Disponible ✓'}
                          </span>
                        </div>
                      </button>

                      {/* Botón Flotante de Acciones Rápidas (...) */}
                      <div className="absolute right-7 top-1/2 -translate-y-1/2 z-10">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuAccionesId(menuAccionesId === prod.id ? null : prod.id);
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors font-bold text-sm"
                        >
                          ⋮
                        </button>

                        {/* Menú Desplegable contextual de opciones */}
                        {menuAccionesId === prod.id && (
                          <div 
                            className="absolute right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 w-28 z-20 space-y-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => { abrirModalEditar(prod); setMenuAccionesId(null); }}
                              className="w-full text-left px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50 hover:text-blue-600"
                            >
                              ✏️ Editar
                            </button>
                            <button
                              onClick={() => { handleEliminarProducto(prod.id); setMenuAccionesId(null); }}
                              className="w-full text-left px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-rose-600 hover:bg-rose-50"
                            >
                              🗑️ Eliminar
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Barra lateral indicadora del color */}
                      <div 
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-full border border-black/5"
                        style={{ backgroundColor: prod.color || "#64748b" }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* MODAL CONFIGURABLE (CREACIÓN / EDICIÓN) */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 border border-slate-100 space-y-6">
            
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black uppercase italic text-slate-900 tracking-tight">
                {productoEnEdicion ? "✏️ Modificar Registro" : "🚨 Confirmar Nuevo Registro"}
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                {productoEnEdicion ? "Edita las propiedades del ítem seleccionado" : "Verifica que el producto no exista en las sugerencias de abajo"}
              </p>
            </div>

            <form onSubmit={handleGuardarProducto} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 mb-2">Nombre Comercial</label>
                <input 
                  type="text"
                  required
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs font-bold text-slate-900 uppercase focus:border-blue-600 outline-none"
                  placeholder="EJ: CRISTAL 1L RETORNABLE"
                />
              </div>

              {/* DETECTOR EN TIEMPO REAL DE DUPLICADOS */}
              {productosSimilares.length > 0 && (
                <div className="bg-amber-50 border-2 border-dashed border-amber-300 p-4 rounded-2xl space-y-2">
                  <p className="text-[9px] font-black text-amber-700 uppercase tracking-wider">⚠️ ¿Te refieres a alguno de estos ya existentes?</p>
                  <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                    {productosSimilares.map(ps => (
                      <div key={ps.id} className="bg-white px-3 py-1.5 border border-amber-200 rounded-xl text-[10px] font-black text-slate-700 uppercase">
                        {ps.icono} {ps.nombre}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 mb-2">Categoría</label>
                  <input 
                    type="text"
                    required
                    list="modal-categorias"
                    value={nuevaCategoria}
                    onChange={(e) => setNuevaCategoria(e.target.value)}
                    className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs font-bold text-slate-900 uppercase focus:border-blue-600 outline-none"
                    placeholder="EJ: BEBIDAS"
                  />
                  <datalist id="modal-categorias">
                    {categoriasUnicas.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>

                {/* EMOJI PICKER */}
                <div className="relative">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 mb-2">Icono</label>
                  <button 
                    type="button"
                    onClick={() => setMostrarEmojiPickerModal(!mostrarEmojiPickerModal)}
                    className="w-full p-3.5 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl text-2xl flex items-center justify-center hover:bg-slate-100 transition-all focus:border-blue-600"
                  >
                    {nuevoIcono}
                  </button>

                  {mostrarEmojiPickerModal && (
                    <div className="absolute right-0 bottom-full mb-2 p-4 bg-white border border-slate-200 rounded-[2rem] shadow-2xl w-64 max-w-xs z-[60]">
                      <div className="space-y-4 max-h-48 overflow-y-auto p-1">
                        {Object.entries(catalogoIconos).map(([cat, icons]) => (
                          <div key={cat}>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{cat}</p>
                            <div className="grid grid-cols-5 gap-1.5">
                              {icons.map(i => (
                                <button 
                                  key={i} type="button" 
                                  onClick={() => { setNuevoIcono(i); setMostrarEmojiPickerModal(false); }}
                                  className="text-xl p-1 hover:bg-blue-50 rounded-lg transition-transform active:scale-125 text-center"
                                >{i}</button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SELECTOR DE COLOR */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700 mb-2">
                  Color del Sabor / Variante: <span className="text-blue-600 font-bold">({paletaColores.find(c => c.hex === nuevoColor)?.nombre})</span>
                </label>
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {paletaColores.map((color) => (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() => setNuevoColor(color.hex)}
                      className={`w-7 h-7 rounded-full border-2 transition-all transform active:scale-95 relative ${
                        nuevoColor === color.hex ? "border-slate-900 scale-110 shadow-sm" : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.nombre}
                    >
                      {nuevoColor === color.hex && (
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold drop-shadow">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setMostrarModal(false); setMostrarEmojiPickerModal(false); }}
                  className="w-1/3 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-grow py-4 bg-slate-900 hover:bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-md transition-all"
                >
                  {productoEnEdicion ? "Guardar Cambios" : "Confirmar e Insertar Faltante"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}