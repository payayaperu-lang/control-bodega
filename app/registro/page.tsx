"use client";

import React, { useState, useEffect, useRef } from 'react';

// ==========================================
// INTERFACES Y DATOS BASE
// ==========================================
interface ProductoSimulado {
  id: string;
  nombre: string;
  slot: string;
  cantidad: number;
  estado: 'optimo' | 'critico' | 'vencer';
  icono: string;
}

interface LogActividad {
  id: string;
  usuario: string;
  accion: string;
  tiempo: string;
  xp: number;
  gif?: string;
}

interface ProductoCanje {
  id: string;
  nombre: string;
  costo: number;
  icono: string;
}

const LOGROS = [
  { id: 'constancia', titulo: 'Constancia Férrea', desc: 'Días seguidos', progreso: 5, total: 7, icono: '🔥', color: 'from-orange-500 to-amber-400' },
  { id: 'abastecedor', titulo: 'Abastecedor Elite', desc: 'Slots al 100%', progreso: 3, total: 3, icono: '⚡', color: 'from-blue-600 to-cyan-400' },
  { id: 'alerta', titulo: 'Visión Rayos X', desc: 'Reportes', progreso: 8, total: 10, icono: '🛡️', color: 'from-emerald-500 to-teal-400' },
  { id: 'envases', titulo: 'Rey del Retorno', desc: 'Envases', progreso: 45, total: 50, icono: '♻️', color: 'from-purple-600 to-indigo-400' },
];

const GALERIA_GIFS_DB = [
  { id: 'g1', url: 'https://media.giphy.com/media/xT0xezQGU5xCDJuCPe/giphy.gif', tag: 'exito bien logrado fiesta' },
  { id: 'g2', url: 'https://media.giphy.com/media/l41lTjJp8yYyG2bkc/giphy.gif', tag: 'trabajo trabajando pc' },
  { id: 'g3', url: 'https://media.giphy.com/media/11sBLVxNs7v6WA/giphy.gif', tag: 'ok pulgar arriba' },
  { id: 'g4', url: 'https://media.giphy.com/media/3o7TKDk86KxNpqQjG0/giphy.gif', tag: 'alerta peligro' },
  { id: 'g5', url: 'https://media.giphy.com/media/xT5LMHxhOfscxPfIfm/giphy.gif', tag: 'cansado uff' },
  { id: 'g6', url: 'https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif', tag: 'pensando idea' },
];

const TIENDA_CANJES: ProductoCanje[] = [
  { id: 't1', nombre: 'Polo Oficial', costo: 1500, icono: '👕' },
  { id: 't2', nombre: 'Gorra Premium', costo: 800, icono: '🧢' },
  { id: 't3', nombre: 'Six-Pack Libre', costo: 2500, icono: '🍻' },
  { id: 't4', nombre: 'Vale de Almuerzo', costo: 3000, icono: '🍛' },
];

export default function RegistroPage() {
  // ==========================================
  // ESTADOS DE LA APLICACIÓN
  // ==========================================
  const [userXP, setUserXP] = useState<number>(2450); 
  const XP_POR_NIVEL = 1000;
  const userLevel = Math.floor(userXP / XP_POR_NIVEL) + 1;
  const progresoNivel = ((userXP % XP_POR_NIVEL) / XP_POR_NIVEL) * 100;

  const [puntos, setPuntos] = useState<number>(1420); 
  const [rachaDias] = useState<number>(5);

  const [gifsEncontrados, setGifsEncontrados] = useState<any[]>([]);
  const [animacionPersonaje, setAnimacionPersonaje] = useState<'idle' | 'saludar' | 'bailar'>('idle');

  const [pasoFlujo, setPasoFlujo] = useState<number>(0); 
  const [respuestasFlujo, setRespuestasFlujo] = useState<any>({});
  const [historialTurno, setHistorialTurno] = useState<string[]>([]);

  const [nuevaAcotacion, setNuevaAcotacion] = useState<string>('');
  const [nuevoGifUrl, setNuevoGifUrl] = useState<string>('');
  const [mostrarBaulGifs, setMostrarBaulGifs] = useState<boolean>(false);
  const [terminoBusquedaGif, setTerminoBusquedaGif] = useState<string>('');
  const [feedPosts, setFeedPosts] = useState<LogActividad[]>([
    { id: 'l1', usuario: 'CAJERAS.', accion: 'Visicooler limpio y abastecido para la tarde.', tiempo: 'Hace 5 min', xp: 50, gif: 'https://media.giphy.com/media/11sBLVxNs7v6WA/giphy.gif' }
  ]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ==========================================
  // INTERRUPTOR DE BÚSQUEDA (API + LOCAL)
  // ==========================================
  useEffect(() => {
    const buscarGifsAPI = async () => {
      if (terminoBusquedaGif.trim().length < 3) {
        setGifsEncontrados([]);
        return;
      }
      
      try {
        const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY;
        if (!apiKey) {
          // Si no hay API Key, filtramos la DB estática local como respaldo
          const locales = GALERIA_GIFS_DB.filter(g => g.tag.includes(terminoBusquedaGif.toLowerCase()));
          setGifsEncontrados(locales);
          return;
        }
        const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${terminoBusquedaGif}&limit=9`);
        const data = await res.json();
        if (data.data) setGifsEncontrados(data.data.map((g: any) => ({ id: g.id, url: g.images.fixed_height.url })));
      } catch (error) {
        console.error("Error buscando GIFs:", error);
      }
    };

    const delayDebounce = setTimeout(buscarGifsAPI, 400);
    return () => clearTimeout(delayDebounce);
  }, [terminoBusquedaGif]);

  // ==========================================
  // MOTOR CANVAS (Mascota)
  // ==========================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let tick = 0;

    const render = () => {
      tick += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2 + 10;
      
      let bodyX = cx;
      let bodyY = cy;
      let rotation = 0;
      let wave = 0;

      if (animacionPersonaje === 'bailar') {
        bodyY += Math.abs(Math.sin(tick * 3)) * 10 - 5; 
        rotation = Math.sin(tick * 2) * 0.2; 
      } else if (animacionPersonaje === 'saludar') {
        wave = Math.sin(tick * 4) * 0.5; 
      }

      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 55, 30 + (animacionPersonaje === 'bailar' ? Math.abs(Math.sin(tick * 3)) * 5 : 0), 8, 0, 0, 2 * Math.PI);
      ctx.fill();

      ctx.save();
      ctx.translate(bodyX, bodyY);
      ctx.rotate(rotation);

      const breatheY = animacionPersonaje === 'idle' ? Math.sin(tick) * 3 : 0;
      const breatheX = animacionPersonaje === 'idle' ? Math.cos(tick) * 1.5 : 0;

      // Cuerpo
      ctx.fillStyle = '#fb923c'; 
      ctx.beginPath();
      ctx.ellipse(0, 10, 38 + breatheX, 42 + breatheY, 0, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Brazo saludando
      if (animacionPersonaje === 'saludar') {
        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(35, 10);
        ctx.quadraticCurveTo(55, -10 + (wave * 20), 45, -30 + (wave * 20));
        ctx.stroke();
      }

      // Ojos
      const parpadeo = Math.sin(tick * 0.5) > 0.98 ? 1 : 8;
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(-12, 0, 5, parpadeo, 0, 0, 2 * Math.PI); 
      ctx.ellipse(12, 0, 5, parpadeo, 0, 0, 2 * Math.PI); 
      ctx.fill();

      // Sonrisa
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      if (animacionPersonaje === 'bailar' || animacionPersonaje === 'saludar') {
        ctx.arc(0, 10, 10, 0, Math.PI, false);
      } else {
        ctx.arc(0, 10, 8, 0, Math.PI, false);
      }
      ctx.stroke();

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [animacionPersonaje]);

  // ==========================================
  // FUNCIONES DE LÓGICA
  // ==========================================
  const ejecutarMision = (xpGanada: number, puntosGanados: number, txt: string) => {
    setUserXP(prev => prev + xpGanada);
    setPuntos(prev => prev + puntosGanados);
    setHistorialTurno(prev => [txt, ...prev]);
  };

  const publicarAcotacion = () => {
    if (!nuevaAcotacion.trim() && !nuevoGifUrl) return;
    const nuevoPost: LogActividad = {
      id: Math.random().toString(36).substring(2, 9), // Seguro contra errores de hidratación
      usuario: 'Tú',
      accion: nuevaAcotacion,
      tiempo: 'Ahora mismo',
      xp: 20,
      gif: nuevoGifUrl || undefined
    };
    setFeedPosts([nuevoPost, ...feedPosts]);
    setNuevaAcotacion('');
    setNuevoGifUrl('');
    setMostrarBaulGifs(false);
    ejecutarMision(20, 10, "Acotación publicada");
  };

  const canjearProducto = (producto: ProductoCanje) => {
    if (puntos >= producto.costo) {
      setPuntos(prev => prev - producto.costo);
      ejecutarMision(50, 0, `Canjeaste: ${producto.nombre}`);
      alert(`¡Felicidades! Has canjeado ${producto.nombre}. Se notificará al supervisor para la entrega.`);
    } else {
      alert("No tienes suficientes Puntos para este canje.");
    }
  };

  const manejarRespuestaFlujo = (clave: string, valor: string, siguientePaso: number) => {
    setRespuestasFlujo((prev: any) => ({ ...prev, [clave]: valor }));
    setPasoFlujo(siguientePaso);
  };

  // Mezclamos resultados locales de backup y de la API si los hay
// LÍNEA ORIGINAL:
const listaGifsAMostrar = terminoBusquedaGif.length >= 3 && gifsEncontrados.length > 0
  ? gifsEncontrados 
  : GALERIA_GIFS_DB.filter(g => g.tag.includes(terminoBusquedaGif.toLowerCase()));

  const productosVisicooler: ProductoSimulado[] = [
    { id: 'p1', nombre: 'Pilsen 630ml', slot: 'Slot Inferior (Grande)', cantidad: 32, estado: 'optimo', icono: '🍺' },
    { id: 'p2', nombre: 'Pilsen 311ml', slot: 'Slot Medio (Mediano)', cantidad: 24, estado: 'optimo', icono: '🍻' },
    { id: 'p3', nombre: 'Pilsen Lata', slot: 'Slot Superior (Mediano)', cantidad: 10, estado: 'vencer', icono: '🥫' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased pb-12">
      
      {/* HEADER */}
      <header className="w-full bg-white border-b border-slate-200  top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 font-black text-white flex items-center justify-center text-xl shadow-md">
              CJ
            </div>
            <div className="flex-1 max-w-xs">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-base font-black text-slate-900">CAJERAS (DEMO)</h1>
                <span className="text-[10px] bg-slate-900 text-white font-bold px-2 py-0.5 rounded-full">NIVEL {userLevel}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full transition-all" style={{ width: `${progresoNivel}%` }}></div>
              </div>
              <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{userXP} XP Total</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 text-sm">
            <div className="bg-white border border-slate-200 shadow-sm px-4 py-2 rounded-xl font-bold flex items-center gap-2">
              <span className="text-orange-500 text-lg">🔥</span> {rachaDias} Días
            </div>
            <div className="bg-gradient-to-r from-amber-100 to-yellow-100 border border-amber-200 shadow-sm px-4 py-2 rounded-xl font-black text-amber-800 flex items-center gap-2">
              <span className="text-yellow-600 text-lg">🪙</span> {puntos} Puntos
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA IZQUIERDA */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* LOGROS */}
          <section>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">Tus Logros Activos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {LOGROS.map((logro) => {
                const porcentaje = Math.min((logro.progreso / logro.total) * 100, 100);
                return (
                  <div key={logro.id} className={`bg-gradient-to-br ${logro.color} rounded-2xl p-5 shadow-md text-white relative overflow-hidden group`}>
                    <div className="absolute -right-4 -top-4 text-8xl opacity-10 transform rotate-12 group-hover:scale-110 transition-transform">
                      {logro.icono}
                    </div>
                    <div className="relative z-10 flex gap-4 items-center">
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl backdrop-blur-sm">
                        {logro.icono}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-base">{logro.titulo}</h4>
                        <p className="text-xs text-white/80 mb-2">{logro.desc}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-black/20 h-2 rounded-full overflow-hidden">
                            <div className="bg-white h-full rounded-full" style={{ width: `${porcentaje}%` }}></div>
                          </div>
                          <span className="text-[10px] font-bold min-w-[30px] text-right">
                            {logro.progreso}/{logro.total}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ESTADO DEL VISICOOLER MEDIANO */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900 mb-4">Estado del Cooler Mediano (3 Slots)</h2>
            <div className="grid grid-cols-1 gap-3">
              {productosVisicooler.map(p => (
                <div key={p.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-2xl shadow-sm">
                      {p.icono}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900">{p.nombre}</p>
                      <p className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md inline-block mt-1">{p.slot}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-lg text-slate-700">{p.cantidad} <span className="text-xs font-normal text-slate-400">unds</span></p>
                    <span className={`inline-block mt-1 text-[10px] font-black px-2 py-1 rounded-md uppercase ${
                      p.estado === 'optimo' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {p.estado}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TIENDA DE CANJES */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Tienda de Canjes</h3>
              <span className="text-xs font-bold text-slate-500">Tus Puntos: <span className="text-amber-600">🪙 {puntos}</span></span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {TIENDA_CANJES.map(prod => (
                <div key={prod.id} className="border border-slate-200 rounded-xl p-3 flex flex-col items-center text-center bg-slate-50 hover:border-amber-400 transition-colors">
                  <span className="text-3xl mb-2">{prod.icono}</span>
                  <h4 className="font-bold text-xs text-slate-800 mb-1">{prod.nombre}</h4>
                  <p className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-full mb-3">🪙 {prod.costo}</p>
                  <button 
                    onClick={() => canjearProducto(prod)}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold py-1.5 rounded-lg transition-colors"
                  >
                    Canjear
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* FEED Y BUSCADOR DE GIFS */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">Muro del Turno</h3>
            
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-6">
              <textarea 
                rows={2}
                placeholder="Escribe una acotación o novedad..."
                value={nuevaAcotacion}
                onChange={(e) => setNuevaAcotacion(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder:text-slate-400 mb-3"
              />
              
              {mostrarBaulGifs && (
  <div className="mb-4 p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
    <div className="flex justify-between items-center mb-3">
      <input 
        type="text" 
        placeholder="Buscar GIF en internet..." 
        value={terminoBusquedaGif}
        onChange={(e) => setTerminoBusquedaGif(e.target.value)}
        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 mr-3"
      />
      <button onClick={() => setMostrarBaulGifs(false)} className="text-[10px] font-bold text-slate-400 hover:text-slate-700">Cerrar ✕</button>
    </div>
    
    {/* CORRECCIÓN DE LÓGICA: Si hay texto, prioriza lo que trajo la API */}
    {terminoBusquedaGif.trim().length >= 3 && gifsEncontrados.length === 0 ? (
      <p className="text-xs text-center text-slate-400 py-4">Buscando en Giphy o sin resultados...</p>
    ) : (
      <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
        {/* Usamos una lista inteligente: si no hay búsqueda de más de 3 letras, muestra los 6 de fábrica */}
        {(terminoBusquedaGif.trim().length < 3 ? GALERIA_GIFS_DB : gifsEncontrados).map(gif => (
          <div 
            key={gif.id} 
            onClick={() => setNuevoGifUrl(gif.url)}
            className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${nuevoGifUrl === gif.url ? 'border-blue-500 scale-95' : 'border-transparent hover:border-slate-300'}`}
          >
            <img src={gif.url} alt="gif option" className="w-full h-16 object-cover" />
          </div>
        ))}
      </div>
    )}
  </div>
)}

              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setMostrarBaulGifs(!mostrarBaulGifs)}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors border border-blue-100"
                >
                  <span>🔍</span> {nuevoGifUrl ? 'GIF Seleccionado' : 'Buscar un GIF'}
                </button>

                <button 
                  onClick={publicarAcotacion}
                  disabled={!nuevaAcotacion && !nuevoGifUrl}
                  className="bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-blue-700 text-white font-bold text-xs px-6 py-2 rounded-lg transition-colors shadow-sm"
                >
                  Publicar
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {feedPosts.map(post => (
                <div key={post.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-sm text-slate-900">{post.usuario}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{post.tiempo}</span>
                  </div>
                  {post.accion && <p className="text-sm text-slate-700 mb-3">{post.accion}</p>}
                  {post.gif && (
                    <img src={post.gif} alt="GIF adjunto" className="w-auto h-40 object-cover rounded-xl border border-slate-100" />
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* COLUMNA DERECHA */}
        <div className="space-y-6">
          <aside className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col items-center sticky top-24">
            
            <div className="flex gap-2 mb-2 w-full justify-center">
              <button onMouseEnter={() => setAnimacionPersonaje('saludar')} onMouseLeave={() => setAnimacionPersonaje('idle')} className="text-[10px] font-bold bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-600 px-3 py-1 rounded-full transition-colors">👋 Saludar</button>
              <button onMouseEnter={() => setAnimacionPersonaje('bailar')} onMouseLeave={() => setAnimacionPersonaje('idle')} className="text-[10px] font-bold bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-600 px-3 py-1 rounded-full transition-colors">🎵 Bailar</button>
            </div>

            <canvas ref={canvasRef} width={180} height={160} className="bg-transparent mb-4" />

            {/* FLUJO DE REVISIÓN */}
            <div className="w-full bg-slate-50 rounded-2xl p-5 border border-slate-200 min-h-[220px] flex flex-col justify-center">
              
              {pasoFlujo === 0 && (
                <div className="space-y-3">
                  <p className="font-black text-slate-800 text-center text-sm">¿Qué parte del cooler revisaste?</p>
                  <div className="space-y-2">
                    <button onClick={() => manejarRespuestaFlujo('zona', 'Slot Superior', 1)} className="w-full bg-white border border-slate-200 p-2 rounded-xl text-xs font-bold text-slate-700 hover:border-blue-500">Slot Superior (Mediano)</button>
                    <button onClick={() => manejarRespuestaFlujo('zona', 'Slot Medio', 1)} className="w-full bg-white border border-slate-200 p-2 rounded-xl text-xs font-bold text-slate-700 hover:border-blue-500">Slot Medio (Mediano)</button>
                    <button onClick={() => manejarRespuestaFlujo('zona', 'Slot Inferior', 1)} className="w-full bg-white border border-slate-200 p-2 rounded-xl text-xs font-bold text-slate-700 hover:border-blue-500">Slot Inferior (Grande)</button>
                  </div>
                </div>
              )}

              {pasoFlujo === 1 && (
                <div className="space-y-3 text-center">
                  <p className="font-black text-slate-800 text-sm">¿Abasteciste producto nuevo?</p>
                  <div className="flex gap-2">
                    <button onClick={() => manejarRespuestaFlujo('abastecio', 'Si', 2)} className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-xl text-xs">Sí, llené stock</button>
                    <button onClick={() => manejarRespuestaFlujo('abastecio', 'No', 2)} className="flex-1 bg-slate-200 text-slate-700 font-bold py-2 rounded-xl text-xs">No, estaba lleno</button>
                  </div>
                </div>
              )}

              {pasoFlujo === 2 && (
                <div className="space-y-3 text-center">
                  <p className="font-black text-slate-800 text-sm">¿Verificaste fechas de vencimiento?</p>
                  <button onClick={() => manejarRespuestaFlujo('vencimiento', 'Todo OK', 3)} className="w-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold py-2 rounded-xl text-xs mb-2">✅ Todo en regla</button>
                  <button onClick={() => manejarRespuestaFlujo('vencimiento', 'Mermas', 5)} className="w-full bg-rose-50 text-rose-700 border border-rose-200 font-bold py-2 rounded-xl text-xs">⚠️ Encontré productos por vencer</button>
                </div>
              )}

              {pasoFlujo === 3 && (
                <div className="space-y-3 text-center">
                  <p className="font-black text-slate-800 text-sm">¿Limpiaste el vidrio y los separadores?</p>
                  <div className="flex gap-2">
                    <button onClick={() => manejarRespuestaFlujo('limpieza', 'Si', 4)} className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-xl text-xs">Sí, impecable ✨</button>
                    <button onClick={() => manejarRespuestaFlujo('limpieza', 'Falta', 4)} className="flex-1 bg-slate-200 text-slate-700 font-bold py-2 rounded-xl text-xs">Aún no</button>
                  </div>
                </div>
              )}

              {pasoFlujo === 4 && (
                <div className="text-center space-y-2">
                  <div className="text-4xl mb-2">🎉</div>
                  <p className="font-black text-emerald-600 text-sm">¡Revisión Exitosa!</p>
                  <p className="text-[10px] text-slate-500 mb-4">Zona: {respuestasFlujo.zona} registrada correctamente. Has ganado +20 Puntos.</p>
                  <button onClick={() => { ejecutarMision(20, 20, `Revisión completa en ${respuestasFlujo.zona}`); setPasoFlujo(0); }} className="w-full bg-slate-900 text-white font-bold py-2 rounded-xl text-xs">Finalizar y Guardar</button>
                </div>
              )}

              {pasoFlujo === 5 && (
                <div className="text-center space-y-3">
                  <div className="text-4xl mb-2">⚠️</div>
                  <p className="font-black text-rose-600 text-sm">Alerta de Merma</p>
                  <p className="text-[10px] text-slate-500">Por favor retira el producto del {respuestasFlujo.zona} y repórtalo al supervisor.</p>
                  <button onClick={() => { ejecutarMision(10, 5, `Alerta de merma en ${respuestasFlujo.zona}`); setPasoFlujo(0); }} className="w-full bg-rose-600 text-white font-bold py-2 rounded-xl text-xs">Entendido</button>
                </div>
              )}
            </div>
            
            {/* Historial rápido */}
            {historialTurno.length > 0 && (
              <div className="w-full mt-4 pt-4 border-t border-slate-100">
                <h4 className="text-[10px] font-black text-slate-400 uppercase mb-2">Registro reciente:</h4>
                <div className="space-y-1 max-h-24 overflow-y-auto text-[10px] font-medium text-slate-600">
                  {historialTurno.map((txt, i) => <p key={i}>• {txt}</p>)}
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}