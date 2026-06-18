"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase"; 
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ProveedorDB {
  id: number; nombre: string; color: string; dia_pedido: string; dia_entrega: string; catalogo_link?: string;
}

interface PedidoGuardadoDB {
  id: number; proveedor: string; producto: string; cantidad: string; precio?: number; creado_en: string; recibido?: boolean; oculto?: boolean;
}

interface RankingItem {
  producto: string; proveedor: string; totalPedidos: number;
}

function ProveedoresContent() {
  const searchParams = useSearchParams();
  const proveedorQuery = searchParams.get("proveedor");

  const formRef = useRef<HTMLFormElement>(null); 

  const [proveedores, setProveedores] = useState<ProveedorDB[]>([]);
  const [pedidosDB, setPedidosDB] = useState<PedidoGuardadoDB[]>([]);
  const [proveedorSel, setProveedorSel] = useState("");
  const [producto, setProducto] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [precio, setPrecio] = useState(""); // Nuevo estado para precio
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false); 
  const [verHistorial, setVerHistorial] = useState(false);
  const [nuevoPedidoId, setNuevoPedidoId] = useState<number | null>(null); // Para el resaltado y auto-scroll
  
  const [tipoTransaccion, setTipoTransaccion] = useState("COMPRA");
  const [tipoPresentacion, setTipoPresentacion] = useState("UNIDADES");

  const [diaAbierto, setDiaAbierto] = useState<string | null>(null);
  const diasSemana = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

  // Estados para el Modal de Edición
  const [pedidoAEditar, setPedidoAEditar] = useState<PedidoGuardadoDB | null>(null);
  const [editProducto, setEditProducto] = useState("");
  const [editCantidad, setEditCantidad] = useState("");
  const [editFormato, setEditFormato] = useState("UNIDADES");
  const [editPrecio, setEditPrecio] = useState("");

  const cargarPedidosDesdeBD = async () => {
    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .order("creado_en", { ascending: false });

    if (error) {
      console.error("Error:", error);
    } else {
      setPedidosDB(data || []);
    }
  };

  useEffect(() => {
    const inicializarDatos = async () => {
      const { data: provsData, error: provsError } = await supabase
        .from("proveedores")
        .select("*")
        .order("nombre", { ascending: true });

      if (provsError) {
        console.error("Error cargando proveedores:", provsError);
      } else if (provsData) {
        setProveedores(provsData);
        const proveedorGuardado = localStorage.getItem("proveedor_actual_payaya");

        if (proveedorQuery) {
          const existe = provsData.find(p => p.nombre.toLowerCase() === proveedorQuery.toLowerCase());
          if (existe) setProveedorSel(existe.nombre);
        } else if (proveedorGuardado) {
          setProveedorSel(proveedorGuardado);
        }
        setDiaAbierto(null);
      }
      await cargarPedidosDesdeBD();
      setCargando(false);
    };
    inicializarDatos();
  }, [proveedorQuery]);

  useEffect(() => {
    if (!cargando) {
      localStorage.setItem("proveedor_actual_payaya", proveedorSel);
    }
  }, [proveedorSel, cargando]);

  const pedidosActivosFiltrados = pedidosDB.filter((pedido) => {
    if (pedido.oculto === true) return false;
    if (pedido.recibido === true) {
      const ahora = new Date().getTime();
      const fechaRegistro = new Date(pedido.creado_en).getTime();
      const limiteOcultar = fechaRegistro + (72 * 60 * 60 * 1000);
      return ahora < limiteOcultar;
    }
    return true;
  });

  const ocultarGrupoProveedor = async (ids: number[]) => {
    if (!window.confirm("¿Ocultar este grupo del monitor?")) return;
    try {
      await Promise.all(ids.map(async (id) => {
        await supabase.from("pedidos").update({ oculto: true }).eq("id", id);
      }));
      await cargarPedidosDesdeBD();
    } catch (err) { alert("Error al ocultar"); }
  };

  const obtenerProductosMasPedidos = (): RankingItem[] => {
    const conteo: Record<string, { proveedor: string; total: number }> = {};
    pedidosDB.forEach(p => { 
      const key = p.producto.toUpperCase().trim();
      if (!conteo[key]) {
        conteo[key] = { proveedor: p.proveedor, total: 0 };
      }
      conteo[key].total += 1;
    });

    return Object.keys(conteo)
      .map(producto => ({
        producto,
        proveedor: conteo[producto].proveedor,
        totalPedidos: conteo[producto].total
      }))
      .sort((a, b) => b.totalPedidos - a.totalPedidos);
  };

  const exportarPDFIndividual = (provName: string, items: PedidoGuardadoDB[]) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text(`NOTA DE PEDIDO: ${provName.toUpperCase()}`, 14, 20);
    
    const opcionesFecha: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const fechaLegible = new Date().toLocaleDateString("es-ES", opcionesFecha);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado el: ${fechaLegible}`, 14, 27);

    // Añadida la columna de precio
    const tableColumn = ["Producto", "Cantidad", "Precio"];
    const tableRows = items.map(item => [
      item.producto.toUpperCase(),
      item.cantidad,
      item.precio ? `S/ ${Number(item.precio).toFixed(2)}` : "-"
    ]);

    autoTable(doc, {
      startY: 35,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 5 },
    });

    // Calcular y mostrar la suma total al final de la tabla
    const totalSuma = items.reduce((acc, item) => acc + Number(item.precio || 0), 0);
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.text(`MONTO TOTAL ESTIMADO: S/ ${totalSuma.toFixed(2)}`, 14, finalY);

    doc.save(`Pedido_${provName}_${new Date().toLocaleDateString("es-ES").replace(/\//g, '-')}.pdf`);
  };

  const manejarEnvioDirecto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!producto.trim() || !cantidad || isNaN(Number(cantidad)) || !proveedorSel) {
      alert("Completa los campos obligatorios correctamente");
      return;
    }
    
    setEnviando(true);
    try {
      const nombreFinal = tipoTransaccion === "BONO" ? `[BONO] ${producto.toUpperCase().trim()}` : producto.toUpperCase().trim();
      const cantidadFinal = `${cantidad} ${tipoPresentacion}`;
      const precioFinal = tipoTransaccion === "BONO" ? null : (precio ? parseFloat(precio) : null);

      const { data, error } = await supabase
        .from("pedidos")
        .insert([{
          proveedor: proveedorSel.toUpperCase(),
          producto: nombreFinal,
          cantidad: cantidadFinal,
          precio: precioFinal,
          creado_en: new Date().toISOString(),
        }])
        .select(); // Retornamos el dato insertado para obtener el ID

      if (error) throw error;
      
      // Reseteo del formulario
      setProducto("");
      setCantidad("");
      setPrecio("");
      setTipoTransaccion("COMPRA");
      setTipoPresentacion("UNIDADES");

      await cargarPedidosDesdeBD();
      
      // Feedback visual
      setExito(true);
      setTimeout(() => setExito(false), 2000);

      // Scroll inteligente hacia el nuevo pedido y resaltarlo
      if (data && data.length > 0) {
        const insertadoId = data[0].id;
        setNuevoPedidoId(insertadoId);
        
        // Damos un milisegundo para que React renderice el nuevo item antes de scrollear
        setTimeout(() => {
          const elemento = document.getElementById(`pedido-${insertadoId}`);
          if (elemento) {
            elemento.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 100);

        // Quitar el resaltado de color después de 3 segundos
        setTimeout(() => setNuevoPedidoId(null), 3000);
      }

      document.getElementById("input-producto")?.focus();
    } catch (err) {
      console.error(err);
      alert("Error al registrar el pedido.");
    } finally {
      setEnviando(false);
    }
  };

  const obtenerTextoEntrega = (diaEntregaStr: string) => {
    if (!diaEntregaStr) return 'N/A';
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const hoyIdx = new Date().getDay();
    const normalizar = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const diaNorm = normalizar(diaEntregaStr);
    const entregaIdx = dias.findIndex(d => normalizar(d) === diaNorm);

    if (entregaIdx === -1) return diaEntregaStr; 
    if (hoyIdx === entregaIdx) return "¡Hoy se entrega!";
    if ((hoyIdx + 1) % 7 === entregaIdx) return `Se entrega mañana ${diaEntregaStr}`;
    if ((hoyIdx - 1 + 7) % 7 === entregaIdx) return "Ayer se entregó el pedido";
    return `Día de entrega: ${diaEntregaStr}`;
  };

  // ---- FUNCIONES DEL MODAL DE EDICIÓN ----
  const abrirModalEdicion = (item: PedidoGuardadoDB) => {
    setPedidoAEditar(item);
    // Parseamos el nombre (quitando el tag de bono si queremos, o dejándolo. Lo dejaremos para que lo vea)
    setEditProducto(item.producto);
    
    // Parsear Cantidad y Formato ("10 PAQUETES" -> "10" y "PAQUETES")
    const match = item.cantidad.match(/^(\d+)\s+(.+)$/);
    if (match) {
      setEditCantidad(match[1]);
      setEditFormato(match[2]);
    } else {
      setEditCantidad(item.cantidad.replace(/\D/g, ""));
      setEditFormato("UNIDADES");
    }

    setEditPrecio(item.precio ? String(item.precio) : "");
  };

  const guardarEdicionPedido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pedidoAEditar) return;
    if (!editProducto.trim() || !editCantidad || isNaN(Number(editCantidad))) {
      alert("Revisa los campos obligatorios");
      return;
    }

    try {
      const { error } = await supabase
        .from("pedidos")
        .update({ 
          producto: editProducto.toUpperCase().trim(),
          cantidad: `${editCantidad} ${editFormato}`,
          precio: editPrecio ? parseFloat(editPrecio) : null
        })
        .eq("id", pedidoAEditar.id);

      if (error) throw error;
      
      setPedidoAEditar(null); // Cerrar Modal
      await cargarPedidosDesdeBD();
    } catch (err) {
      console.error(err);
      alert("No se pudo actualizar el registro.");
    }
  };
  // ----------------------------------------

  const marcarGrupoComoRecibido = async (provName: string, ids: number[]) => {
    try {
      await Promise.all(
        ids.map(async (id) => {
          const { error } = await supabase.from("pedidos").update({ recibido: true }).eq("id", id);
          if (error) throw error;
        })
      );
      await cargarPedidosDesdeBD();
    } catch (err) { console.error(err); }
  };

  const eliminarPedidoDB = async (id: number) => {
    const confirmar = window.confirm("¿Eliminar este producto del pedido?");
    if (!confirmar) return;
    try {
      const { error } = await supabase.from("pedidos").delete().eq("id", id);
      if (error) throw error;
      await cargarPedidosDesdeBD();
    } catch (err) { console.error(err); }
  };

  const revertirPedidoIndividual = async (id: number) => {
    try {
      const { error } = await supabase.from("pedidos").update({ recibido: false }).eq("id", id);
      if (error) throw error;
      await cargarPedidosDesdeBD();
    } catch (err) { console.error("Error al revertir:", err); }
  };

  const eliminarGrupoProveedorDB = async (provName: string, ids: number[]) => {
    const confirmar = window.confirm(`⚠️ ¿Estás seguro de eliminar TODO el bloque de pedidos de "${provName.toUpperCase()}" (${ids.length} productos)?`);
    if (!confirmar) return;
    try {
      await Promise.all(ids.map(async (id) => {
        const { error } = await supabase.from("pedidos").delete().eq("id", id);
        if (error) throw error;
      }));
      await cargarPedidosDesdeBD();
    } catch (err) { console.error(err); }
  };

  const revertirGrupoProveedorDB = async (provName: string, ids: number[]) => {
    try {
      await Promise.all(ids.map(async (id) => {
        const { error } = await supabase.from("pedidos").update({ recibido: false }).eq("id", id);
        if (error) throw error;
      }));
      await cargarPedidosDesdeBD();
    } catch (err) { console.error(err); }
  };

  const proveedoresFiltradosSelect = diaAbierto 
    ? proveedores.filter(p => p.dia_pedido?.toLowerCase() === diaAbierto.toLowerCase())
    : proveedores;

  const opcionesSelect = Array.from(new Set(proveedoresFiltradosSelect.map(p => p.nombre.toUpperCase()))).sort();

  if (cargando) return <div className="p-10 text-center font-black uppercase animate-pulse text-slate-400">Sincronizando...</div>;

  const proveedoresDelDiaActivo = proveedores.filter((p) => p.dia_pedido?.toLowerCase() === diaAbierto);
  const rankingMasPedidos = obtenerProductosMasPedidos();

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4 animate-in fade-in duration-500 relative">
      
      {/* CABECERA */}
      <div className="border-b border-slate-200 pb-4">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mb-1">Gestión</p>
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
           <span className="text-indigo-600">Proveedores</span>
        </h2>
      </div>

      {/* TABS DE DÍAS */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {diasSemana.map((dia) => {
            const cantidadProv = proveedores.filter((p) => p.dia_pedido?.toLowerCase() === dia).length;
            const esDiaActivo = diaAbierto === dia;

            return (
              <button
                key={dia}
                type="button"
                onClick={() => setDiaAbierto(diaAbierto === dia ? null : dia)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center group ${
                  esDiaActivo
                    ? "border-indigo-600 bg-indigo-50/60 ring-4 ring-indigo-100 text-indigo-950 font-black scale-[1.02]"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 font-bold"
                }`}
              >
                <span className="text-[11px] uppercase tracking-wider italic">{dia}</span>
                <span className={`text-[9px] mt-1 px-2 py-0.5 rounded-md font-black uppercase ${
                  esDiaActivo ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  {cantidadProv} {cantidadProv === 1 ? "Prov" : "Provs"}
                </span>
              </button>
            );
          })}
        </div>

        {/* PROVEEDORES DEL DÍA */}
        {diaAbierto && (
          <div className="p-5 bg-slate-50 border-2 border-indigo-600 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-200/60 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
                <p className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                  Proveedores del <span className="underline italic text-indigo-600">{diaAbierto}</span>:
                </p>
              </div>
              <button 
                onClick={() => setDiaAbierto(null)}
                className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-700 bg-white px-2 py-1 rounded-md border"
              >
                Cerrar Panel ✕
              </button>
            </div>

            {proveedoresDelDiaActivo.length === 0 ? (
              <p className="text-xs font-bold text-slate-400 uppercase py-4 text-center bg-white rounded-xl border border-dashed border-slate-200">
                No hay proveedores programados para este día
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {proveedoresDelDiaActivo.map((p) => (
                  <div 
                    key={p.id} 
                    onClick={() => {
                      setProveedorSel(p.nombre);
                      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs flex flex-col justify-between gap-3 ${
                      proveedorSel === p.nombre 
                        ? 'bg-indigo-100 border-indigo-600 ring-4 ring-indigo-50 scale-[1.01]'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 border-b border-slate-100/50 pb-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${p.color} shrink-0`}></div>
                      <h3 className="font-black text-slate-900 uppercase text-xs tracking-tight truncate">{p.nombre}</h3>
                    </div>
                    
                    <div className="space-y-1.5 text-left bg-white/60 p-2 rounded-lg border border-slate-100/50 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-500 uppercase text-[10px]">Pedido:</span>
                        <span className="font-black text-slate-800 uppercase italic bg-white px-2 py-0.5 rounded border border-slate-200">{p.dia_pedido}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-indigo-500 uppercase text-[10px]">Entrega:</span>
                        <span className="font-black text-indigo-700 uppercase italic bg-white/50 px-2 py-0.5 rounded border border-indigo-100">{p.dia_entrega}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ÁREA DE TRABAJO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* FORMULARIO */}
        <form 
          ref={formRef}
          onSubmit={manejarEnvioDirecto} 
          className={`lg:col-span-4 p-6 rounded-[2rem] shadow-md border h-fit transition-all duration-300 ${
            exito ? 'bg-emerald-50 border-emerald-500 ring-4 ring-emerald-100 scale-[1.02]' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className={`text-lg font-black uppercase italic tracking-tighter ${exito ? 'text-emerald-700' : 'text-slate-900'}`}>
              {exito ? '✓ ENVIADO CON ÉXITO' : '🚀 Registrar Pedido'}
            </h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-900 uppercase ml-3 mb-1.5 tracking-widest">
                Proveedor Seleccionado
              </label>
              <select
                value={proveedorSel}
                onChange={(e) => setProveedorSel(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-100 border-2 border-transparent focus:border-indigo-500 rounded-xl text-sm font-bold text-slate-900 outline-none cursor-pointer"
              >
                <option value="">-- SELECCIONAR PROVEEDOR --</option>
                {opcionesSelect.map(nombre => (
                  <option key={nombre} value={nombre}>{nombre}</option>
                ))}
              </select>
            </div>

            <div className="col-span-1"> {/* Ocupa toda la fila en móvil, 1/2 en PC */}
            <label className="block text-[10px] font-black text-slate-900 uppercase ml-3 mb-1.5 tracking-widest">
              Tipo de Ingreso
            </label>
            <select
              value={tipoTransaccion}
              onChange={(e) => setTipoTransaccion(e.target.value)}
              className="w-full px-4 py-3.5 bg-slate-100 border-2 border-transparent focus:border-indigo-500 rounded-xl text-sm font-bold text-slate-900 outline-none cursor-pointer"
            >
              <option value="COMPRA">🛒 COMPRA</option>
              <option value="BONO">🎁 BONO</option>
            </select>
          </div>

            <div>
              <label className="block text-[10px] font-black text-slate-900 uppercase ml-3 mb-1.5 tracking-widest">Producto</label>
              <input
                id="input-producto"
                type="text"
                value={producto}
                onChange={(e) => setProducto(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-100 border-2 border-transparent focus:border-indigo-500 rounded-xl text-sm font-bold text-slate-900 outline-none"
              />
            </div>

            {/* Si es BONO, ocultamos el precio dinámicamente */}
              {tipoTransaccion !== "BONO" && (
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-black text-slate-900 uppercase ml-3 mb-1.5 tracking-widest">Precio</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 font-black text-slate-400 text-sm">S/</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.10"
                      value={precio}
                      onChange={(e) => setPrecio(e.target.value)}
                      className="w-full pl-8 pr-4 py-3.5 bg-slate-100 border-2 border-transparent focus:border-indigo-500 rounded-xl text-sm font-bold text-slate-900 outline-none"
                    />
                  </div>
                </div>
              )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-black text-slate-900 uppercase ml-3 mb-1.5 tracking-widest">Cantidad</label>
                <input
                  type="number"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  min="1"
                  className="w-full px-4 py-3.5 bg-slate-100 border-2 border-transparent focus:border-indigo-500 rounded-xl text-sm font-bold text-slate-900 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-900 uppercase ml-3 mb-1.5 tracking-widest">Formato</label>
                <select
                  value={tipoPresentacion}
                  onChange={(e) => setTipoPresentacion(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-100 border-2 border-transparent focus:border-indigo-500 rounded-xl text-sm font-bold text-slate-900 outline-none cursor-pointer"
                >
                  <option value="UNIDADES">UNIDADES</option>
                  <option value="PAQUETES">PAQUETES</option>
                </select>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={enviando || exito}
              className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-md transition-all ${
                exito 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95 disabled:opacity-50'
              }`}
            >
              {enviando ? "Guardando..." : exito ? "¡Guardado!" : "Enviar a Base de Datos ↑"}
            </button>
          </div>
        </form>

        {/* MONITOR ACTIVO */}
        <div className="lg:col-span-8 bg-slate-900 p-6 rounded-[2rem] shadow-xl text-white flex flex-col">
          <div className="flex items-center gap-2 mb-5 border-b border-white/10 pb-4">
            <span className="text-xl animate-pulse">📊</span>
            <h3 className="text-lg font-black uppercase italic tracking-tighter">Monitoreo de Pedidos en Curso</h3>
          </div>

          <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2">
            {pedidosActivosFiltrados.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center opacity-25">
                <span className="text-4xl mb-2">📡</span>
                <p className="text-[11px] uppercase tracking-widest font-black">La base de datos está limpia</p>
                <p className="text-[10px] mt-1 italic">Agrega pedidos para visualizarlos aquí</p>
              </div>
            ) : (
              // AGRUPAR POR PROVEEDOR
              Object.entries(
                pedidosActivosFiltrados.reduce((acc, p) => {
                  acc[p.proveedor] = [...(acc[p.proveedor] || []), p];
                  return acc;
                }, {} as Record<string, PedidoGuardadoDB[]>)
              ).map(([provName, items]) => {
                const provBD = proveedores.find(p => p.nombre.toUpperCase() === provName.toUpperCase());
                const colorHex = provBD?.color || "bg-slate-500";
                const linkCat = provBD?.catalogo_link;
                const totalPedidoProv = items.reduce((sum, item) => sum + (item.precio || 0), 0);
                
                return (
                  <div key={provName} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-700/50">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${colorHex}`}></div>
                        <div>
                          <h4 className="font-black text-sm uppercase tracking-wider">{provName}</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase italic mt-0.5">
                            {obtenerTextoEntrega(provBD?.dia_entrega || "")}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {linkCat && (
                          <a href={linkCat} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 font-black text-[10px] uppercase tracking-wider hover:bg-indigo-500 hover:text-white transition-colors border border-indigo-500/30">
                            Ver Catálogo
                          </a>
                        )}
                        <button onClick={() => exportarPDFIndividual(provName, items)} className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-black text-[10px] uppercase tracking-wider hover:bg-emerald-500 hover:text-white transition-colors border border-emerald-500/30">
                          Exportar a PDF
                        </button>
                        <button onClick={() => marcarGrupoComoRecibido(provName, items.map(i => i.id))} className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 font-black text-[10px] uppercase tracking-wider hover:bg-blue-500 hover:text-white transition-colors border border-blue-500/30">
                          Todo Recibido
                        </button>
                        <button onClick={() => eliminarGrupoProveedorDB(provName, items.map(i => i.id))} className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 font-black text-[10px] uppercase tracking-wider hover:bg-red-500 hover:text-white transition-colors border border-red-500/30">
                          Eliminar Bloque
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {items.map(item => {
                        const esBono = item.producto.includes("[BONO]");
                        const fueRecibido = item.recibido;
                        // Estilos de resaltado si acaba de ser añadido
                        const esNuevo = item.id === nuevoPedidoId;

                        return (
                          <div 
                            key={item.id} 
                            id={`pedido-${item.id}`} // IMPORTANTE PARA EL AUTO SCROLL
                            className={`flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg border border-slate-700 group transition-all duration-300 ${
                              fueRecibido 
                                ? 'bg-slate-900/80 border-slate-800 opacity-60' 
                                : esNuevo
                                ? 'bg-emerald-500/20 border-emerald-400 ring-2 ring-emerald-500 scale-[1.01]'
                                : 'bg-slate-900/40 hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {fueRecibido && <span className="text-[10px]">✅</span>}
                              {!fueRecibido && esBono && <span className="text-[10px]">🎁</span>}
                              <span className={`font-black text-xs uppercase ${fueRecibido ? 'line-through text-slate-500' : esBono ? 'text-indigo-400' : 'text-slate-200'}`}>
                                {item.cantidad} - {item.producto} {item.precio && !esBono ? `| S/ ${item.precio}` : ''}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 mt-2 sm:mt-0 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                              {!fueRecibido ? (
                                <>
                                  <button onClick={() => abrirModalEdicion(item)} className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-[9px] font-black uppercase hover:bg-slate-600 transition-colors">✏️ Editar</button>
                                  <button onClick={() => eliminarPedidoDB(item.id)} className="px-2 py-1 bg-red-900/50 text-red-300 rounded text-[9px] font-black uppercase hover:bg-red-800 transition-colors">🗑️ Borrar</button>
                                </>
                              ) : (
                                <button onClick={() => revertirPedidoIndividual(item.id)} className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-[9px] font-black uppercase hover:bg-slate-600 transition-colors">🔄 Deshacer Recibido</button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {totalPedidoProv > 0 && (
                        <div className="text-right px-2 py-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Suma Estimada: </span>
                          <span className="text-[11px] text-white font-black">S/ {totalPedidoProv.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* --- MODAL DE EDICIÓN FLOTANTE --- */}
      {pedidoAEditar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setPedidoAEditar(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2"
            >
              ✕
            </button>
            
            <h3 className="text-xl font-black text-slate-900 uppercase italic mb-5">✏️ Editar Pedido</h3>
            
            <form onSubmit={guardarEdicionPedido} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase ml-2 mb-1">Producto</label>
                <input
                  type="text"
                  value={editProducto}
                  onChange={(e) => setEditProducto(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-sm font-bold text-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase ml-2 mb-1">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={editCantidad}
                    onChange={(e) => setEditCantidad(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-sm font-bold text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase ml-2 mb-1">Formato</label>
                  <select
                    value={editFormato}
                    onChange={(e) => setEditFormato(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-sm font-bold text-slate-900 outline-none cursor-pointer"
                  >
                    <option value="UNIDADES">UNIDADES</option>
                    <option value="PAQUETES">PAQUETES</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase ml-2 mb-1">Precio (S/)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editPrecio}
                  onChange={(e) => setEditPrecio(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl text-sm font-bold text-slate-900 outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setPedidoAEditar(null)}
                  className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-md"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RANKING GLOBALES */}
      <div className="bg-white border border-slate-200 p-6 rounded-[2rem]">
        {/* Código existente del ranking... */}
        <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider mb-4 border-b pb-2 flex justify-between items-center">
          <span>🏆 Top Productos Más Pedidos</span>
        </h3>
        <div className="flex flex-wrap gap-2">
          {rankingMasPedidos.slice(0, 10).map((item, i) => (
            <div key={i} className="flex items-center bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
              <span className="font-black text-indigo-600 mr-2 text-[10px]">#{i+1}</span>
              <span className="font-bold text-slate-700 mr-2 uppercase">{item.producto}</span>
              <span className="bg-slate-200 px-1.5 py-0.5 rounded text-[9px] font-black text-slate-600">{item.totalPedidos}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Proveedores() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-black">Cargando módulo...</div>}>
      <ProveedoresContent />
    </Suspense>
  );
}