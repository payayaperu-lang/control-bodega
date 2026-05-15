"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase"; 
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ItemPedido {
  id: number;
  proveedor: string;
  producto: string;
  cantidad: string;
  color: string;
}

interface ProveedorDB {
  id: number;
  nombre: string;
  color: string;
  dia_pedido: string;
  dia_entrega: string;
}

function ProveedoresContent() {
  const searchParams = useSearchParams();
  const proveedorQuery = searchParams.get("proveedor");

  const [pedido, setPedido] = useState<ItemPedido[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorDB[]>([]);
  const [proveedorSel, setProveedorSel] = useState("");
  const [producto, setProducto] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const inicializarDatos = async () => {
      const { data, error } = await supabase
        .from("proveedores")
        .select("*")
        .order("nombre", { ascending: true });

      if (error) {
        console.error("Error cargando proveedores:", error);
      } else if (data) {
        setProveedores(data);
        const pedidoGuardado = localStorage.getItem("pedido_temporal_payaya");
        const proveedorGuardado = localStorage.getItem("proveedor_actual_payaya");

        if (pedidoGuardado) {
          try { setPedido(JSON.parse(pedidoGuardado)); } catch (e) { console.error(e); }
        }

        if (proveedorQuery) {
          const existe = data.find(p => p.nombre.toLowerCase() === proveedorQuery.toLowerCase());
          if (existe) setProveedorSel(existe.nombre);
        } else if (proveedorGuardado) {
          setProveedorSel(proveedorGuardado);
        }
      }
      setCargando(false);
    };
    inicializarDatos();
  }, [proveedorQuery]);

  useEffect(() => {
    if (!cargando) {
      localStorage.setItem("pedido_temporal_payaya", JSON.stringify(pedido));
      localStorage.setItem("proveedor_actual_payaya", proveedorSel);
    }
  }, [pedido, proveedorSel, cargando]);

  const exportarPDF = () => {
    if (pedido.length === 0) {
      alert("No hay items para exportar");
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59);
    doc.text("NOTA DE PEDIDO", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 28);
    doc.text("Sistema de Gestión Payaya", 14, 33);

    const tableColumn = ["Proveedor", "Producto", "Cantidad"];
    const tableRows = pedido.map(item => [
      item.proveedor.toUpperCase(),
      item.producto.toUpperCase(),
      item.cantidad
    ]);

    autoTable(doc, {
      startY: 40,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4 },
    });

    doc.save(`Pedido_Payaya_${new Date().getTime()}.pdf`);
  };

  const manejarEnvio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!producto.trim() || !cantidad || isNaN(Number(cantidad)) || !proveedorSel) {
      alert("Completa todos los campos correctamente");
      return;
    }
    
    const infoProv = proveedores.find(p => p.nombre === proveedorSel);
    const nuevoItem = { 
      id: Date.now(), 
      proveedor: proveedorSel,
      producto: producto.toUpperCase(), 
      cantidad: `${cantidad} UNIDADES`,
      color: infoProv?.color || "bg-slate-500"
    };

    setPedido([nuevoItem, ...pedido]);
    setProducto("");
    setCantidad("");
    document.getElementById("input-producto")?.focus();
  };

  const eliminarItem = (id: number) => {
    setPedido(pedido.filter(item => item.id !== id));
  };

  if (cargando) return <div className="p-10 text-center font-black uppercase animate-pulse text-slate-400">Sincronizando...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* CABECERA PRINCIPAL LIMPIA */}
      <div className="border-b border-slate-200 pb-6">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mb-1">Logística y Abastecimiento</p>
        <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
          Gestión de <span className="text-indigo-600">Proveedores</span>
        </h2>
      </div>

      {/* TARJETAS SUPERIORES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {proveedores.map((p) => (
          <div 
            key={p.id} 
            onClick={() => setProveedorSel(p.nombre)}
            className={`bg-white p-5 rounded-[2rem] border transition-all cursor-pointer shadow-sm flex flex-col justify-center gap-2 ${
              proveedorSel === p.nombre 
                ? 'border-indigo-600 ring-4 ring-indigo-50 scale-[1.02]' 
                : 'border-slate-100 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${p.color} shadow-sm`}></div>
              <h3 className="font-black text-slate-900 uppercase text-[12px] tracking-tight">{p.nombre}</h3>
            </div>
            
            <div className="flex flex-wrap gap-1">
              <div className="bg-slate-100 px-2 py-1 rounded-lg flex items-center gap-1.5">
                <span className="text-[7px] font-black text-slate-400 uppercase">PED:</span>
                <span className="text-[9px] font-black text-slate-800 uppercase italic">{p.dia_pedido}</span>
              </div>
              <div className="bg-indigo-50 px-2 py-1 rounded-lg flex items-center gap-1.5 border border-indigo-100">
                <span className="text-[7px] font-black text-indigo-400 uppercase">LLEGA:</span>
                <span className="text-[9px] font-black text-indigo-700 uppercase italic">{p.dia_entrega}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* FORMULARIO */}
        <form onSubmit={manejarEnvio} className="lg:col-span-5 bg-white p-8 rounded-[3.5rem] shadow-xl border border-slate-100 h-fit">
          <h3 className="text-xl font-black text-slate-900 uppercase mb-8 italic tracking-tighter">📝 Nueva Nota</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-900 uppercase ml-4 mb-2 tracking-widest">Proveedor</label>
              <select
                value={proveedorSel}
                onChange={(e) => setProveedorSel(e.target.value)}
                className="w-full px-6 py-4 bg-slate-100 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-bold text-slate-900 outline-none cursor-pointer"
              >
                <option value="">-- SELECCIONAR --</option>
                {proveedores.map(p => (
                  <option key={p.id} value={p.nombre}>{p.nombre.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-900 uppercase ml-4 mb-2 tracking-widest">Producto</label>
              <input
                id="input-producto"
                type="text"
                value={producto}
                onChange={(e) => setProducto(e.target.value)}
                placeholder="EJ: PILSEN 630ML"
                className="w-full px-6 py-4 bg-slate-100 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-bold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-900 uppercase ml-4 mb-2 tracking-widest">Cantidad (Números)</label>
              <input
                type="number"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                placeholder="0"
                min="1"
                className="w-full px-6 py-4 bg-slate-100 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-sm font-bold text-slate-900 outline-none"
              />
            </div>

            <button type="submit" className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-lg active:scale-95">
              Añadir a la lista +
            </button>
          </div>
        </form>

        {/* LISTA DE PEDIDO CON BOTÓN DE EXPORTAR DENTRO */}
        <div className="lg:col-span-7 bg-slate-900 p-8 rounded-[3.5rem] shadow-2xl text-white flex flex-col">
          <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-6 flex-wrap gap-4">
            <h3 className="text-xl font-black uppercase italic tracking-tighter">🛒 Items en Nota</h3>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={exportarPDF}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center gap-2"
              >
                <span>📥</span> GUARDAR PDF
              </button>
              <span className="text-[10px] font-black bg-white/10 px-4 py-2 rounded-xl text-white uppercase border border-white/5">
                {pedido.length} Und
              </span>
            </div>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {pedido.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center opacity-30">
                <span className="text-4xl mb-2">📦</span>
                <p className="text-[10px] font-black uppercase tracking-widest text-white">No hay productos en la lista</p>
              </div>
            ) : (
              pedido.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-white/5 p-5 rounded-[2rem] border border-white/10 hover:bg-white/10 transition-all">
                  <div className="flex flex-col gap-1">
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-md w-fit text-white uppercase ${item.color}`}>
                      {item.proveedor}
                    </span>
                    <p className="text-sm font-black uppercase text-white">{item.producto}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">CANTIDAD: <span className="text-white font-black">{item.cantidad}</span></p>
                  </div>
                  <button onClick={() => eliminarItem(item.id)} className="p-4 bg-white/5 hover:bg-rose-600 text-white rounded-2xl transition-all shadow-sm">✕</button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProveedoresPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ProveedoresContent />
    </Suspense>
  );
}