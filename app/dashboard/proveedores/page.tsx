"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase"; 

interface ProveedorDB {id: number;nombre: string; color: string; dia_pedido: string; dia_entrega: string; catalogo_link?: string;
}

const PALETA_COLORES = [
  "bg-indigo-600", "bg-emerald-600", "bg-amber-500", "bg-rose-600","bg-sky-500", "bg-purple-600", "bg-orange-500", "bg-teal-600", "bg-pink-600", "bg-lime-600", "bg-cyan-600", "bg-violet-600"
];

function ProveedoresContent() {
  const searchParams = useSearchParams();
  const proveedorQuery = searchParams.get("proveedor");
  const [proveedores, setProveedores] = useState<ProveedorDB[]>([]);
  const [proveedorSel, setProveedorSel] = useState("");
  const [cargando, setCargando] = useState(true);
  const [verMantenimiento, setVerMantenimiento] = useState(true);
  
  // ID del proveedor recién creado o editado para feedback visual
  const [idProveedorDestacado, setIdProveedorDestacado] = useState<number | null>(null);

  // Estados para CRUD de proveedores
  const [nuevoProvNombre, setNuevoProvNombre] = useState("");
  const [nuevoProvColor, setNuevoProvColor] = useState("bg-indigo-600");
  const [nuevoProvDiaPedido, setNuevoProvDiaPedido] = useState("lunes");
  const [nuevoProvDiaEntrega, setNuevoProvDiaEntrega] = useState("martes");
  const [nuevoProvLink, setNuevoProvLink] = useState("");
  const [editandoProvId, setEditandoProvId] = useState<number | null>(null);

  const [diaAbierto, setDiaAbierto] = useState<string | null>(null);
  const diasSemana = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

  const cargarProveedoresDesdeBD = async () => {
    const { data, error } = await supabase
      .from("proveedores")
      .select("*")
      .order("nombre", { ascending: true });

    if (!error && data) setProveedores(data);
  };

  useEffect(() => {
    const inicializarDatos = async () => {
      const { data: provsData } = await supabase
        .from("proveedores")
        .select("*")
        .order("nombre", { ascending: true });

      if (provsData) {
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

      setCargando(false);
    };
    inicializarDatos();
  }, [proveedorQuery]);

  useEffect(() => {
    if (!cargando) {
      localStorage.setItem("proveedor_actual_payaya", proveedorSel);
    }
  }, [proveedorSel, cargando]);


  // GESTIÓN CRUD PROVEEDORES
  const activarEdicionProveedor = (p: ProveedorDB) => {
    const normalizarDia = (dia: string) => 
      dia ? dia.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

    setEditandoProvId(p.id);
    setNuevoProvNombre(p.nombre);
    setNuevoProvColor(p.color);
    setNuevoProvLink(p.catalogo_link || "");

    const diaPedidoMatch = diasSemana.find(d => normalizarDia(d) === normalizarDia(p.dia_pedido));
    const diaEntregaMatch = diasSemana.find(d => normalizarDia(d) === normalizarDia(p.dia_entrega));

    setNuevoProvDiaPedido(diaPedidoMatch || p.dia_pedido || "lunes");
    setNuevoProvDiaEntrega(diaEntregaMatch || p.dia_entrega || "martes");
  };

  const guardarProveedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoProvNombre.trim()) return alert("El nombre es obligatorio");

    const payload = {
      nombre: nuevoProvNombre.trim().toUpperCase(),
      color: nuevoProvColor,
      dia_pedido: nuevoProvDiaPedido.toLowerCase(),
      dia_entrega: nuevoProvDiaEntrega.toLowerCase(),
      catalogo_link: nuevoProvLink.trim() || null
    };

    try {
      let idTarget: number | null = null;

      if (editandoProvId) {
        const { error } = await supabase.from("proveedores").update(payload).eq("id", editandoProvId);
        if (error) throw error;
        idTarget = editandoProvId;
        setEditandoProvId(null);
      } else {
        const { data, error } = await supabase.from("proveedores").insert([payload]).select("id").single();
        if (error) throw error;
        if (data) idTarget = data.id;
      }

      setNuevoProvNombre("");
      setNuevoProvLink("");
      
      // Activar destello azul en la lista
      if (idTarget) {
        setIdProveedorDestacado(idTarget);
        setTimeout(() => setIdProveedorDestacado(null), 3000);
      }

      await cargarProveedoresDesdeBD();
    } catch (err) {
      alert("Error en proceso.");
    }
  };

  const eliminarProveedor = async (id: number, nombre: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar al proveedor "${nombre}"?`)) return;
    try {
      await supabase.from("proveedores").delete().eq("id", id);
      await cargarProveedoresDesdeBD();
    } catch (err) {}
  };

  const opcionesSelect = Array.from(new Set(proveedores.filter(p => p.dia_pedido?.toLowerCase() === diaAbierto?.toLowerCase()).map(p => p.nombre.toUpperCase()))).sort();
  const proveedoresDelDiaActivo = proveedores.filter((p) => p.dia_pedido?.toLowerCase() === diaAbierto);

  if (cargando) return <div className="p-10 text-center font-black uppercase animate-pulse text-slate-400">Sincronizando...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4 animate-in fade-in duration-500">
      
      {/* CABECERA */}
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mb-1">Logística y Abastecimiento</p>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
            Gestión de <span className="text-indigo-600">Proveedores</span>
          </h2>
        </div>
        <div>
          <button
            type="button"
            onClick={() => setVerMantenimiento(!verMantenimiento)}
            className={`px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-sm border ${
              verMantenimiento 
                ? "bg-slate-900 text-white border-slate-900" 
                : "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50"
            }`}
          >
            {verMantenimiento ? "✕ Ocultar Edición" : "⚙️ Ajustes Proveedores"}
          </button>
        </div>
      </div>

      {/* PANEL DE MANTENIMIENTO */}
      {verMantenimiento && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* FORMULARIO CRUD */}
            <form onSubmit={guardarProveedor} className="md:col-span-5 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h4 className="text-xs font-black uppercase italic text-slate-900 border-b pb-2 flex items-center gap-1.5">
                {editandoProvId ? "✏️ Modificar Datos" : "➕ Añadir Nuevo Proveedor"}
              </h4>
              
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-800 mb-1">Nombre Comercial</label>
                <input 
                  type="text" 
                  value={nuevoProvNombre} 
                  onChange={(e) => setNuevoProvNombre(e.target.value)}
                  placeholder="EJ: DIAGEO / BACKUS" 
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 uppercase outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-800 mb-1">Día de Pedido</label>
                  <select value={nuevoProvDiaPedido} onChange={(e) => setNuevoProvDiaPedido(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold text-slate-900 outline-none capitalize">
                    {diasSemana.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-800 mb-1">Día de Entrega</label>
                  <select value={nuevoProvDiaEntrega} onChange={(e) => setNuevoProvDiaEntrega(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold text-slate-900 outline-none capitalize">
                    {diasSemana.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
                  </select>
                </div>
              </div>

              {/* COLORES VISUALES */}
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-800 mb-2">Asignar Color Distintivo</label>
                <div className="grid grid-cols-6 gap-2">
                  {PALETA_COLORES.map((colorClass) => (
                    <button
                      key={colorClass}
                      type="button"
                      onClick={() => setNuevoProvColor(colorClass)}
                      className={`h-7 w-7 rounded-full ${colorClass} transition-all relative ${
                        nuevoProvColor === colorClass 
                          ? "ring-4 ring-offset-2 ring-indigo-600 scale-110" 
                          : "hover:scale-105 opacity-80 hover:opacity-100"
                      }`}
                    >
                      {nuevoProvColor === colorClass && (
                        <span className="absolute inset-0 flex items-center justify-center text-white text-[10px]">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase text-slate-800 mb-1">Vínculo Catálogo Drive</label>
                <input 
                  type="url" 
                  value={nuevoProvLink} 
                  onChange={(e) => setNuevoProvLink(e.target.value)}
                  placeholder="https://drive.google.com/..." 
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button type="submit" className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-wider hover:bg-indigo-700">
                  {editandoProvId ? "Actualizar Cambios" : "Guardar Proveedor"}
                </button>
                {editandoProvId && (
                  <button type="button" onClick={() => { setEditandoProvId(null); setNuevoProvNombre(""); setNuevoProvLink(""); setNuevoProvDiaPedido("lunes"); setNuevoProvDiaEntrega("martes"); }} className="px-3 py-2.5 bg-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase">
                    Cancelar
                  </button>
                )}
              </div>
            </form>

            {/* LISTADO DE PROVEEDORES CON FEEDBACK VISUAL AZUL */}
            <div className="md:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 space-y-2 max-h-[390px] overflow-y-auto">
              <h4 className="text-xs font-black uppercase italic text-slate-400 mb-2">Proveedores en el Sistema</h4>
              {proveedores.map(p => {
                const esDestacado = idProveedorDestacado === p.id;
                return (
                  <div 
                    key={p.id} 
                    className={`flex items-center justify-between p-3 border rounded-xl transition-all duration-9000 ${
                      esDestacado 
                        ? "bg-blue-50 border-blue-400 ring-2 ring-blue-200 scale-[1.01]" 
                        : "border-slate-100 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className={`w-3 h-3 rounded-full ${p.color} shrink-0`}></div>
                      <div className="truncate">
                        <p className="text-xs font-black text-slate-900 uppercase truncate">
                          {p.nombre} {esDestacado && <span className="text-[9px] bg-blue-600 text-white font-black px-1.5 py-0.5 rounded ml-1 animate-pulse">¡LISTO!</span>}
                        </p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase">Pedido: {p.dia_pedido} | Entrega: {p.dia_entrega}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <button type="button" onClick={() => activarEdicionProveedor(p)} className="px-2 py-1 bg-white border text-slate-700 font-bold rounded-lg text-[10px] uppercase hover:bg-indigo-50 hover:text-indigo-600">✏️</button>
                      <button type="button" onClick={() => eliminarProveedor(p.id, p.nombre)} className="px-2 py-1 bg-white border text-slate-400 font-bold rounded-lg text-[10px] uppercase hover:bg-rose-50 hover:text-rose-600">🗑️</button>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
      )}

      {/* TABS DE DÍAS Y VISTA DE TARJETAS */}
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
                    className={`bg-white p-4 rounded-xl border transition-all cursor-pointer shadow-sm flex flex-col justify-between gap-3 ${
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

                    <div className="mt-1">
                      {p.catalogo_link && (
                        <a
                          href={p.catalogo_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center justify-center gap-1.5 w-full py-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-lg text-[11px] font-black uppercase tracking-wider transition-all"
                        >
                          📂 Ver Catálogo (Drive)
                        </a>
                      )}
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