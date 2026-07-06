"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function VistaTrabajador() {
  const [trabajadores, setTrabajadores] = useState<any[]>([]);
  const [miId, setMiId] = useState("");
  const [misHorarios, setMisHorarios] = useState<any[]>([]);

  useEffect(() => {
    const fetchTrabajadores = async () => {
      const { data } = await supabase.from("trabajadores").select("*");
      if (data) setTrabajadores(data);
    };
    fetchTrabajadores();
  }, []);

  useEffect(() => {
    if (!miId) return;
    const fetchMisHorarios = async () => {
      const hoy = new Date();
      const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
      
      const { data } = await supabase
        .from("horarios")
        .select("*")
        .eq("trabajador_id", miId)
        .gte("fecha", primerDia)
        .order("fecha", { ascending: true });
        
      if (data) setMisHorarios(data);
    };
    fetchMisHorarios();
  }, [miId]);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-black uppercase text-indigo-600">Mi Horario</h1>
      
      <select value={miId} onChange={e => setMiId(e.target.value)} className="w-full p-3 bg-slate-100 rounded-xl font-bold">
        <option value="">-- Selecciona tu perfil --</option>
        {trabajadores.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
      </select>

      <div className="space-y-3">
        {misHorarios.map(h => (
          <div key={h.id} className={`p-4 rounded-xl border-l-4 ${h.tipo_turno === "DESCANSO" ? "bg-amber-50 border-amber-500" : "bg-white shadow border-indigo-500"}`}>
            <div className="flex justify-between items-center">
              <p className="font-bold">{new Date(h.fecha + "T00:00:00").toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              <span className={`text-[10px] px-2 py-1 rounded font-black uppercase ${h.tipo_turno === "DESCANSO" ? "bg-amber-200 text-amber-800" : "bg-indigo-100 text-indigo-800"}`}>
                {h.tipo_turno}
              </span>
            </div>
            
            {h.tipo_turno !== "DESCANSO" ? (
              <p className="text-sm text-slate-500 font-semibold mt-1">🕒 {h.hora_inicio} - {h.hora_fin}</p>
            ) : (
              <p className="text-sm text-amber-600 font-bold mt-1">🛑 Motivo: {h.motivo_descanso}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}