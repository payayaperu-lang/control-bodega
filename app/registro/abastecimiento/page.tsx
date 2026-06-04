"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  icono: string;
  esta_falta: boolean;
  precio: number; 
  color?: string;
  pronto_vencer?: boolean; 
}

export default function PanelBodegaOptimizado() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState("TODOS");
  const [busqueda, setBusqueda] = useState("");

  // Estados para el Modal (Inserción con Autocompletado de Precio)
  const [mostrarModal, setMostrarModal] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [nuevoPrecio, setNuevoPrecio] = useState<string>(""); 
  const [nuevoColor, setNuevoColor] = useState("#64748b");

  // Control del Pop-up de los 4 Botones de Abastecimiento
  const [productoSeleccionadoAccion, setProductoSeleccionadoAccion] = useState<Producto | null>(null);

  // Estados para el Pop-up secundario de Registro Rápido (Cantidad)
  const [tipoRegistroRapido, setTipoRegistroRapido] = useState<"FALTANTE" | "SOBRANTE" | null>(null);
  const [cantidadRapida, setCantidadRapida] = useState<number>(1);
  const [guardandoCantidad, setGuardandoCantidad] = useState(false);
  
  // Estado para controlar si el precio tiene datos válidos (> 0)
  const [tienePrecioRegistrado, setTienePrecioRegistrado] = useState(false);

  const paletaColores = [
    { nombre: "Gris Base", hex: "#64748b" },
    { nombre: "Chocolate / Café", hex: "#78350f" },
    { nombre: "Naranja / Citrus", hex: "#f97316" },
    { font_name: "Vainilla / Amarillo", hex: "#eab308" },
    { nombre: "Azul / Mirtilo", hex: "#3b82f6" },
    { nombre: "Rosa / Dulce", hex: "#ec4899" },
    { nombre: "Negro / Dark", hex: "#0f172a" },
  ];

  const determinarIconoAutomatico = (nombre: string, categoria: string): string => {
    const textoAnalizar = `${nombre} ${categoria}`.toLowerCase();
    if (textoAnalizar.includes("galleta") || textoAnalizar.includes("cookie")) return "🍪";
    if (textoAnalizar.includes("gaseosa") || textoAnalizar.includes("soda") || textoAnalizar.includes("coca") || textoAnalizar.includes("inca")) return "🥤";
    if (textoAnalizar.includes("cerveza") || textoAnalizar.includes("pilsen") || textoAnalizar.includes("cristal")) return "🍺";
    if (textoAnalizar.includes("chocolate") || textoAnalizar.includes("sublime")) return "🍫";
    if (textoAnalizar.includes("dulce") || textoAnalizar.includes("caramelo")) return "🍬";
    if (textoAnalizar.includes("snack") || textoAnalizar.includes("papas") || textoAnalizar.includes("piqueo")) return "🍟";
    if (textoAnalizar.includes("agua") || textoAnalizar.includes("jugo")) return "🧃";
    return "📦";
  };

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const { data: productosBase, error: errBase } = await supabase
        .from("productos_abastecimiento")
        .select("*");
      
      if (errBase) console.error("Error cargando productos_abastecimiento:", errBase);
      
      let listaProductos: Producto[] = (productosBase || []).map(p => {
        const nombreFinal = (p.nombre || p.Nombre || "").trim();
        const categoriaFinal = (p.categoria || p.Categoria || "VARIOS").trim();
        const iconoFinal = p.icono || p.Icono || "📦";
        
        let precioBase = 0;
        const rawPrecio = p.precio ?? p.Precio;
        if (rawPrecio !== null && rawPrecio !== undefined && String(rawPrecio).trim() !== "") {
          precioBase = parseFloat(String(rawPrecio));
        }

        return {
          id: p.id,
          nombre: nombreFinal,
          categoria: categoriaFinal,
          icono: iconoFinal,
          esta_falta: p.esta_falta ?? false,
          color: p.color || "#64748b",
          precio: isNaN(precioBase) ? 0 : precioBase,
          pronto_vencer: p.pronto_vencer || false 
        };
      });

      const { data: faltantesPrecios } = await supabase
        .from("prod_faltantes")
        .select("producto, precio, fecha");

      const { data: sobrantesPrecios } = await supabase
        .from("prod_sobrante")
        .select("producto, precio, fecha");

      const obtenerTimestamp = (item: any): number => {
        if (!item || !item.fecha) return 0;
        const t = Date.parse(item.fecha);
        return isNaN(t) ? 0 : t;
      };

      listaProductos = listaProductos.map(prod => {
        const normalizar = (str: string) => (str || "").trim().toUpperCase().replace(/\s+/g, ' ');
        const nombreNorm = normalizar(prod.nombre);

        const historialFaltantes = (faltantesPrecios || [])
          .filter(f => normalizar(f.producto) === nombreNorm)
          .sort((a, b) => obtenerTimestamp(b) - obtenerTimestamp(a));

        const historialSobrantes = (sobrantesPrecios || [])
          .filter(s => normalizar(s.producto) === nombreNorm)
          .sort((a, b) => obtenerTimestamp(b) - obtenerTimestamp(a));

        const ultimoFaltante = historialFaltantes[0];
        const ultimoSobrante = historialSobrantes[0];

        let precioMasReciente = prod.precio;

        if (ultimoFaltante && ultimoSobrante) {
          const timeFaltante = obtenerTimestamp(ultimoFaltante);
          const timeSobrante = obtenerTimestamp(ultimoSobrante);
          
          if (timeFaltante >= timeSobrante) {
            const pFaltante = parseFloat(String(ultimoFaltante.precio));
            if (!isNaN(pFaltante) && pFaltante > 0) precioMasReciente = pFaltante;
          } else {
            const pSobrante = parseFloat(String(ultimoSobrante.precio));
            if (!isNaN(pSobrante) && pSobrante > 0) precioMasReciente = pSobrante;
          }
        } else if (ultimoFaltante) {
          const pFaltante = parseFloat(String(ultimoFaltante.precio));
          if (!isNaN(pFaltante) && pFaltante > 0) precioMasReciente = pFaltante;
        } else if (ultimoSobrante) {
          const pSobrante = parseFloat(String(ultimoSobrante.precio));
          if (!isNaN(pSobrante) && pSobrante > 0) precioMasReciente = pSobrante;
        }

        return {
          ...prod,
          precio: precioMasReciente
        };
      });

      listaProductos.sort((a, b) => a.nombre.localeCompare(b.nombre));
      setProductos(listaProductos);

    } catch (err) {
      console.error("Error crítico en la sincronización de datos:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  // Detectar el nombre escrito para autocompletar el precio si ya existía antes
  useEffect(() => {
    if (!nuevoNombre.trim()) return;
    
    const nombreNormalizado = nuevoNombre.toUpperCase().trim();
    const productoExistente = productos.find(p => p.nombre.trim().toUpperCase() === nombreNormalizado);

    if (productoExistente && productoExistente.precio > 0) {
      setNuevoPrecio(productoExistente.precio.toString());
      if (productoExistente.categoria && !nuevaCategoria) {
        setNuevaCategoria(productoExistente.categoria);
      }
    }
  }, [nuevoNombre, productos]);

  const cambiarEstadoFaltaBase = async (id: string, estadoActual: boolean) => {
    const nuevoEstadoFalta = !estadoActual;
    setProductos(prev => prev.map(p => p.id === id ? { ...p, esta_falta: nuevoEstadoFalta, pronto_vencer: nuevoEstadoFalta ? false : p.pronto_vencer } : p));
    await supabase.from("productos_abastecimiento").update({ esta_falta: nuevoEstadoFalta, ...(nuevoEstadoFalta && { pronto_vencer: false })}).eq("id", id);
    setProductoSeleccionadoAccion(null);
  };

  const cambiarEstadoVencimiento = async (id: string, estadoActual: boolean) => {
    const nuevoEstado = !estadoActual;
    setProductos(prev => prev.map(p => p.id === id ? { ...p, pronto_vencer: nuevoEstado } : p));
    await supabase.from("productos_abastecimiento").update({ pronto_vencer: nuevoEstado }).eq("id", id);
    setProductoSeleccionadoAccion(null);
  };

  const handleGuardarCantidadRapida = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productoSeleccionadoAccion || cantidadRapida <= 0) return;
    setGuardandoCantidad(true);

    const tablaDestino = tipoRegistroRapido === "FALTANTE" ? "prod_faltantes" : "prod_sobrante";
    
    // Si el input está oculto usa el precio del producto; si está visible toma lo digitado
    const precioFinal = tienePrecioRegistrado
      ? productoSeleccionadoAccion.precio.toFixed(2)
      : (nuevoPrecio.trim() !== "" && parseFloat(nuevoPrecio) !== 0 ? parseFloat(nuevoPrecio).toFixed(2) : "0.00");

    const { error } = await supabase.from(tablaDestino).insert([
      {
        fecha: new Date().toISOString().split('T')[0],
        producto: productoSeleccionadoAccion.nombre.toUpperCase().trim(),
        cantidad: cantidadRapida,
        precio: precioFinal
      }
    ]);

    if (!error) {
      setTipoRegistroRapido(null);
      setProductoSeleccionadoAccion(null);
      setCantidadRapida(1);
      setNuevoPrecio("");
      alert(`¡${tipoRegistroRapido} registrado con éxito!`);
      cargarDatos();
    } else {
      console.error("Error original de Supabase:", error);
      alert(`Error al guardar: ${error.message}`);
    }
    setGuardandoCantidad(false);
  };

  const abrirModalCrear = (nombreInicial = "") => {
    setNuevoNombre(nombreInicial);
    setNuevaCategoria("");
    setNuevoPrecio("");
    setNuevoColor("#64748b");
    setMostrarModal(true);
  };

  const handleGuardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre.trim() || !nuevaCategoria.trim()) return;

    const nombreFormateado = nuevoNombre.toUpperCase().trim();
    const categoriaFormateada = nuevaCategoria.toUpperCase().trim();
    const iconoAutomatico = determinarIconoAutomatico(nombreFormateado, categoriaFormateada);
    const precioNumerico = parseFloat(nuevoPrecio) || 0;

    const { error } = await supabase
      .from("productos_abastecimiento")
      .insert([{ 
        nombre: nombreFormateado, 
        categoria: categoriaFormateada,
        icono: iconoAutomatico, 
        color: nuevoColor, 
        precio: precioNumerico, 
        esta_falta: true 
      }]);

    if (!error) {
      cargarDatos();
      setMostrarModal(false);
    } else {
      console.error("Error al crear producto base:", error);
      alert("No se pudo crear el producto: " + error.message);
    }
  };

  const totalFaltantes = productos.filter(p => p.esta_falta).length;
  const totalPorVencer = productos.filter(p => p.pronto_vencer).length;
  const categoriesUnicas = Array.from(new Set(productos.map(p => p.categoria)));

  const productosFiltrados = productos.filter(p => {
    return p.nombre.toLowerCase().includes(busqueda.toLowerCase()) && (filtroCategoria === "TODOS" || p.categoria === filtroCategoria);
  });

  if (cargando) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-black text-slate-400 animate-pulse uppercase tracking-widest text-xs">Sincronizando Inventario...</div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 p-3 md:p-6 relative">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="border-b border-slate-200 pb-4">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mb-1">Logística y Abastecimiento</p>
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
          <span className="text-indigo-600"> Bodega</span>
        </h2>
      </div>
        
        {/* HEADER RESPONSIVO */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex flex-col justify-center">
            
            <div className="mt-2.5 flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-sm opacity-50">🔍</span>
              <input 
                type="text"
                placeholder="BUSCAR O CREAR..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="bg-transparent border-none outline-none text-[11px] font-bold uppercase tracking-wider w-full md:w-48 p-1"
              />
              {busqueda && !productos.some(p => p.nombre.toLowerCase() === busqueda.toLowerCase()) && (
                <button 
                  onClick={() => abrirModalCrear(busqueda)}
                  className="bg-blue-600 text-white text-[9px] font-black px-2.5 py-1 rounded-lg uppercase shadow-xs animate-bounce"
                >
                  + Agregar
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 md:flex md:items-center">
            <div className={`p-3 rounded-xl flex items-center gap-3 border transition-all min-w-[140px] ${totalFaltantes > 0 ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
              <span className="text-xl">🚨</span>
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-wider opacity-70">Abastecer Stock</span>
                <span className="text-sm font-black tracking-tight">{totalFaltantes} Prod.</span>
              </div>
            </div>

            <div className={`p-3 rounded-xl flex items-center gap-3 border transition-all min-w-[140px] ${totalPorVencer > 0 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
              <span className="text-xl">⏳</span>
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-wider opacity-70">Por Vencer</span>
                <span className="text-sm font-black tracking-tight">{totalPorVencer} Prod.</span>
              </div>
            </div>
          </div>
        </div>

        {/* FILTROS RÁPIDOS DESLIZABLES */}
        <div className="w-full overflow-x-auto no-scrollbar pb-1 flex gap-2 scroll-smooth">
          <button 
            onClick={() => setFiltroCategoria("TODOS")}
            className={`whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${filtroCategoria === "TODOS" ? 'bg-slate-950 text-white border-slate-950 shadow-sm' : 'bg-white text-slate-500 border-slate-200'}`}
          >
            VER TODOS ({productos.length})
          </button>
          {categoriesUnicas.map(cat => (
            <button 
              key={cat}
              onClick={() => setFiltroCategoria(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${filtroCategoria === cat ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-500 border-slate-200'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* LISTADO DE TARJETAS */}
        <div className="space-y-6">
          {categoriesUnicas.map(cat => {
            const productosDeCategoria = productosFiltrados.filter(p => p.categoria === cat);
            if (productosDeCategoria.length === 0) return null;

            return (
              <div key={cat} className="space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-slate-400 font-black text-[10px] uppercase tracking-widest">{cat}</h3>
                  <div className="h-[1px] flex-grow bg-slate-200"></div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                  {productosDeCategoria.map((prod) => (
                    <div 
                      key={prod.id} 
                      className={`relative rounded-xl border transition-all p-3 flex items-center gap-3 bg-white cursor-pointer select-none ${
                        prod.esta_falta 
                          ? 'border-[3px] border-rose-500 bg-rose-50/60 shadow-md ring-2 ring-rose-200/50' 
                          : prod.pronto_vencer 
                            ? 'border-[3px] border-amber-500 bg-amber-50/50 shadow-sm' 
                            : 'border-slate-100 hover:border-slate-300'
                      }`}
                      onClick={() => setProductoSeleccionadoAccion(prod)}
                    >
                      <div className="flex-grow flex items-center gap-2.5 text-left overflow-hidden pr-2">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 border" style={(!prod.esta_falta && !prod.pronto_vencer) ? { borderLeftColor: prod.color, borderLeftWidth: '3px' } : {}}>
                          {prod.icono}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-[11px] font-black uppercase tracking-tight truncate text-slate-800">{prod.nombre}</span>
                          <span className="text-[9px] font-mono font-bold text-slate-500">S/ {prod.precio.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <div className="absolute top-1 right-1 flex gap-0.5">
                        {prod.esta_falta && <span className="text-[10px]">🚨</span>}
                        {prod.pronto_vencer && <span className="text-[10px]">⏳</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* POP-UP 1: ACCIONES MAESTRAS */}
      {productoSeleccionadoAccion && !tipoRegistroRapido && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setProductoSeleccionadoAccion(null)}>
          <div className="bg-white w-full max-w-xs rounded-2xl shadow-xl p-5 space-y-3.5 border border-slate-100 relative" onClick={(e) => e.stopPropagation()}>
            
            <button 
              onClick={() => setProductoSeleccionadoAccion(null)}
              className="absolute top-3 right-3 w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center text-xs font-black transition-all"
              title="Cerrar"
            >
              ✕
            </button>

            <div className="text-center pb-2 border-b border-slate-100 pr-4">
              <span className="text-2xl block mb-0.5">{productoSeleccionadoAccion.icono}</span>
              <h4 className="text-xs font-black uppercase text-slate-900 tracking-tight">{productoSeleccionadoAccion.nombre}</h4>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 inline-block mt-1">
                Precio Actual: S/ {productoSeleccionadoAccion.precio.toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button 
                onClick={() => cambiarEstadoFaltaBase(productoSeleccionadoAccion.id, productoSeleccionadoAccion.esta_falta)}
                className={`w-full py-2.5 px-3 rounded-lg font-black text-[11px] uppercase tracking-wider text-left border flex items-center justify-between ${productoSeleccionadoAccion.esta_falta ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}
              >
                <span>{productoSeleccionadoAccion.esta_falta ? "✓ Disponible" : "⚠️ ABASTECER"}</span>
                <span>{productoSeleccionadoAccion.esta_falta ? "👍" : "🚨"}</span>
              </button>

              <button 
                onClick={() => cambiarEstadoVencimiento(productoSeleccionadoAccion.id, productoSeleccionadoAccion.pronto_vencer || false)}
                className={`w-full py-2.5 px-3 rounded-lg font-black text-[11px] uppercase tracking-wider text-left border flex items-center justify-between ${productoSeleccionadoAccion.pronto_vencer ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}
              >
                <span>{productoSeleccionadoAccion.pronto_vencer ? "✓ Quitar Alerta Vencer" : "⏳ POR VENCER"}</span>
                <span>{productoSeleccionadoAccion.pronto_vencer ? "👍" : "⏳"}</span>
              </button>

              <button 
                onClick={() => {
                  setTipoRegistroRapido("FALTANTE");
                  if (productoSeleccionadoAccion.precio > 0) {
                    setNuevoPrecio(productoSeleccionadoAccion.precio.toString());
                    setTienePrecioRegistrado(true);
                  } else {
                    setNuevoPrecio("");
                    setTienePrecioRegistrado(false);
                  }
                }}
                className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-[11px] uppercase tracking-wider text-left rounded-lg flex items-center justify-between shadow-sm"
              >
                <span>📉 REGISTRAR FALTANTES</span>
                <span>➕</span>
              </button>

              <button 
                onClick={() => {
                  setTipoRegistroRapido("SOBRANTE");
                  if (productoSeleccionadoAccion.precio > 0) {
                    setNuevoPrecio(productoSeleccionadoAccion.precio.toString());
                    setTienePrecioRegistrado(true);
                  } else {
                    setNuevoPrecio("");
                    setTienePrecioRegistrado(false);
                  }
                }}
                className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] uppercase tracking-wider text-left rounded-lg flex items-center justify-between shadow-sm"
              >
                <span>📦 REGISTRAR SOBRANTES</span>
                <span>➕</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POP-UP 2: ADICIONAL PARA AGREGAR CANTIDADES RÁPIDAS Y PRECIO */}
      {tipoRegistroRapido && productoSeleccionadoAccion && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setTipoRegistroRapido(null)}>
          <div className="bg-white w-full max-w-xs rounded-2xl shadow-xl p-6 space-y-5 border border-slate-100 relative animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
            
            <button 
              onClick={() => {
                setTipoRegistroRapido(null);
                setProductoSeleccionadoAccion(null);
              }}
              className="absolute top-4 right-4 w-6 h-6 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center text-[11px] font-black transition-all border border-slate-100"
              title="Cerrar todo"
            >
              ✕
            </button>

            <div className="text-center space-y-1">
              <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md inline-block ${tipoRegistroRapido === "FALTANTE" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                Registro Rápido: {tipoRegistroRapido}
              </span>
              <h4 className="text-sm font-black uppercase text-slate-800 tracking-tight block pt-1">{productoSeleccionadoAccion.nombre}</h4>
            </div>

            <form onSubmit={handleGuardarCantidadRapida} className="space-y-4">
              
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">Cantidad a Registrar</label>
                <div className="flex items-center justify-center gap-3">
                  <button 
                    type="button" 
                    onClick={() => setCantidadRapida(prev => Math.max(1, prev - 1))} 
                    className="w-9 h-9 bg-slate-50 hover:bg-slate-100 active:scale-95 font-black text-base rounded-xl text-slate-600 transition-all border border-slate-200 shadow-xs"
                  >
                    -
                  </button>
                  <input 
                    type="number" 
                    min="1" 
                    required 
                    value={cantidadRapida} 
                    onChange={(e) => setCantidadRapida(Math.max(1, parseInt(e.target.value) || 1))} 
                    className="w-16 p-2 text-center bg-slate-50 border border-slate-200 rounded-xl font-black text-sm text-slate-900 outline-none focus:border-slate-400 transition-all" 
                  />
                  <button 
                    type="button" 
                    onClick={() => setCantidadRapida(prev => prev + 1)} 
                    className="w-9 h-9 bg-slate-50 hover:bg-slate-100 active:scale-95 font-black text-base rounded-xl text-slate-600 transition-all border border-slate-200 shadow-xs"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* LÓGICA ULTRA-LIMPIA: El input desaparece por completo si ya tiene precio */}
              {!tienePrecioRegistrado ? (
                <div className="space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">Precio por Unidad (S/)</label>
                  <div className="relative max-w-[120px] mx-auto">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-blue-500">S/</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      required 
                      value={nuevoPrecio} 
                      onChange={(e) => setNuevoPrecio(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-center bg-slate-50 border border-slate-200 rounded-xl font-black text-xs text-blue-600 outline-none focus:border-blue-400 transition-all shadow-xs"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center pt-1 text-[11px] font-mono font-bold text-slate-400">
                  Precio establecido: S/ {productoSeleccionadoAccion.precio.toFixed(2)}
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <button 
                  type="submit" 
                  disabled={guardandoCantidad} 
                  className={`w-full py-2.5 font-black text-[11px] uppercase tracking-wider text-white rounded-xl shadow-md active:scale-[0.98] transition-all ${tipoRegistroRapido === "FALTANTE" ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
                >
                  {guardandoCantidad ? "Guardando..." : `Confirmar +${cantidadRapida}`}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    const subRuta = tipoRegistroRapido === "FALTANTE" ? "faltantes" : "sobrantes";
                    const encodedName = encodeURIComponent(productoSeleccionadoAccion.nombre);
                    
                    const precioParaEnviar = nuevoPrecio.trim() !== "" && parseFloat(nuevoPrecio) !== 0
                      ? encodeURIComponent(nuevoPrecio.trim())
                      : encodeURIComponent(productoSeleccionadoAccion.precio.toString());

                    window.location.href = `/registro/${subRuta}?producto=${encodedName}&precio=${precioParaEnviar}`;
                  }}
                  className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-black text-[11px] uppercase tracking-wider text-center rounded-xl border border-slate-200 transition-all shadow-xs"
                >
                  IR A LA PÁGINA ➡️
                </button>
              </div>
            </form>

            <div className="text-center pt-1 border-t border-slate-100">
              <button 
                type="button"
                onClick={() => setTipoRegistroRapido(null)} 
                className="text-[9px] font-black uppercase text-slate-400 hover:text-slate-600 tracking-widest flex items-center justify-center gap-1 mx-auto transition-all"
              >
                ⬅️ Volver al menú
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL CREACIÓN */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-5 border border-slate-100 space-y-4">
            <h3 className="text-sm font-black uppercase italic text-slate-900 border-b pb-2">🚨 Nuevo Registro</h3>
            <form onSubmit={handleGuardarProducto} className="space-y-3.5">
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Nombre Comercial</label>
                <input 
                  type="text" required value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 uppercase outline-none"
                  placeholder="EJ: PILSEN 630ML"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Precio Unitario (S/)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  required 
                  value={nuevoPrecio} 
                  onChange={(e) => setNuevoPrecio(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-blue-600 outline-none placeholder:font-normal"
                  placeholder="0.00"
                />
                <p className="text-[8px] text-slate-400 mt-1 font-bold uppercase">
                  ⚡ Si el nombre ya existía, el sistema autocompletará el precio automáticamente.
                </p>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Categoría</label>
                <input 
                  type="text" required list="modal-categorias" value={nuevaCategoria} onChange={(e) => setNuevaCategoria(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 uppercase outline-none"
                  placeholder="CATEGORÍA"
                />
                <datalist id="modal-categorias">
                  {categoriesUnicas.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>

              <div className="flex gap-2 pt-3 border-t">
                <button type="button" onClick={() => setMostrarModal(false)} className="w-1/3 py-2.5 bg-slate-100 text-slate-600 font-black text-[10px] uppercase rounded-xl">Cancelar</button>
                <button type="submit" className="flex-grow py-2.5 bg-slate-950 text-white font-black text-[10px] uppercase rounded-xl shadow-sm">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}