"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

// Configuraciones predeterminadas para evitar digitar
const TURNOS_PREDEF = {
  MAÑANA: { inicio: "10:00", fin: "16:00" },
  MEDIO: { inicio: "12:00", fin: "19:00" },
  NOCHE: { inicio: "16:00", fin: "23:00" },
  DESCANSO: { inicio: "", fin: "" },
};

export default function AdminCalendarioHorarios() {
  const [trabajadores, setTrabajadores] = useState<any[]>([]);
  const [horarios, setHorarios] = useState<any[]>([]);
  
  // Controles de fecha
  const fechaActual = new Date();
  const [mes, setMes] = useState(fechaActual.getMonth());
  const [anio, setAnio] = useState(fechaActual.getFullYear());

  // Estado del Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [diaSeleccionado, setDiaSeleccionado] = useState(1);
  const [turnoAEditar, setTurnoAEditar] = useState<any>(null); // Novedad: Saber si estamos editando
  
  // Formulario del Modal
  const [trabajadorSel, setTrabajadorSel] = useState("");
  const [tipoTurno, setTipoTurno] = useState<"MAÑANA"|"MEDIO"|"NOCHE"|"DESCANSO">("MAÑANA");
  const [horaInicio, setHoraInicio] = useState(TURNOS_PREDEF["MAÑANA"].inicio);
  const [horaFin, setHoraFin] = useState(TURNOS_PREDEF["MAÑANA"].fin);
  const [motivoDescanso, setMotivoDescanso] = useState("REGULAR");

  const cargarDatos = async () => {
    const { data: tData } = await supabase.from("trabajadores").select("*").order("nombre");
    if (tData) setTrabajadores(tData);

    const primerDia = new Date(anio, mes, 1).toISOString().split('T')[0];
    const ultimoDia = new Date(anio, mes + 1, 0).toISOString().split('T')[0];

    const { data: hData } = await supabase
      .from("horarios")
      .select("*, trabajadores(nombre)")
      .gte("fecha", primerDia)
      .lte("fecha", ultimoDia);
    
    if (hData) setHorarios(hData);
  };

  useEffect(() => {
    cargarDatos();
  }, [mes, anio]);

  const diasDelMes = new Date(anio, mes + 1, 0).getDate();
  const primerDiaSemana = new Date(anio, mes, 1).getDay();
  const celdasVacias = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1; 

  // --- NUEVA LÓGICA DE MODALES ---

  // 1. Abrir modal para crear uno nuevo
  const abrirModalNuevo = (dia: number) => {
    setDiaSeleccionado(dia);
    setTurnoAEditar(null); // Aseguramos que es nuevo
    setTrabajadorSel("");
    manejarCambioTurno("MAÑANA");
    setModalAbierto(true);
  };

  // 2. Abrir modal para editar uno existente
  const abrirModalEditar = (dia: number, turno: any, e: React.MouseEvent) => {
    e.stopPropagation(); // Evita que el clic se pase al recuadro de fondo (abrirModalNuevo)
    setDiaSeleccionado(dia);
    setTurnoAEditar(turno);
    
    // Rellenamos el formulario con los datos del turno clickeado
    setTrabajadorSel(turno.trabajador_id.toString());
    setTipoTurno(turno.tipo_turno);
    
    if (turno.tipo_turno !== "DESCANSO") {
      setHoraInicio(turno.hora_inicio.slice(0, 5)); // Cortamos los segundos '10:00:00' -> '10:00'
      setHoraFin(turno.hora_fin.slice(0, 5));
    } else {
      setMotivoDescanso(turno.motivo_descanso || "REGULAR");
    }
    
    setModalAbierto(true);
  };

  const manejarCambioTurno = (turno: "MAÑANA"|"MEDIO"|"NOCHE"|"DESCANSO") => {
    setTipoTurno(turno);
    setHoraInicio(TURNOS_PREDEF[turno].inicio);
    setHoraFin(TURNOS_PREDEF[turno].fin);
  };

  // 3. Guardar o Actualizar
  const guardarTurno = async (e: React.FormEvent) => {
    e.preventDefault();
    const esDescanso = tipoTurno === "DESCANSO";
    const fechaFormat = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(diaSeleccionado).padStart(2, '0')}`;

    // Upsert actualizará automáticamente si ya existe un turno para ese trabajador ese día
    const { error } = await supabase.from("horarios").upsert({
      ...(turnoAEditar ? { id: turnoAEditar.id } : {}), // Si editamos, pasamos el ID explícito
      trabajador_id: trabajadorSel,
      fecha: fechaFormat,
      tipo_turno: tipoTurno,
      hora_inicio: esDescanso ? null : horaInicio,
      hora_fin: esDescanso ? null : horaFin,
      motivo_descanso: esDescanso ? motivoDescanso : null,
    }, { onConflict: 'trabajador_id, fecha' });

    if (!error) {
      cargarDatos();
      setModalAbierto(false);
    } else {
      alert("Error al guardar el horario.");
    }
  };

  // 4. Eliminar
  const eliminarTurno = async () => {
    if (!turnoAEditar) return;
    
    const confirmar = window.confirm("¿Estás seguro de eliminar este turno?");
    if (!confirmar) return;

    const { error } = await supabase.from("horarios").delete().eq("id", turnoAEditar.id);
    
    if (!error) {
      cargarDatos();
      setModalAbierto(false);
    } else {
      alert("Error al eliminar el turno.");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm">
        <button onClick={() => setMes(m => m - 1)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-slate-700 transition">{"<"} Mes Ant.</button>
        <h1 className="text-2xl font-black uppercase text-indigo-700 tracking-wider">
          {new Date(anio, mes).toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
        </h1>
        <button onClick={() => setMes(m => m + 1)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-slate-700 transition">Sig. Mes {">"}</button>
      </div>

      {/* CALENDARIO GRID */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(dia => (
            <div key={dia} className="py-3 text-center text-xs font-black text-slate-500 uppercase tracking-widest">{dia}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 auto-rows-fr">
          {Array.from({ length: celdasVacias }).map((_, i) => (
            <div key={`vacio-${i}`} className="min-h-[120px] bg-slate-50 border-r border-b border-slate-100"></div>
          ))}

          {Array.from({ length: diasDelMes }).map((_, i) => {
            const dia = i + 1;
            const fechaFormat = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            const horariosDelDia = horarios.filter(h => h.fecha === fechaFormat);

            return (
              <div 
                key={dia} 
                onClick={() => abrirModalNuevo(dia)}
                className="min-h-[120px] p-2 border-r border-b border-slate-200 hover:bg-indigo-50 transition cursor-pointer group relative flex flex-col"
              >
                <span className="text-sm font-bold text-slate-400 group-hover:text-indigo-600">{dia}</span>
                
                {/* Lista de turnos en la celda */}
                <div className="mt-1 flex flex-col gap-1 flex-1">
                  {horariosDelDia.map(h => (
                    <div 
                      key={h.id} 
                      onClick={(e) => abrirModalEditar(dia, h, e)}
                      className={`text-[10px] p-1.5 rounded font-bold truncate transition hover:opacity-75 hover:scale-[1.02] shadow-sm ${
                        h.tipo_turno === 'MAÑANA' ? 'bg-sky-100 text-sky-800' :
                        h.tipo_turno === 'MEDIO' ? 'bg-emerald-100 text-emerald-800' :
                        h.tipo_turno === 'NOCHE' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {h.trabajadores?.nombre.split(' ')[0]} - {h.tipo_turno === 'DESCANSO' ? 'DESC' : h.hora_inicio.slice(0,5)}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL FLOTANTE */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => setModalAbierto(false)} 
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 font-bold"
            >
              ✕
            </button>
            
            <h2 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight">
              {turnoAEditar ? "Editar Turno:" : "Asignar Turno:"} <span className="text-indigo-600">{diaSeleccionado} de {new Date(anio, mes).toLocaleString('es-ES', { month: 'long' })}</span>
            </h2>

            <form onSubmit={guardarTurno} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Trabajador</label>
                <select required value={trabajadorSel} onChange={e => setTrabajadorSel(e.target.value)} disabled={!!turnoAEditar} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:border-indigo-500 mt-1 disabled:opacity-50 disabled:cursor-not-allowed">
                  <option value="">Seleccionar trabajador...</option>
                  {trabajadores.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Turno Rápido</label>
                <select 
                  value={tipoTurno} 
                  onChange={e => manejarCambioTurno(e.target.value as any)} 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:border-indigo-500 mt-1"
                >
                  <option value="MAÑANA">Mañana</option>
                  <option value="MEDIO">Medio</option>
                  <option value="NOCHE">Noche</option>
                  <option value="DESCANSO">Día Libre / Descanso</option>
                </select>
              </div>

              {tipoTurno !== "DESCANSO" ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Entrada</label>
                    <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Salida</label>
                    <input type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold mt-1" />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Motivo de Descanso</label>
                  <select value={motivoDescanso} onChange={e => setMotivoDescanso(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold mt-1">
                    <option value="REGULAR">Descanso Semanal</option>
                    <option value="CUMPLEAÑOS">Cumpleaños 🎉</option>
                    <option value="MEDICO">Descanso Médico 🏥</option>
                    <option value="EMERGENCIA">Emergencia Familiar</option>
                  </select>
                </div>
              )}

              {/* CONTROLES DEL MODAL */}
              <div className="flex gap-3 mt-6 pt-2 border-t border-slate-100">
                {turnoAEditar && (
                  <button type="button" onClick={eliminarTurno} className="w-1/3 bg-red-50 hover:bg-red-100 text-red-600 font-bold uppercase tracking-widest p-4 rounded-xl transition-all">
                    Borrar
                  </button>
                )}
                <button type="submit" className={`${turnoAEditar ? 'w-2/3' : 'w-full'} bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest p-4 rounded-xl shadow-lg shadow-indigo-200 transition-all`}>
                  {turnoAEditar ? "Actualizar" : "Guardar Nuevo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}