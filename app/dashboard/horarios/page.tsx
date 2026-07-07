"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

// Configuraciones predeterminadas para evitar digitar
const TURNOS_PREDEF = {
  MAÑANA: { inicio: "10:00", fin: "16:00" },
  MEDIO: { inicio: "12:00", fin: "19:00" },
  NOCHE: { inicio: "16:00", fin: "23:00" },
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
  const [turnoAEditar, setTurnoAEditar] = useState<any>(null);
  
  // Formulario del Modal
  const [trabajadorSel, setTrabajadorSel] = useState("");
  const [esDescansoDia, setEsDescansoDia] = useState(false); // NUEVO ESTADO CONTROLA EL DESCANSO
  const [tipoTurno, setTipoTurno] = useState<"MAÑANA"|"MEDIO"|"NOCHE">("MAÑANA");
  const [horaInicio, setHoraInicio] = useState(TURNOS_PREDEF["MAÑANA"].inicio);
  const [horaFin, setHoraFin] = useState(TURNOS_PREDEF["MAÑANA"].fin);
  const [motivoDescanso, setMotivoDescanso] = useState("REGULAR");
  const [notaProveedor, setNotaProveedor] = useState("");
  
  // Opción Experta: Automatización
  const [automatizarSemana, setAutomatizarSemana] = useState(false);
  const [diasDescansoSel, setDiasDescansoSel] = useState<string[]>([]);

  // Obtener la fecha de hoy en formato local YYYY-MM-DD para las comparaciones
  const t = new Date();
  const hoyStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;

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

  // --- LÓGICA DE MODALES ---

  const abrirModalNuevo = (dia: number) => {
    const fechaFormat = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    
    if (fechaFormat < hoyStr) {
      alert("No se pueden asignar turnos en días que ya pasaron.");
      return;
    }

    setDiaSeleccionado(dia);
    setTurnoAEditar(null);
    setTrabajadorSel("");
    setEsDescansoDia(false);
    manejarCambioTurno("MAÑANA");
    setNotaProveedor("");
    setAutomatizarSemana(false);
    setDiasDescansoSel([]);
    setModalAbierto(true);
  };

  const abrirModalEditar = (dia: number, turno: any, e: React.MouseEvent) => {
    e.stopPropagation(); 
    const fechaFormat = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    
    if (fechaFormat < hoyStr) {
      alert("No se pueden modificar los turnos de días pasados.");
      return;
    }

    setDiaSeleccionado(dia);
    setTurnoAEditar(turno);
    setAutomatizarSemana(false);
    setTrabajadorSel(turno.trabajador_id.toString());
    setNotaProveedor(turno.nota_proveedor || "");

    // Si es un descanso, activamos el check y preparamos un turno por defecto por si lo desmarca
    if (turno.tipo_turno === "DESCANSO") {
      setEsDescansoDia(true);
      setMotivoDescanso(turno.motivo_descanso || "REGULAR");
      setTipoTurno("MAÑANA"); 
      setHoraInicio(TURNOS_PREDEF["MAÑANA"].inicio);
      setHoraFin(TURNOS_PREDEF["MAÑANA"].fin);
    } else {
      setEsDescansoDia(false);
      setTipoTurno(turno.tipo_turno);
      setHoraInicio(turno.hora_inicio?.slice(0, 5) || ""); 
      setHoraFin(turno.hora_fin?.slice(0, 5) || "");
    }
    
    setModalAbierto(true);
  };

  const manejarCambioTurno = (turno: "MAÑANA"|"MEDIO"|"NOCHE") => {
    setTipoTurno(turno);
    setHoraInicio(TURNOS_PREDEF[turno].inicio);
    setHoraFin(TURNOS_PREDEF[turno].fin);
  };

  const toggleDiaDescanso = (diaValor: string) => {
    setDiasDescansoSel(prev => 
      prev.includes(diaValor) ? prev.filter(d => d !== diaValor) : [...prev, diaValor]
    );
  };

  // --- GUARDADO Y AUTOMATIZACIÓN ---

  const guardarTurno = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (automatizarSemana && !turnoAEditar) {
        const dateBase = new Date(anio, mes, diaSeleccionado);
        const day = dateBase.getDay();
        const diff = dateBase.getDate() - day + (day === 0 ? -6 : 1); 
        const lunes = new Date(anio, mes, diff);

        const registrosSemana = [];
        
        for (let i = 0; i < 7; i++) {
          const cur = new Date(lunes);
          cur.setDate(lunes.getDate() + i);
          
          if (cur.getMonth() !== mes) continue;
          
          const y = cur.getFullYear();
          const m = String(cur.getMonth() + 1).padStart(2, '0');
          const d = String(cur.getDate()).padStart(2, '0');
          const fechaLoopStr = `${y}-${m}-${d}`;
          const diaLoopStr = cur.getDay().toString();
          
          if (fechaLoopStr < hoyStr) continue;

          const esDiaDeDescansoElegido = diasDescansoSel.includes(diaLoopStr);

          registrosSemana.push({
            trabajador_id: parseInt(trabajadorSel),
            fecha: fechaLoopStr,
            tipo_turno: esDiaDeDescansoElegido ? "DESCANSO" : tipoTurno,
            hora_inicio: esDiaDeDescansoElegido ? null : horaInicio,
            hora_fin: esDiaDeDescansoElegido ? null : horaFin,
            motivo_descanso: esDiaDeDescansoElegido ? "REGULAR" : null,
            nota_proveedor: !esDiaDeDescansoElegido ? notaProveedor : null
          });
        }

        if (registrosSemana.length > 0) {
          const { error } = await supabase.from("horarios").upsert(registrosSemana, { onConflict: 'trabajador_id, fecha' });
          if (error) throw error;
        }

      } else {
        const fechaFormat = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(diaSeleccionado).padStart(2, '0')}`;
        
        const payload = {
          trabajador_id: parseInt(trabajadorSel),
          fecha: fechaFormat,
          tipo_turno: esDescansoDia ? "DESCANSO" : tipoTurno,
          hora_inicio: esDescansoDia ? null : horaInicio,
          hora_fin: esDescansoDia ? null : horaFin,
          motivo_descanso: esDescansoDia ? motivoDescanso : null,
          nota_proveedor: esDescansoDia ? null : notaProveedor
        };

        const { error } = await supabase.from("horarios").upsert(
          turnoAEditar ? { id: turnoAEditar.id, ...payload } : payload, 
          { onConflict: 'trabajador_id, fecha' }
        );
        if (error) throw error;
      }

      cargarDatos();
      setModalAbierto(false);
    } catch (err) {
      console.error(err);
      alert("Error al guardar el horario.");
    }
  };

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
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      
      {/* CABECERA DEL MES */}
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
            
            const horariosDelDia = horarios
            .filter(h => h.fecha === fechaFormat)
            .sort((a, b) => {
              const ordenTurno: Record<string, number> = { "MAÑANA": 1, "MEDIO": 2, "NOCHE": 3, "DESCANSO": 4 };
              const ordenA = ordenTurno[a.tipo_turno] || 5;
              const ordenB = ordenTurno[b.tipo_turno] || 5;
              
              if (ordenA === ordenB) {
                return (a.trabajadores?.nombre || "").localeCompare(b.trabajadores?.nombre || "");
              }
              return ordenA - ordenB;
            });

            const esPasado = fechaFormat < hoyStr;

            return (
              <div 
                key={dia} 
                onClick={() => abrirModalNuevo(dia)}
                className={`min-h-[120px] p-2 border-r border-b border-slate-200 transition flex flex-col relative ${
                  esPasado 
                    ? "bg-slate-50/70 cursor-not-allowed select-none" 
                    : "hover:bg-indigo-50 cursor-pointer group"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className={`text-sm font-bold ${esPasado ? 'text-slate-300' : 'text-slate-400 group-hover:text-indigo-600'}`}>{dia}</span>
                  {fechaFormat === hoyStr && <span className="bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter shadow-sm">Hoy</span>}
                </div>
                
                <div className="mt-1 flex flex-col gap-1 flex-1">
                  {horariosDelDia.map(h => (
                    <div 
                      key={h.id} 
                      onClick={(e) => abrirModalEditar(dia, h, e)}
                      className={`text-[11px] p-1.5 rounded font-bold truncate transition shadow-sm flex justify-between items-center ${
                        esPasado ? 'opacity-60 grayscale-[30%] cursor-not-allowed' : 'hover:opacity-75 hover:scale-[1.02]'
                      } ${
                        h.tipo_turno === 'MAÑANA' ? 'bg-sky-100 text-sky-800' :
                        h.tipo_turno === 'MEDIO' ? 'bg-emerald-100 text-emerald-800' :
                        h.tipo_turno === 'NOCHE' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-amber-100 text-amber-800'
                      }`}
                    >
                      <span>{h.trabajadores?.nombre.split(' ')[0]} - {h.tipo_turno === 'DESCANSO' ? 'DESC' : h.hora_inicio?.slice(0,5)}</span>
                      {h.nota_proveedor && <span title="Nota de Proveedor">🚚</span>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RESUMEN DE QUINCENAS */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-black uppercase text-slate-800 mb-4 border-b pb-2">📊 Resumen de Días Trabajados</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase tracking-widest text-[10px]">
                <th className="p-3 rounded-tl-lg">Trabajador</th>
                <th className="p-3 text-center">1ra Quincena (1 - 15)</th>
                <th className="p-3 text-center">2da Quincena (16 - {diasDelMes})</th>
                <th className="p-3 text-center bg-indigo-50 rounded-tr-lg text-indigo-700">Total Mes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trabajadores.map(t => {
                const turnosTrabajador = horarios.filter(h => h.trabajador_id === t.id && h.tipo_turno !== "DESCANSO");
                const diasQ1 = turnosTrabajador.filter(h => parseInt(h.fecha.split('-')[2]) <= 15).length;
                const diasQ2 = turnosTrabajador.filter(h => parseInt(h.fecha.split('-')[2]) >= 16).length;
                const total = diasQ1 + diasQ2;

                return (
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-bold text-slate-800 uppercase">{t.nombre}</td>
                    <td className="p-3 text-center font-bold text-emerald-600">{diasQ1} días</td>
                    <td className="p-3 text-center font-bold text-sky-600">{diasQ2} días</td>
                    <td className="p-3 text-center font-black text-indigo-700 bg-indigo-50/50">{total} días</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FLOTANTE */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative my-8">
            <button onClick={() => setModalAbierto(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 font-bold">✕</button>
            
            <h2 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight">
              {turnoAEditar ? "Editar Turno:" : "Asignar Turno:"} <span className="text-indigo-600">{diaSeleccionado} de {new Date(anio, mes).toLocaleString('es-ES', { month: 'long' })}</span>
            </h2>

            <form onSubmit={guardarTurno} className="space-y-4">
              
              {/* ZONA DE CONTROLES RÁPIDOS: DESCANSO Y AUTOMATIZAR */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={esDescansoDia} 
                      onChange={e => setEsDescansoDia(e.target.checked)} 
                      className="w-5 h-5 accent-emerald-600 rounded cursor-pointer" 
                    />
                    <span className={`text-xs font-black uppercase tracking-widest ${esDescansoDia ? 'text-emerald-700' : 'text-slate-500'}`}>
                      🌴 Es Día de Descanso
                    </span>
                  </label>

                  {!turnoAEditar && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={automatizarSemana} 
                        onChange={e => setAutomatizarSemana(e.target.checked)} 
                        className="w-5 h-5 accent-indigo-600 rounded cursor-pointer" 
                      />
                      <span className={`text-xs font-black uppercase tracking-widest ${automatizarSemana ? 'text-indigo-700' : 'text-slate-500'}`}>
                        ⚡ Automatizar Semana
                      </span>
                    </label>
                  )}
                </div>
                
                {/* Opciones de la semana automatizada */}
                {automatizarSemana && !turnoAEditar && (
                  <div className="mt-2 pl-2 animate-in fade-in border-t border-slate-200 pt-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Días Libres de esta semana:</label>
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {[
                        { val: "1", label: "Lun" }, { val: "2", label: "Mar" }, { val: "3", label: "Mié" },
                        { val: "4", label: "Jue" }, { val: "5", label: "Vie" }, { val: "6", label: "Sáb" },
                        { val: "0", label: "Dom" },
                      ].map(d => (
                        <button
                          key={d.val}
                          type="button"
                          onClick={() => toggleDiaDescanso(d.val)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors border ${
                            diasDescansoSel.includes(d.val)
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                              : "bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Trabajador</label>
                <select required value={trabajadorSel} onChange={e => setTrabajadorSel(e.target.value)} disabled={!!turnoAEditar} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:border-indigo-500 mt-1 disabled:opacity-50">
                  <option value="">Seleccionar trabajador...</option>
                  {trabajadores.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>

              {/* LÓGICA DE VISTAS (TRABAJO vs DESCANSO) */}
              {!esDescansoDia ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Turno Rápido</label>
                    <select value={tipoTurno} onChange={e => manejarCambioTurno(e.target.value as any)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:border-indigo-500 mt-1">
                      <option value="MAÑANA">Mañana</option>
                      <option value="MEDIO">Medio</option>
                      <option value="NOCHE">Noche</option>
                    </select>
                  </div>

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

                  <div>
                    <label className="text-xs font-bold text-sky-600 uppercase tracking-widest flex items-center gap-1">🚚 Nota Recepción Proveedor</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Recibir Backus 50 cajas..." 
                      value={notaProveedor} 
                      onChange={e => setNotaProveedor(e.target.value)} 
                      className="w-full p-3 bg-sky-50 border border-sky-200 rounded-xl font-bold text-slate-700 mt-1 placeholder-sky-300 outline-none focus:border-sky-500" 
                    />
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Motivo de Descanso</label>
                  <select value={motivoDescanso} onChange={e => setMotivoDescanso(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold mt-1">
                    <option value="REGULAR">Descanso Semanal</option>
                    <option value="CUMPLEAÑOS">Cumpleaños 🎉</option>
                    <option value="MEDICO">Descanso Médico 🏥</option>
                    <option value="EMERGENCIA">Emergencia Familiar</option>
                  </select>
                </div>
              )}

              <div className="flex gap-3 mt-6 pt-2 border-t border-slate-100">
                {turnoAEditar && (
                  <button type="button" onClick={eliminarTurno} className="w-1/3 bg-red-50 hover:bg-red-100 text-red-600 font-bold uppercase tracking-widest p-4 rounded-xl transition-all">
                    Borrar
                  </button>
                )}
                <button type="submit" className={`${turnoAEditar ? 'w-2/3' : 'w-full'} bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest p-4 rounded-xl shadow-lg shadow-indigo-200 transition-all`}>
                  {automatizarSemana && !turnoAEditar ? "Guardar Semana ⚡" : (turnoAEditar ? "Actualizar" : "Guardar Nuevo")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}