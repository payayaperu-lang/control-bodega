"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

// Definimos los productos usuales (puedes mover esto a la base de datos luego)
const PRODUCTOS_BASE = [
  { id: 'pilsen-630', nombre: 'Pilsen 630ml', icono: '🍺' },
  { id: 'pilsen-lata', nombre: 'Pilsen Lata', icono: '🥫' },
  { id: 'cristal-630', nombre: 'Cristal 630ml', icono: '🍺' },
  { id: 'agua-sin-gas', nombre: 'Agua Sin Gas', icono: '💧' },
  { id: 'gaseosa-2l', nombre: 'Gaseosa 2L', icono: '🥤' },
];

export default function PanelAbastecimiento() {
  const [estados, setEstados] = useState<Record<string, boolean>>({});
  const [cargando, setCargando] = useState(true);

  // Cargar estados actuales desde Supabase
  useEffect(() => {
    const cargarEstados = async () => {
      const { data } = await supabase.from("inventario_rapido").select("*");
      if (data) {
        const mapa: Record<string, boolean> = {};
        data.forEach(item => mapa[item.producto_id] = item.esta_falta);
        setEstados(mapa);
      }
      setCargando(false);
    };
    cargarEstados();
  }, []);

  const toggleEstado = async (id: string) => {
    const nuevoEstado = !estados[id];
    setEstados({ ...estados, [id]: nuevoEstado });

    // Actualizar en Supabase (Upsert: inserta o actualiza)
    await supabase.from("inventario_rapido").upsert({ 
      producto_id: id, 
      esta_falta: nuevoEstado,
      ultima_actualizacion: new Date()
    });
  };

  if (cargando) return <div className="p-10 text-center font-black">CARGANDO PANEL...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="header">
        <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">
          Estado de <span className="text-indigo-600">Abastecimiento</span>
        </h2>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Toca el producto si hace falta en el slot</p>
      </div>

      {/* GRILLA DE BOTONES */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {PRODUCTOS_BASE.map((prod) => (
          <button
            key={prod.id}
            onClick={() => toggleEstado(prod.id)}
            className={`relative p-8 rounded-[2.5rem] border-4 transition-all flex flex-col items-center gap-4 shadow-xl active:scale-95 ${
              estados[prod.id] 
                ? 'bg-rose-600 border-rose-400 text-white animate-pulse' 
                : 'bg-white border-slate-100 text-slate-900'
            }`}
          >
            <span className="text-5xl">{prod.icono}</span>
            <span className="font-black uppercase text-[12px] tracking-tight">{prod.nombre}</span>
            
            {estados[prod.id] && (
              <span className="absolute top-4 right-6 text-[10px] font-black bg-white text-rose-600 px-2 py-1 rounded-lg">
                FALTA
              </span>
            )}
          </button>
        ))}
      </div>

      {/* LISTADO RESUMEN */}
      <div className="mt-12 bg-slate-900 p-8 rounded-[3rem] shadow-2xl">
        <h3 className="text-white font-black uppercase italic mb-6 border-b border-white/10 pb-4">
          Resumen de Reposición
        </h3>
        <div className="space-y-3">
          {PRODUCTOS_BASE.map((prod) => (
            <div 
              key={prod.id}
              className={`flex items-center justify-between px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest ${
                estados[prod.id] ? 'bg-rose-500/20 text-rose-400' : 'bg-white/5 text-white'
              }`}
            >
              <span>{prod.nombre}</span>
              <span>{estados[prod.id] ? "⚠️ REQUERIDO" : "✅ OK"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}