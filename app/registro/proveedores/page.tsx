"use client";

import { useState, useEffect, Suspense } from "react";
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
}

interface PedidoGuardadoDB {
  id: number;
  proveedor: string;
  producto: string;
  cantidad: string;
  creado_en: string;
  recibido?: boolean;
  oculto?: boolean; // <--- AGREGA ESTA LÍNEA
}

interface RankingItem {
  producto: string;
  proveedor: string;
  totalPedidos: number;
}

function ProveedoresContent() {
  const searchParams = useSearchParams();
  const proveedorQuery = searchParams.get("proveedor");

  const [proveedores, setProveedores] = useState<ProveedorDB[]>([]);
  const [pedidosDB, setPedidosDB] = useState<PedidoGuardadoDB[]>([]);
  const [proveedorSel, setProveedorSel] = useState("");
  const [producto, setProducto] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [verHistorial, setVerHistorial] = useState(false);
  
  const [diaAbierto, setDiaAbierto] = useState<string | null>(null);
  const diasSemana = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado"]; // Domingo omitido

  const cargarPedidosDesdeBD = async () => {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*") // Esto trae todas las columnas, incluyendo 'oculto'
    .order("creado_en", { ascending: false });

  if (error) {
    console.error("Error:", error);
  } else {
    setPedidosDB(data || []);
    console.log("Datos recibidos de Supabase:", data); // Verifica en F12 si 'oculto' viene en el objeto
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

        const hoy = new Date().toLocaleDateString("es-ES", { weekday: "long" }).toLowerCase();
        const diaEncontrado = diasSemana.find(
          (d) => d.normalize("NFD").replace(/[\u0300-\u036f]/g, "") === hoy.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        );
        setDiaAbierto(diaEncontrado || "lunes");
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

  // 🔥 FILTRO INTELIGENTE: Ocultar 1 día después de la fecha de entrega programada
  const obtenerProximoDiaSemana = (fechaBase: Date, diaObjetivo: string) => {
    const resultado = new Date(fechaBase);
    const mapaDias: Record<string, number> = { lunes: 1, martes: 2, miércoles: 3, jueves: 4, viernes: 5, sábado: 6};
    const numeroDiaObjetivo = mapaDias[diaObjetivo.toLowerCase().trim()] ?? 1;
    
    const distancia = (numeroDiaObjetivo + 7 - resultado.getDay()) % 7;
    resultado.setDate(resultado.getDate() + (distancia === 0 ? 7 : distancia));
    return resultado;
  };

// 1. FILTRO INTELIGENTE (72h automático)
const pedidosActivosFiltrados = pedidosDB.filter((pedido) => {
  // Ocultar si el valor es explícitamente true
  if (pedido.oculto === true) return false;

  // Si no está oculto, aplicamos la lógica de 72 horas para los recibidos
  if (pedido.recibido === true) {
    const ahora = new Date().getTime();
    const fechaRegistro = new Date(pedido.creado_en).getTime();
    const limiteOcultar = fechaRegistro + (72 * 60 * 60 * 1000);
    return ahora < limiteOcultar;
  }

  // Si no está recibido y no está oculto, se muestra siempre
  return true;
});

  // 2. FUNCIÓN OCULTAR GRUPO
  const ocultarGrupoProveedor = async (ids: number[]) => {
    if (!window.confirm("¿Ocultar este grupo del monitor?")) return;
    try {
      await Promise.all(ids.map(async (id) => {
        await supabase.from("pedidos").update({ oculto: true }).eq("id", id);
      }));
      await cargarPedidosDesdeBD();
    } catch (err) { alert("Error al ocultar"); }
  };

  const nombresProveedoresUnicos = Array.from(new Set(proveedores.map(p => p.nombre.toUpperCase()))).sort();

// Asegúrate de que esta función sea exactamente así:
const obtenerProductosMasPedidos = (): RankingItem[] => {
    // IMPORTANTE: Iteramos sobre 'pedidosDB' (La fuente original sin filtros)
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
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 27);

    const tableColumn = ["Producto", "Cantidad", "Estado", "Fecha Registro"];
    const tableRows = items.map(item => [
      item.producto.toUpperCase(),
      item.cantidad,
      item.recibido ? "RECIBIDO EN TIENDA" : "PENDIENTE EN CAMINO",
      new Date(item.creado_en).toLocaleDateString("es-ES")
    ]);

    autoTable(doc, {
      startY: 35,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 5 },
    });

    doc.save(`Pedido_${provName}_${new Date().toLocaleDateString("es-ES")}.pdf`);
  };

  // CREATE
  const manejarEnvioDirecto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!producto.trim() || !cantidad || isNaN(Number(cantidad)) || !proveedorSel) {
      alert("Completa todos los campos correctamente");
      return;
    }
    
    setEnviando(true);
    try {
      const { error } = await supabase
        .from("pedidos")
        .insert([{
          proveedor: proveedorSel.toUpperCase(),
          producto: producto.toUpperCase().trim(),
          cantidad: `${cantidad} UNIDADES`,
          creado_en: new Date().toISOString(),
        }]);

      if (error) throw error;
      setProducto("");
      setCantidad("");
      await cargarPedidosDesdeBD();
      document.getElementById("input-producto")?.focus();
    } catch (err) {
      console.error(err);
      alert("Error al registrar el pedido.");
    } finally {
      setEnviando(false);
    }
  };

  // ✏️ UPDATE COMPLETO
  const editarPedidoDB = async (item: PedidoGuardadoDB) => {
    const nuevoNombre = window.prompt(`Modificar nombre del producto:`, item.producto);
    if (nuevoNombre === null || nuevoNombre.trim() === "") return;

    const cantidadLimpia = item.cantidad.replace(" UNIDADES", "");
    const nuevaCantidad = window.prompt(`Modificar cantidad para "${nuevoNombre.toUpperCase()}":`, cantidadLimpia);
    if (nuevaCantidad === null || nuevaCantidad.trim() === "" || isNaN(Number(nuevaCantidad))) return;

    try {
      const { error } = await supabase
        .from("pedidos")
        .update({ 
          producto: nuevoNombre.toUpperCase().trim(),
          cantidad: `${nuevaCantidad} UNIDADES` 
        })
        .eq("id", item.id);

      if (error) throw error;
      await cargarPedidosDesdeBD();
    } catch (err) {
      console.error(err);
      alert("No se pudo actualizar el registro.");
    }
  };

// ✅ MARCAR COMO RECIBIDO (Actualiza, no borra)
  const marcarGrupoComoRecibido = async (provName: string, ids: number[]) => {
  try {
    const ahora = new Date().toISOString(); // Capturamos el momento exacto
    await Promise.all(
      ids.map(async (id) => {
        const { error } = await supabase
          .from("pedidos")
          .update({ 
            recibido: true,
            // Opcional: si agregas la columna 'fecha_recibido' a tu tabla
            // fecha_recibido: ahora 
          })
          .eq("id", id);
        if (error) throw error;
      })
    );

    // ... resto de tu código
    await cargarPedidosDesdeBD();
  } catch (err) {
    console.error(err);
  }
};

  // DELETE ITEM
  const eliminarPedidoDB = async (id: number) => {
    const confirmar = window.confirm("¿Eliminar este producto del pedido?");
    if (!confirmar) return;

    try {
      const { error } = await supabase.from("pedidos").delete().eq("id", id);
      if (error) throw error;
      await cargarPedidosDesdeBD();
    } catch (err) {
      console.error(err);
      alert("No se pudo eliminar el registro.");
    }
  };

  // ↩️ REVERTIR PEDIDO INDIVIDUAL
  const revertirPedidoIndividual = async (id: number) => {
    try {
      const { error } = await supabase
        .from("pedidos")
        .update({ recibido: false })
        .eq("id", id);
      
      if (error) throw error;
      
      await cargarPedidosDesdeBD();
      alert("🔄 Pedido revertido a estado 'Pendiente'.");
    } catch (err) {
      console.error("Error al revertir:", err);
      alert("No se pudo revertir el estado.");
    }
  };

  // DELETE TOTAL GROUP (Corregido)
  const eliminarGrupoProveedorDB = async (provName: string, ids: number[]) => {
    const confirmar = window.confirm(`⚠️ ¿Estás seguro de eliminar TODO el bloque de pedidos de "${provName.toUpperCase()}" (${ids.length} productos)?`);
    if (!confirmar) return;

    try {
      await Promise.all(
        ids.map(async (id) => {
          const { error } = await supabase.from("pedidos").delete().eq("id", id);
          if (error) throw error;
        })
      );

      await cargarPedidosDesdeBD();
    } catch (err) {
      console.error(err);
      alert("Error al eliminar el grupo completo.");
    }
  };

  // ↩️ REVERTIR PEDIDO (Desmarcar como recibido)
const revertirGrupoProveedorDB = async (provName: string, ids: number[]) => {
    try {
      await Promise.all(
        ids.map(async (id) => {
          const { error } = await supabase
            .from("pedidos")
            .update({ recibido: false })
            .eq("id", id);
          if (error) throw error;
        })
      );

      // Revertimos también el estado del proveedor
      await supabase
        .from("proveedores")
        .update({ pedido_hecho: true, entrega_recibida: false })
        .eq("nombre", provName);

      await cargarPedidosDesdeBD();
      alert("🔄 Grupo completo revertido a 'Pendiente'.");
    } catch (err) {
      console.error(err);
      alert("Error al revertir el grupo.");
    }
  };
    // 1. Obtenemos solo los nombres de los proveedores que coinciden con el día abierto
    const nombresProveedoresHoy = proveedores
      .filter(p => p.dia_pedido?.toLowerCase() === diaAbierto?.toLowerCase())
      .map(p => p.nombre.toUpperCase());

    // 2. Quitamos duplicados y ordenamos
    const opcionesSelect = Array.from(new Set(nombresProveedoresHoy)).sort();

  if (cargando) return <div className="p-10 text-center font-black uppercase animate-pulse text-slate-400">Sincronizando...</div>;

  const proveedoresDelDiaActivo = proveedores.filter((p) => p.dia_pedido?.toLowerCase() === diaAbierto);
  const rankingMasPedidos = obtenerProductosMasPedidos();

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4 animate-in fade-in duration-500">
      
      {/* CABECERA */}
      <div className="border-b border-slate-200 pb-4">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mb-1">Logística y Abastecimiento</p>
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
          Gestión de <span className="text-indigo-600">Proveedores</span>
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
            <div className="flex items-center gap-2 mb-4 border-b border-slate-200/60 pb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
              <p className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                Proveedores del <span className="underline italic text-indigo-600">{diaAbierto}</span>:
              </p>
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
                    onClick={() => setProveedorSel(p.nombre)}
                    className={`bg-white p-4 rounded-xl border transition-all cursor-pointer shadow-xs flex flex-col justify-between gap-3 ${
                      proveedorSel === p.nombre 
                        ? 'border-indigo-600 ring-4 ring-indigo-50 scale-[1.01]' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${p.color} shrink-0`}></div>
                      <h3 className="font-black text-slate-900 uppercase text-xs tracking-tight truncate">{p.nombre}</h3>
                    </div>
                    
                    <div className="space-y-1.5 text-left bg-slate-50 p-2 rounded-lg border border-slate-100 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-500 uppercase text-[10px]">Pedido:</span>
                        <span className="font-black text-slate-800 uppercase italic bg-white px-2 py-0.5 rounded border border-slate-200">{p.dia_pedido}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-indigo-500 uppercase text-[10px]">Entrega:</span>
                        <span className="font-black text-indigo-700 uppercase italic bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{p.dia_entrega}</span>
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
        <form onSubmit={manejarEnvioDirecto} className="lg:col-span-4 bg-white p-6 rounded-[2rem] shadow-md border border-slate-200 h-fit">
          <h3 className="text-lg font-black text-slate-900 uppercase mb-5 italic tracking-tighter">🚀 Registrar Pedido</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-900 uppercase ml-3 mb-1.5 tracking-widest">Proveedor</label>
              <select
                value={proveedorSel}
                onChange={(e) => setProveedorSel(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-100 border-2 border-transparent focus:border-indigo-500 rounded-xl text-sm font-bold text-slate-900 outline-none cursor-pointer"
              >
                <option value="">-- PROVEEDOR DE DÍA --</option>
                
                {opcionesSelect.length > 0 ? (
                  opcionesSelect.map(nombre => (
                    <option key={nombre} value={nombre}>{nombre}</option>
                  ))
                ) : (
                  <option value="" disabled>No hay pedidos hoy</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-900 uppercase ml-3 mb-1.5 tracking-widest">Producto</label>
              <input
                id="input-producto"
                type="text"
                value={producto}
                onChange={(e) => setProducto(e.target.value)}
                placeholder="EJ: PILSEN 630ML"
                className="w-full px-4 py-3.5 bg-slate-100 border-2 border-transparent focus:border-indigo-500 rounded-xl text-sm font-bold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-900 uppercase ml-3 mb-1.5 tracking-widest">Cantidad</label>
              <input
                type="number"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                placeholder="0"
                min="1"
                className="w-full px-4 py-3.5 bg-slate-100 border-2 border-transparent focus:border-indigo-500 rounded-xl text-sm font-bold text-slate-900 outline-none"
              />
            </div>

            <button 
              type="submit" 
              disabled={enviando}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              {enviando ? "Guardando..." : "Enviar a Base de Datos ↑"}
            </button>
          </div>
        </form>

        {/* MONITOR ACTIVO */}
        <div className="lg:col-span-8 bg-slate-900 p-6 rounded-[2rem] shadow-xl text-white flex flex-col">
          <div className="flex items-center gap-2 mb-5 border-b border-white/10 pb-4">
            <span className="text-xl animate-pulse">📊</span>
            <h3 className="text-lg font-black uppercase italic tracking-tighter">Monitoreo de Pedidos en Curso Durante (24Hrs)</h3>
          </div>

          <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2">
            {pedidosActivosFiltrados.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center opacity-25">
                <span className="text-4xl mb-2">📡</span>
                <p className="text-[11px] font-black uppercase tracking-widest text-white">Sin despachos programados en este momento</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
  {Array.from(new Set(pedidosActivosFiltrados.map((pr) => pr.proveedor))).map((provName) => {
    const itemsDelProveedor = pedidosActivosFiltrados.filter((pr) => pr.proveedor === provName);
    const idsDelGrupo = itemsDelProveedor.map((item) => item.id);
    const provInfo = proveedores.find((p) => p.nombre === provName);
    const colorProv = provInfo?.color || "bg-indigo-600";

    // LÓGICA DE TIEMPO PARA EL BOTÓN OCULTAR
    const todosRecibidos = itemsDelProveedor.every((item) => item.recibido);
    
    // Calculamos si han pasado 24h desde que se recibió el primer item del grupo
    // (Opcional: podrías guardar una fecha_recibido, pero usaremos el ahora menos 24h)
    const horasPasadas = (new Date().getTime() - new Date(itemsDelProveedor[0].creado_en).getTime()) / (1000 * 60 * 60);
    const esOcultable = todosRecibidos && horasPasadas >= 24;

    return (
      <div key={provName} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between hover:border-white/20 transition-all">
        <div>
          {/* Cabecera Proveedor */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2.5 flex-wrap gap-2">
            <div className="flex flex-col max-w-[45%]">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${colorProv} shrink-0`}></span>
                <span className="font-black text-white uppercase text-xs tracking-tight italic truncate">{provName}</span>
              </div>
              <span className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Entrega: {provInfo?.dia_entrega || 'N/A'}</span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* BOTÓN OCULTAR GRUPO (Aparece solo si pasaron 24h y está recibido) */}
              {esOcultable && (
                <button
                  type="button"
                  onClick={() => ocultarGrupoProveedor(idsDelGrupo)}
                  className="bg-slate-700 hover:bg-slate-800 text-white text-[9px] font-black uppercase px-2 py-1.5 rounded-md transition-colors"
                >
                  ✕ Ocultar
                </button>
              )}

              {/* Botón lógico: Recibir todo o Deshacer todo */}
              {!todosRecibidos ? (
                <button
                  type="button"
                  onClick={() => marcarGrupoComoRecibido(provName, idsDelGrupo)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-black uppercase px-2 py-1.5 rounded-md transition-colors"
                >
                  ✓ Recibido
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => revertirGrupoProveedorDB(provName, idsDelGrupo)}
                  className="bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-black uppercase px-2 py-1.5 rounded-md transition-colors"
                >
                  ↩️ Deshacer
                </button>
              )}

              <button
                type="button"
                onClick={() => exportarPDFIndividual(provName, itemsDelProveedor)}
                className="bg-indigo-600 hover:bg-indigo-500 text-[9px] font-black uppercase px-2 py-1.5 rounded-md transition-colors"
                title="Generar PDF"
              >
                📄 PDF
              </button>

              <button
                type="button"
                onClick={() => eliminarGrupoProveedorDB(provName, idsDelGrupo)}
                className="bg-rose-600/30 hover:bg-rose-600 text-rose-400 hover:text-white p-1.5 rounded-md transition-all flex items-center justify-center"
                title="Borrar grupo completo"
              >
                🗑️
              </button>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-1.5">
            {itemsDelProveedor.map(item => (
              <div key={item.id} className={`p-3 rounded-lg border transition-all ${
                  item.recibido 
                    ? "bg-slate-300 opacity-60 grayscale border-slate-400" 
                    : "border-slate-200"
                }`}>
                <div className="flex flex-col truncate pr-2">
                  <span className="font-black uppercase truncate text-slate-200">{item.producto}</span>
                  <span className="text-[10px] font-bold text-indigo-400">{item.cantidad}</span>
                </div>
                
                <div className="flex items-center gap-1 shrink-0">
                  {item.recibido && (
                    <button 
                      type="button" 
                      onClick={() => revertirPedidoIndividual(item.id)}
                      className="text-[9px] text-blue-600 font-black uppercase hover:underline mr-2"
                    >
                      ↩️ Deshacer
                    </button>
                  )}
                  <button 
                    type="button" 
                    onClick={() => editarPedidoDB(item)}
                    className="text-slate-400 hover:text-indigo-400 p-1.5 font-bold text-xs"
                    title="Editar"
                  >
                    ✏️
                  </button>
                  <button 
                    type="button" 
                    onClick={() => eliminarPedidoDB(item.id)}
                    className="text-slate-400 hover:text-rose-400 p-1.5 text-xs font-black"
                    title="Eliminar producto"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight mt-3 text-left">
          Registrado: {new Date(itemsDelProveedor[0].creado_en).toLocaleDateString("es-ES")}
        </p>
      </div>
    );
  })}
</div>
            )}
          </div>
        </div>

      </div>

      {/* HISTORIAL */}
      <div className="bg-slate-100 rounded-[2rem] border border-slate-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setVerHistorial(!verHistorial)}
          className="w-full p-5 flex items-center justify-between font-black text-slate-800 uppercase italic text-xs tracking-wider hover:bg-slate-200/50 transition-colors outline-none"
        >
          <div className="flex items-center gap-2">
            <span>📈</span>
            <span>Historial Comercial: Productos Más Pedidos ({rankingMasPedidos.length})</span>
          </div>
          <span className="text-sm font-bold bg-white text-slate-600 px-3 py-1 rounded-xl border border-slate-200">
            {verHistorial ? "OCULTAR ANALÍTICA ▲" : "VER RANKING DE CONSUMO ▼"}
          </span>
        </button>

        {/* CONTENIDO HISTORIAL */}
        {verHistorial && (
          <div className="p-6 bg-white border-t border-slate-200 space-y-4 animate-in fade-in duration-300">
            <p className="text-xs font-medium text-slate-500 uppercase">
              Ranking histórico global de la base de datos. Ideal para control de inventarios a largo plazo.
            </p>

            {rankingMasPedidos.length === 0 ? (
              <p className="text-xs text-center font-bold text-slate-400 py-6 uppercase">Sin datos históricos.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {rankingMasPedidos.map((item, index) => (
                  <div key={item.producto} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between relative overflow-hidden">
                    <span className="absolute top-2 right-2 text-[9px] font-black bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                      TOP #{index + 1}
                    </span>

                    <div className="space-y-1 pr-10">
                      <p className="text-xs font-black text-slate-900 uppercase tracking-tight truncate" title={item.producto}>
                        {item.producto}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase truncate">
                        Prov: {item.proveedor}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200/60 flex justify-between items-center text-[11px]">
                      <span className="font-bold text-slate-500 uppercase text-[9px]">Veces Pedido:</span>
                      <span className="font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                        {item.totalPedidos}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

export default function ProveedoresPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-black uppercase animate-pulse text-slate-400">Cargando...</div>}>
      <ProveedoresContent />
    </Suspense>
  );
}