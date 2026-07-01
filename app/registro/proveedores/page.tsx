"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase"; 
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ProveedorDB {
  id: number;
  nombre: string; 
  color: string; 
  dia_pedido: string; 
  dia_entrega: string; 
  catalogo_link?: string;
  orden?: number;
}

interface PedidoGuardadoDB {
  id: number; 
  proveedor: string;
  producto: string;
  cantidad: string; 
  precio?: number; 
  creado_en: string; 
  recibido?: boolean; 
  oculto?: boolean;
  orden?: number;
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
  const [precio, setPrecio] = useState(""); 
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false); 
  const [nuevoPedidoId, setNuevoPedidoId] = useState<number | null>(null);
  
  const [tipoTransaction, setTipoTransaccion] = useState("COMPRA");
  const [tipoPresentacion, setTipoPresentacion] = useState("UNIDADES");
  const [diaAbierto, setDiaAbierto] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [pedidoAEditar, setPedidoAEditar] = useState<PedidoGuardadoDB | null>(null);
  
  const [expandedProvs, setExpandedProvs] = useState<Set<string>>(new Set());
  const [editProducto, setEditProducto] = useState("");
  const [editCantidad, setEditCantidad] = useState("");
  const [editFormato, setEditFormato] = useState("UNIDADES");
  const [editPrecio, setEditPrecio] = useState("");
  const diasSemana = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const hoyDia = new Date().toLocaleDateString('es-ES', { weekday: 'long' }).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  const dragProvItem = useRef<string | null>(null);
  const dragProvOverItem = useRef<string | null>(null);
  const dragRowItem = useRef<number | null>(null);
  const dragRowOverItem = useRef<number | null>(null);

  const cargarPedidosDesdeBD = async () => {
    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .order("orden", { ascending: true })
      .order("creado_en", { ascending: false });
    if (!error) setPedidosDB(data || []);
  };

  const cargarProveedoresDesdeBD = async () => {
    const { data, error } = await supabase
      .from("proveedores")
      .select("*")
      .order("orden", { ascending: true })
      .order("nombre", { ascending: true });
    if (!error && data) setProveedores(data);
    return data;
  };

  useEffect(() => {
    const inicializarDatos = async () => {
      const provsData = await cargarProveedoresDesdeBD();
      const proveedorGuardado = localStorage.getItem("proveedor_actual_payaya");

      if (provsData) {
        if (proveedorQuery) {
          const existe = provsData.find(p => p.nombre.toLowerCase() === proveedorQuery.toLowerCase());
          if (existe) setProveedorSel(existe.nombre);
        } else if (proveedorGuardado) {
          setProveedorSel(proveedorGuardado);
        }
      }
      setDiaAbierto(null);
      await cargarPedidosDesdeBD();
      setCargando(false);
    };

    inicializarDatos();

    const channel = supabase.channel('realtime-bd-cambios')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
        cargarPedidosDesdeBD();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proveedores' }, () => {
        cargarProveedoresDesdeBD();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const proveedoresConPedidos = new Set(
    pedidosActivosFiltrados.filter(p => !p.recibido).map(p => p.proveedor.toUpperCase())
  );

  const toggleCollapse = (provName: string) => {
    setExpandedProvs(prev => {
      const next = new Set(prev);
      if (next.has(provName)) next.delete(provName);
      else next.add(provName);
      return next;
    });
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
    const tableColumn = ["#", "Producto", "Cantidad", "Precio"];
    const tableRows = items.map((item, index) => [
      index + 1,
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
      const nombreFinal = tipoTransaction === "BONO" ?
        `[BONO] ${producto.toUpperCase().trim()}` : producto.toUpperCase().trim();
      const cantidadFinal = `${cantidad} ${tipoPresentacion}`;
      const precioFinal = tipoTransaction === "BONO" ? null : (precio ? parseFloat(precio) : null);

      const { data, error } = await supabase
        .from("pedidos")
        .insert([{
          proveedor: proveedorSel.toUpperCase(),
          producto: nombreFinal,
          cantidad: cantidadFinal,
          precio: precioFinal,
          creado_en: new Date().toISOString(),
          orden: 999 
        }])
        .select();

      if (error) throw error;
      const insertadoId = data[0].id;
      setNuevoPedidoId(insertadoId);

      await cargarPedidosDesdeBD();
      
      setProducto("");
      setCantidad("");
      setPrecio("");
      setTipoTransaccion("COMPRA");
      setTipoPresentacion("UNIDADES");
      setExito(true);
      setTimeout(() => setExito(false), 2000);
      setTimeout(() => {
        const elemento = document.getElementById(`pedido-${insertadoId}`);
        if (elemento) {
          elemento.scrollIntoView({ behavior: "smooth", block: "center" });
          elemento.classList.add('ring-4', 'ring-emerald-400');
          setTimeout(() => elemento.classList.remove('ring-4', 'ring-emerald-400'), 1500);
        }
      }, 400);
      setTimeout(() => setNuevoPedidoId(null), 3000);
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
    if (hoyIdx === entregaIdx) return `¡Hoy ${diaNorm} se entrega!`;
    if ((hoyIdx + 1) % 7 === entregaIdx) return `Se entrega mañana ${diaNorm}`;
    if ((hoyIdx - 1 + 7) % 7 === entregaIdx) return `Ayer ${diaNorm} se entregó el pedido`;
    return `Día de entrega: ${diaEntregaStr}`;
  };

  const abrirModalEdicion = (item: PedidoGuardadoDB) => {
    setPedidoAEditar(item);
    setEditProducto(item.producto);
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
      setPedidoAEditar(null);
      await cargarPedidosDesdeBD();
    } catch (err) {
      console.error(err);
      alert("No se pudo actualizar el registro.");
    }
  };

  const toggleGrupoRecibido = async (provName: string, items: PedidoGuardadoDB[]) => {
    const todosRecibidos = items.every(i => i.recibido);
    const nuevoEstado = !todosRecibidos; 

    try {
      await Promise.all(
        items.map(async (item) => {
          const { error } = await supabase.from("pedidos").update({ recibido: nuevoEstado }).eq("id", item.id);
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

  // Función unificada para guardar el nuevo orden de proveedores en Base de Datos y Localmente
  const actualizarOrdenProveedoresBD = async (nuevoOrdenNombres: string[]) => {
    const copiaProveedores = [...proveedores];
    const proveedoresActualizados = copiaProveedores.map(p => {
      const idx = nuevoOrdenNombres.indexOf(p.nombre.toUpperCase());
      return idx !== -1 ? { ...p, orden: idx } : p;
    }).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
    
    setProveedores(proveedoresActualizados);

    try {
      await Promise.all(nuevoOrdenNombres.map(async (provName, index) => {
        await supabase
          .from("proveedores")
          .update({ orden: index })
          .ilike("nombre", provName); 
      }));
      
      await cargarProveedoresDesdeBD();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSortProviders = async () => {
    if (!dragProvItem.current || !dragProvOverItem.current || dragProvItem.current === dragProvOverItem.current) return;
    
    const ordenActual = Array.from(new Set(pedidosActivosFiltrados.map(p => p.proveedor.toUpperCase())))
      .sort((a, b) => {
        const provA = proveedores.find(p => p.nombre.toUpperCase() === a);
        const provB = proveedores.find(p => p.nombre.toUpperCase() === b);
        return (provA?.orden || 0) - (provB?.orden || 0);
      });

    const itemA = dragProvItem.current;
    const itemB = dragProvOverItem.current;

    const indexA = ordenActual.indexOf(itemA);
    const indexB = ordenActual.indexOf(itemB);

    if (indexA !== -1 && indexB !== -1) {
      ordenActual.splice(indexA, 1);
      ordenActual.splice(indexB, 0, itemA);
      await actualizarOrdenProveedoresBD(ordenActual);
    }
    dragProvItem.current = null;
    dragProvOverItem.current = null;
  };

  // Mover Proveedores por Flechas (Mobile Friendly)
  const moverProveedorDireccion = async (provName: string, direccion: "SUBIR" | "BAJAR") => {
    const ordenActual = Array.from(new Set(pedidosActivosFiltrados.map(p => p.proveedor.toUpperCase())))
      .sort((a, b) => {
        const provA = proveedores.find(p => p.nombre.toUpperCase() === a);
        const provB = proveedores.find(p => p.nombre.toUpperCase() === b);
        return (provA?.orden || 0) - (provB?.orden || 0);
      });

    const index = ordenActual.indexOf(provName.toUpperCase());
    if (index === -1) return;

    if (direccion === "SUBIR" && index > 0) {
      const temp = ordenActual[index];
      ordenActual[index] = ordenActual[index - 1];
      ordenActual[index - 1] = temp;
      await actualizarOrdenProveedoresBD(ordenActual);
    } else if (direccion === "BAJAR" && index < ordenActual.length - 1) {
      const temp = ordenActual[index];
      ordenActual[index] = ordenActual[index + 1];
      ordenActual[index + 1] = temp;
      await actualizarOrdenProveedoresBD(ordenActual);
    }
  };

  const handleSortRows = async (provName: string) => {
    if (!dragRowItem.current || !dragRowOverItem.current || dragRowItem.current === dragRowOverItem.current) return;
    let itemsProv = pedidosActivosFiltrados.filter(p => p.proveedor.toUpperCase() === provName.toUpperCase());
    
    const indexA = itemsProv.findIndex(p => p.id === dragRowItem.current);
    const indexB = itemsProv.findIndex(p => p.id === dragRowOverItem.current);

    if (indexA !== -1 && indexB !== -1) {
      const itemMovido = itemsProv.splice(indexA, 1)[0];
      itemsProv.splice(indexB, 0, itemMovido);

      const nuevosPedidos = [...pedidosDB];
      itemsProv.forEach((item, index) => {
        const i = nuevosPedidos.findIndex(p => p.id === item.id);
        if (i > -1) nuevosPedidos[i].orden = index;
      });
      setPedidosDB(nuevosPedidos);

      try {
        await Promise.all(itemsProv.map(async (item, index) => {
          await supabase.from("pedidos").update({ orden: index }).eq("id", item.id);
        }));
        await cargarPedidosDesdeBD(); 
      } catch (e) { console.error(e); }
    }
    dragRowItem.current = null;
    dragRowOverItem.current = null;
  };

  const proveedoresFiltradosSelect = diaAbierto 
    ? proveedores.filter(p => p.dia_pedido?.toLowerCase() === diaAbierto.toLowerCase())
    : proveedores;

  const opcionesSelect = Array.from(
    new Set(
      proveedoresFiltradosSelect
        .filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
        .map(p => p.nombre.toUpperCase())
    )
  ).sort();

  const proveedoresMostrados = proveedores.filter((p) => {
    const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const coincideDia = diaAbierto ? p.dia_pedido?.toLowerCase() === diaAbierto : true;
    return coincideBusqueda && coincideDia;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-2 animate-in fade-in duration-500 relative">
      
      {/* CABECERA */}
      <div className="border-b border-slate-200 pb-4">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mb-1">Gestión</p>
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
           <span className="text-indigo-600">Proveedores</span>
        </h2>
      </div>

      {/* TABS DE DÍAS */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {diasSemana.map((dia) => {
            const cantidadProv = proveedores.filter((p) => p.dia_pedido?.toLowerCase() === dia).length;
            const esDiaActivo = diaAbierto === dia;
            const esHoy = hoyDia === dia.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            return (
              <button
                key={dia}
                type="button"
                onClick={() => setDiaAbierto(diaAbierto === dia ? null : dia)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center group ${
                  esDiaActivo
                    ? "border-indigo-600 bg-indigo-50/60 ring-4 ring-indigo-100 text-indigo-950 font-black scale-[1.02]"
                    : esHoy 
                      ? "border-emerald-500 border-2 shadow-sm bg-white text-slate-700 font-black"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 font-bold"
                }`}
              >
                <span className={`text-[11px] uppercase tracking-wider italic ${esHoy && !esDiaActivo ? 'text-emerald-600' : ''}`}>
                  {dia}
                </span>
                <span className={`text-[9px] mt-1 px-2 py-0.5 rounded-md font-black uppercase ${
                  esDiaActivo ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  {cantidadProv} {cantidadProv === 1 ? "Prov" : "Provs"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="w-full bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
          <span className="pl-2 text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Buscar proveedor por nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="flex-1 pr-4 py-2 bg-transparent text-sm font-bold text-slate-900 placeholder-slate-400 outline-none"
          />
          {busqueda && (
            <button 
              onClick={() => setBusqueda("")}
              className="px-2 py-1 text-[10px] font-black bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 uppercase shrink-0"
            >
              Limpiar
            </button>
          )}
        </div>

        {(diaAbierto || busqueda) && (
          <div className="p-5 bg-slate-50 border-2 border-indigo-600 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-200/60 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
                <p className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                  {busqueda ? `Resultados para "${busqueda}"` : `Proveedores del lunes a sábado` }
                  {diaAbierto && <> en <span className="underline italic text-indigo-600">{diaAbierto}</span></>}:
                </p>
              </div>
              <button 
                onClick={() => { setDiaAbierto(null); setBusqueda(""); }}
                className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-700 bg-white px-2 py-1 rounded-md border"
              >
                Limpiar Filtros ✕
              </button>
            </div>

            {proveedoresMostrados.length === 0 ? (
              <p className="text-xs font-bold text-slate-400 uppercase py-4 text-center bg-white rounded-xl border border-dashed border-slate-200">
                No se encontraron proveedores con ese filtro
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {proveedoresMostrados.map((p) => {
                  const tienePedidoActivo = proveedoresConPedidos.has(p.nombre.toUpperCase());
                  
                  return (
                    <div 
                      key={p.id} 
                      onClick={() => {
                        setProveedorSel(p.nombre);
                        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs flex flex-col justify-between gap-3 ${
                        proveedorSel === p.nombre 
                          ? 'bg-indigo-100 border-indigo-600 ring-4 ring-indigo-50 scale-[1.01]'
                          : tienePedidoActivo 
                            ? 'bg-emerald-50 border-emerald-400 hover:border-emerald-500' 
                            : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-start border-b border-slate-100/50 pb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${p.color} shrink-0`}></div>
                          <h3 className={`font-black uppercase text-xs tracking-tight ${tienePedidoActivo ? 'text-emerald-800' : 'text-slate-900'}`}>
                            {p.nombre}
                          </h3>
                        </div>

                        {p.catalogo_link && (
                          <a 
                            href={p.catalogo_link} 
                            target="_blank" 
                            rel="noreferrer" 
                            onClick={(e) => e.stopPropagation()} 
                            className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-[9px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-colors border border-indigo-200"
                          >
                            Catálogo
                          </a>
                        )}
                      </div>
               
                      <div className={`space-y-1.5 text-left p-2 rounded-lg border text-xs ${tienePedidoActivo ? 'bg-emerald-100/50 border-emerald-200' : 'bg-white/60 border-slate-100/50'}`}>
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
                  );
                })}
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
              <label className="block text-[10px] font-black text-slate-900 uppercase ml-3 mb-1.5 tracking-widest">Proveedor Seleccionado</label>
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

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-black text-slate-900 uppercase ml-3 mb-1.5 tracking-widest">Formato</label>
                <select
                  value={tipoPresentacion}
                  onChange={(e) => setTipoPresentacion(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-100 border-2 border-transparent focus:border-indigo-500 rounded-xl text-sm font-bold text-slate-900 outline-none cursor-pointer"
                >
                  <option value="UNIDADES">UNIDADES</option>
                  <option value="PAQUETES">PAQUETES</option>
                  <option value="CAJETILLAS">CAJETILLAS</option>
                  <option value="CAJA">CAJA</option>
                </select>
              </div>
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
            </div>

            <div className={`grid ${tipoTransaction === "BONO" ? "grid-cols-1" : "grid-cols-2"} gap-2 transition-all duration-300`}>
              <div className="col-span-1">
                <label className="block text-[10px] font-black text-slate-900 uppercase ml-3 mb-1.5 tracking-widest">Tipo de Ingreso</label>
                <select
                  value={tipoTransaction}
                  onChange={(e) => setTipoTransaccion(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-100 border-2 border-transparent focus:border-indigo-500 rounded-xl text-sm font-bold text-slate-900 outline-none cursor-pointer"
                >
                  <option value="COMPRA">🛒 COMPRA</option>
                  <option value="BONO">🎁 BONO</option>
                </select>
              </div>

              {tipoTransaction !== "BONO" && (
                <div className="col-span-1 animate-in fade-in zoom-in duration-300">
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
              {enviando ? "Guardando..." : exito ? "¡Guardado!" : "Pedir ↑"}
            </button>
          </div>
        </form>

        {/* MONITOR ACTIVO */}
        <div className="lg:col-span-8 bg-slate-900 p-5 rounded-[2rem] shadow-xl text-white flex flex-col">
          <div className="flex items-center gap-2 mb-5 border-b border-white/10 pb-4">
            <span className="text-xl animate-pulse">📊</span>
            <h3 className="text-lg font-black uppercase italic tracking-tighter">Monitoreo</h3>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {pedidosActivosFiltrados.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center opacity-25">
                <span className="text-4xl mb-2">📡</span>
                <p className="text-[11px] uppercase tracking-widest font-black">La base de datos está limpia</p>
                <p className="text-[10px] mt-1 italic">Agrega pedidos para visualizarlos aquí</p>
              </div>
            ) : (
              Array.from(new Set(pedidosActivosFiltrados.map(p => p.proveedor.toUpperCase())))
              .sort((a, b) => {
                const provA = proveedores.find(p => p.nombre.toUpperCase() === a);
                const provB = proveedores.find(p => p.nombre.toUpperCase() === b);
                return (provA?.orden || 0) - (provB?.orden || 0);
              })
              .map((provName, idx, arr) => {
                const items = pedidosActivosFiltrados.filter(p => p.proveedor.toUpperCase() === provName);
                const provBD = proveedores.find(p => p.nombre.toUpperCase() === provName.toUpperCase());
                const colorHex = provBD?.color || "bg-slate-500";
                const linkCat = provBD?.catalogo_link;
                const totalPedidoProv = items.reduce((sum, item) => sum + (item.precio || 0), 0);
                const isExpanded = expandedProvs.has(provName);

                return (
                  <div 
                    key={provName} 
                    draggable
                    onDragStart={() => { dragProvItem.current = provName; }}
                    onDragEnter={() => { dragProvOverItem.current = provName; }}
                    onDragEnd={handleSortProviders}
                    onDragOver={(e) => e.preventDefault()}
                    className="bg-slate-800/50 p-4 rounded-xl border border-slate-600 hover:border-slate-400 transition-colors"
                  >
                    <div 
                      onClick={() => {
                        setProveedorSel(provName);
                        toggleCollapse(provName);
                        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isExpanded ? 'mb-3 pb-3 border-b border-slate-700/50' : ''} group cursor-pointer`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Selector de arrastre + Botones móviles arriba/abajo */}
                        <div className="flex items-center gap-1 bg-slate-700/30 p-1.5 rounded-lg border border-slate-600/40" onClick={(e) => e.stopPropagation()}>
                          {/*<div className="text-slate-400 cursor-grab active:cursor-grabbing px-1 text-xs" title="Arrastrar">☰</div>*/}
                          <button 
                            disabled={idx === 0}
                            onClick={() => moverProveedorDireccion(provName, "SUBIR")}
                            className="text-[10px] text-slate-300 hover:bg-slate-600 w-5 h-5 flex items-center justify-center rounded disabled:opacity-30 transition-colors"
                            title="Subir"
                          >
                            ▲
                          </button>
                          <button 
                            disabled={idx === arr.length - 1}
                            onClick={() => moverProveedorDireccion(provName, "BAJAR")}
                            className="text-[10px] text-slate-300 hover:bg-slate-600 w-5 h-5 flex items-center justify-center rounded disabled:opacity-30 transition-colors"
                            title="Bajar"
                          >
                            ▼
                          </button>
                        </div>
                        {/*
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCollapse(provName);
                          }} 
                          className="text-slate-400 hover:text-white bg-slate-700/50 rounded p-1 w-6 h-6 flex items-center justify-center transition-colors border border-slate-600"
                          title={!isExpanded ? "Expandir" : "Contraer"}
                        >
                          {!isExpanded ? "▶" : "▼"}
                        </button>
                        */}

                        <div className={`w-3 h-3 rounded-full ${colorHex}`}></div>
                        <div>
                          <h4 className="font-black text-sm uppercase tracking-wider group-hover:text-indigo-400 transition-colors">{provName}</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase italic mt-0.5">
                            {obtenerTextoEntrega(provBD?.dia_entrega || "")} {!isExpanded && `(${items.length} prod.)`}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                        {linkCat && (
                          <a title="VER CATÁLOGO" href={linkCat} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 font-black text-[9px] uppercase tracking-wider hover:bg-indigo-500 hover:text-white transition-colors border border-indigo-500/30">
                            Catálogo
                          </a>
                        )}
                        <button title="EXPORTAR PDF" onClick={() => exportarPDFIndividual(provName, items)} className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-black text-[10px] uppercase tracking-wider hover:bg-emerald-500 hover:text-white transition-colors border border-emerald-500/30">
                          📄 PDF
                        </button>
                        <button title={items.every(i => i.recibido) ? "DESMARCAR TODO" : "MARCAR TODO"} onClick={() => toggleGrupoRecibido(provName, items)} className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 font-black text-[10px] uppercase tracking-wider hover:bg-blue-500 hover:text-white transition-colors border border-blue-500/30">
                          {items.every(i => i.recibido) ? '↩️' : '✅'}
                        </button>
                        <button title="ELIMINAR" onClick={() => eliminarGrupoProveedorDB(provName, items.map(i => i.id))} className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 font-black text-[10px] uppercase tracking-wider hover:bg-red-500 hover:text-white transition-colors border border-red-500/30">
                          🗑️
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="space-y-1.5 overflow-x-auto mt-2 animate-in fade-in duration-200">
                        <table className="w-full text-left border-collapse">
                          <tbody>
                            {items.map(item => {
                              const esBono = item.producto.includes("[BONO]");
                              const fueRecibido = item.recibido;
                              const esNuevo = item.id === nuevoPedidoId;
                              return (
                                <tr 
                                  key={item.id}
                                  id={`pedido-${item.id}`}
                                  draggable
                                  onDragStart={(e) => { e.stopPropagation(); dragRowItem.current = item.id; }}
                                  onDragEnter={(e) => { e.stopPropagation(); dragRowOverItem.current = item.id; }}
                                  onDragEnd={(e) => { e.stopPropagation(); handleSortRows(provName); }}
                                  onDragOver={(e) => e.preventDefault()}
                                  className={`group transition-all duration-300 cursor-move border-b border-slate-700/50 last:border-0 ${
                                    fueRecibido 
                                      ? 'bg-emerald-900/20 border-emerald-800' 
                                      : esNuevo 
                                        ? 'bg-emerald-500/20 border-emerald-400' 
                                        : 'bg-slate-900/40 hover:bg-slate-800'
                                  }`}
                                >
                                  <td className="p-2 w-8 text-slate-600">☰</td>
                                  <td className="p-2">
                                    <div className="flex items-center gap-2">
                                      {!fueRecibido && !esBono && <span className="text-[10px]">🛒</span>}
                                      {!fueRecibido && esBono && <span className="text-[10px]">🎁</span>}
                                      <span className={`font-black text-xs uppercase ${fueRecibido ? 'text-emerald-400' : esBono ? 'text-purple-400' : 'text-slate-200'}`}>
                                        {item.cantidad} - {item.producto}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-2 text-right">
                                    <span className={`font-black text-xs uppercase ${fueRecibido ? 'text-emerald-400' : 'text-slate-200'}`}>
                                      {item.precio && !esBono ? `S/ ${item.precio}` : ''}
                                    </span>
                                  </td>
                                  <td className="p-2 w-24 text-right opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => abrirModalEdicion(item)} className="px-2 py-1 mr-1 bg-slate-700 text-slate-300 rounded text-[9px] font-black uppercase hover:bg-slate-600">✏️</button>
                                    <button onClick={() => eliminarPedidoDB(item.id)} className="px-2 py-1 bg-red-900/50 text-red-300 rounded text-[9px] font-black uppercase hover:bg-red-800">🗑️</button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {totalPedidoProv > 0 && (
                      <div className={`text-right px-2 pt-2 pb-1 mt-2 ${isExpanded ? 'border-t border-slate-700' : ''}`}>
                        <span className="text-[11px] text-slate-400 font-bold uppercase">Suma Estimada: </span>
                        <span className="text-[13px] text-white font-black">S/ {totalPedidoProv.toFixed(2)}</span>
                      </div>
                    )}
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
                    <option value="CAJETILLAS">CAJETILLAS</option>
                    <option value="CAJA">CAJA</option>
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