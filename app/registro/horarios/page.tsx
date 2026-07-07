"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

// Función para calcular la semana del mes (semana 1, 2, 3...) empezando en Lunes
const obtenerSemanaDelMes = (fechaStr: string) => {
  const [año, mes, dia] = fechaStr.split("-").map(Number);
  const primerDiaDelMes = new Date(año, mes - 1, 1);
  
  let diaSemanaPrimerDia = primerDiaDelMes.getDay() - 1;
  if (diaSemanaPrimerDia === -1) diaSemanaPrimerDia = 6; // Ajuste: Domingo es el día 6 de la semana
  
  return Math.ceil((dia + diaSemanaPrimerDia) / 7);
};

export default function VistaTrabajador() {
  const [trabajadores, setTrabajadores] = useState<any[]>([]);
  const [miId, setMiId] = useState<number | null>(null);
  const [misHorarios, setMisHorarios] = useState<any[]>([]);
  
  // Estado para controlar qué semana está abierta
  const [semanaAbierta, setSemanaAbierta] = useState<number | null>(null);

  useEffect(() => {
    const fetchTrabajadores = async () => {
      const { data } = await supabase.from("trabajadores").select("*").order("nombre");
      if (data) setTrabajadores(data);
    };
    fetchTrabajadores();
  }, []);

  useEffect(() => {
    if (!miId) return;
    
    const fetchMisHorarios = async () => {
      const hoy = new Date();
      const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
      const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0];
      
      const { data } = await supabase
        .from("horarios")
        .select("*")
        .eq("trabajador_id", miId)
        .gte("fecha", primerDia)
        .lte("fecha", ultimoDia) // Solo traemos el mes actual para no saturar
        .order("fecha", { ascending: true });
        
      if (data) {
        setMisHorarios(data);
        
        // Calcular la semana de HOY para abrirla automáticamente
        const fechaHoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
        const semanaActual = obtenerSemanaDelMes(fechaHoyStr);
        setSemanaAbierta(semanaActual);
      }
    };
    fetchMisHorarios();
  }, [miId]);

  // Agrupar los horarios por número de semana
  const horariosPorSemana: Record<number, any[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  misHorarios.forEach(h => {
    const numSemana = obtenerSemanaDelMes(h.fecha);
    if (horariosPorSemana[numSemana]) {
      horariosPorSemana[numSemana].push(h);
    }
  });

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-black uppercase text-indigo-600 tracking-tight">Mi Horario</h1>
      
      {/* 1. SELECCIÓN DE TRABAJADOR MEDIANTE BOTONES */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">¿Quién eres?</p>
        <div className="flex flex-wrap gap-2">
          {trabajadores.map(t => (
            <button
              key={t.id}
              onClick={() => {
                setMiId(t.id);
                setMisHorarios([]); // Limpiar para efecto visual de recarga
              }}
              className={`px-4 py-2 rounded-xl font-bold uppercase transition-all duration-200 ${
                miId === t.id 
                  ? "bg-indigo-600 text-white shadow-md scale-105" 
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* 2. MOSTRAR SEMANAS SOLO SI HAY UN TRABAJADOR SELECCIONADO */}
      {miId && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {[1, 2, 3, 4, 5, 6].map(numSemana => {
            const turnosSemana = horariosPorSemana[numSemana];
            const tieneTurnos = turnosSemana && turnosSemana.length > 0;
            const estaAbierto = semanaAbierta === numSemana;

            // No mostramos la semana 6 si el mes no tiene 6 semanas
            if (numSemana === 6 && !tieneTurnos) return null;

            return (
              <div key={`semana-${numSemana}`} className="flex flex-col gap-2">
                {/* BOTÓN DE LA SEMANA */}
                <button
                  disabled={!tieneTurnos}
                  onClick={() => setSemanaAbierta(estaAbierto ? null : numSemana)}
                  className={`w-full flex justify-between items-center p-4 rounded-2xl font-black uppercase transition-all border ${
                    !tieneTurnos 
                      ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed opacity-60" // Vacío y bloqueado
                      : estaAbierto
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700" // Abierto
                        : "bg-white border-slate-200 text-slate-700 hover:border-indigo-300 shadow-sm" // Cerrado pero con datos
                  }`}
                >
                  <span>Semana {numSemana}</span>
                  {tieneTurnos && (
                    <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-1 rounded-md">
                      {estaAbierto ? "Ocultar ▴" : `${turnosSemana.length} Turnos ▾`}
                    </span>
                  )}
                  {!tieneTurnos && <span className="text-[10px]">Sin turnos</span>}
                </button>

                {/* CONTENIDO COLLAPSABLE DE LA SEMANA */}
                {estaAbierto && tieneTurnos && (
                  <div className="space-y-3 pl-2 pr-1 py-2 animate-in fade-in slide-in-from-top-1">
                    {turnosSemana.map(h => (
                      <div key={h.id} className={`p-4 rounded-xl border-l-[5px] transition-all ${
                        h.tipo_turno === "DESCANSO" 
                          ? "bg-amber-50 border-amber-500" 
                          : h.tipo_turno === "MAÑANA" 
                            ? "bg-sky-50 border-sky-500 shadow-sm"
                            : "bg-white border-indigo-500 shadow-sm"
                      }`}>
                        
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-slate-800 capitalize">
                              {new Date(h.fecha + "T00:00:00").toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                            </p>
                            
                            {h.tipo_turno !== "DESCANSO" ? (
                              <p className="text-sm text-slate-500 font-semibold mt-1">🕒 {h.hora_inicio.slice(0,5)} - {h.hora_fin.slice(0,5)}</p>
                            ) : (
                              <p className="text-sm text-amber-600 font-bold mt-1">🛑 Motivo: {h.motivo_descanso}</p>
                            )}
                          </div>

                          <span className={`text-[10px] px-2 py-1 rounded font-black uppercase ${
                            h.tipo_turno === "DESCANSO" ? "bg-amber-200 text-amber-800" : 
                            h.tipo_turno === "MAÑANA" ? "bg-sky-200 text-sky-800" :
                            "bg-indigo-100 text-indigo-800"
                          }`}>
                            {h.tipo_turno}
                          </span>
                        </div>

                        {/* NOTA ESPECIAL PARA PROVEEDORES (SOLO SI ES TURNO MAÑANA) */}
                        {h.tipo_turno === "MAÑANA" && h.nota_proveedor && (
                          <div className="mt-3 p-3 bg-white border border-sky-100 rounded-lg flex items-start gap-3 shadow-sm">
                            <span className="text-xl">🚚</span>
                            <div>
                              <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest">Recepción Programada</p>
                              <p className="text-sm font-bold text-slate-700 leading-tight">{h.nota_proveedor}</p>
                            </div>
                          </div>
                        )}

                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {!miId && (
        <div className="py-10 text-center opacity-40">
          <span className="text-4xl">👋</span>
          <p className="mt-2 font-bold uppercase text-sm tracking-widest">Selecciona tu nombre</p>
        </div>
      )}
    </div>
  );
}