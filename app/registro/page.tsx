"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from "../lib/supabase";

// ==========================================
// CONFIGURACIÓN DE API
// ==========================================
const GIPHY_API_KEY = "DiZzlCrJVUFnHeMDEs9UC265nVW2KtOS"; 

// ==========================================
// INTERFACES Y DATOS BASE
// ==========================================
interface LogActividad {
  id: string;
  usuario: string;
  accion: string;
  fecha?: string;
  tiempo?: string;
  xp: number;
  gif?: string;
  tipo?: 'alerta' | 'novedad' | 'logro' | 'general';
}

const INSIGNIAS = [
  { id: 'i1', titulo: 'Ojo de Halcón', desc: '5 Logros Mermas', desbloqueado: false, icono: '🦅', color: 'from-slate-300 to-slate-400' },
  { id: 'i2', titulo: 'Empleado Estrella', desc: '15 Logros', desbloqueado: true, icono: '⭐', color: 'from-amber-400 to-yellow-500' },
];

const GALERIA_GIFS_DB = [
  { id: 'g1', url: 'https://media.giphy.com/media/xT0xezQGU5xCDJuCPe/giphy.gif', tag: 'exito bien ok' },
  { id: 'g2', url: 'https://media.giphy.com/media/l41lTjJp8yYyG2bkc/giphy.gif', tag: 'trabajo cansado' },
  { id: 'g3', url: 'https://media.giphy.com/media/11sBLVxNs7v6WA/giphy.gif', tag: 'ok pulgar genial' },
  { id: 'g4', url: 'https://media.giphy.com/media/3o7TKDk86KxNpqQjG0/giphy.gif', tag: 'alerta peligro emergencia' },
  { id: 'g5', url: 'https://media.giphy.com/media/26AHONQ79FdWZhAIw/giphy.gif', tag: 'fiesta celebrar feliz' },
  { id: 'g6', url: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif', tag: 'pensando duda hmm' },
  { id: 'g7', url: 'https://media.giphy.com/media/xUPGGDNsLvqsBOhuU0/giphy.gif', tag: 'risa jaja gracioso' },
  { id: 'g8', url: 'https://media.giphy.com/media/3o85xwxr06YNoFdSbm/giphy.gif', tag: 'triste error mal' },
];

export default function GamificacionPage() {
  // ==========================================
  // ESTADOS GAMIFICACIÓN
  // ==========================================
  const [userXP, setUserXP] = useState<number>(0); 
  const [puntos, setPuntos] = useState<number>(0); 
  const XP_POR_NIVEL = 1000;
  const userLevel = Math.floor(userXP / XP_POR_NIVEL) + 1;
  const progresoNivel = ((userXP % XP_POR_NIVEL) / XP_POR_NIVEL) * 100;

  // UI y Modales
  const [accionActiva, setAccionActiva] = useState<string | null>(null); 
  const [loadingDB, setLoadingDB] = useState(false);
  const [notificacion, setNotificacion] = useState<string | null>(null);
  
  const [vistaModal, setVistaModal] = useState<'form' | 'tabla'>('form');

  const dates = useMemo(() => {
    const hoy = new Date();
    const diaSemana = hoy.getDay();
    const difLunes = hoy.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1);
    const lunes = new Date(new Date().setDate(difLunes)).toISOString().split('T')[0];
    const domingo = new Date(new Date(lunes).setDate(new Date(lunes).getDate() + 6)).toISOString().split('T')[0];
    return { lunes, domingo, hoyStr: hoy.toISOString().split("T")[0] };
  }, []);

  const [fechaDesde, setFechaDesde] = useState(dates.lunes); 
  const [fechaHasta, setFechaHasta] = useState(dates.domingo);

  // ==========================================
  // ESTADOS ENVASES
  // ==========================================
  const [registrosEnvases, setRegistrosEnvases] = useState<any[]>([]);
  const [confirmandoEnvase, setConfirmandoEnvase] = useState(false);
  const [nuevoIdEnvase, setNuevoIdEnvase] = useState<number | null>(null);
  const [filtroEstadoEnvase, setFiltroEstadoEnvase] = useState("pendientes");
  const [formEnvase, setFormEnvase] = useState({ cliente: "", envase: "", cantidad: "", dinero: "", pago: "Efectivo" });

  const formularioEnvaseValido = useMemo(() => {
    return (
      formEnvase.cliente.trim() !== "" && formEnvase.envase !== "" && 
      formEnvase.cantidad !== "" && Number(formEnvase.cantidad) > 0 &&
      formEnvase.dinero !== "" && Number(formEnvase.dinero) >= 0
    );
  }, [formEnvase]);

  const statsEnvases = useMemo(() => {
    const cashPendiente = registrosEnvases.filter(r => r.devuelto === 0 && r.pago === "Efectivo").reduce((acc, curr) => acc + (Number(curr.dinero) || 0), 0);
    const yapePendiente = registrosEnvases.filter(r => r.devuelto === 0 && r.pago === "Yape").reduce((acc, curr) => acc + (Number(curr.dinero) || 0), 0);
    return { cashPendiente, yapePendiente };
  }, [registrosEnvases]);

  const envasesFiltrados = useMemo(() => {
    let filtrados = [...registrosEnvases];
    if (filtroEstadoEnvase === "pendientes") filtrados = filtrados.filter(r => r.devuelto === 0);
    if (filtroEstadoEnvase === "devueltos") filtrados = filtrados.filter(r => r.devuelto === 1);
    return filtrados;
  }, [registrosEnvases, filtroEstadoEnvase]);

  // ==========================================
  // ESTADOS DINERO SOBRANTE
  // ==========================================
  const [registrosDinero, setRegistrosDinero] = useState<any[]>([]);
  const [confirmandoDinero, setConfirmandoDinero] = useState(false);
  const [nuevoIdDinero, setNuevoIdDinero] = useState<number | null>(null);
  const [formDinero, setFormDinero] = useState({ cajero: '', dinero: '', tipo: "1" });
  const listaCajeros = ["Katherine", "Maria", "Enma", "Nicol", "Axel"];

  const formularioDineroValido = useMemo(() => {
    return formDinero.cajero !== "" && formDinero.dinero !== "" && parseFloat(formDinero.dinero) > 0;
  }, [formDinero]);

  const resumenDinero = useMemo(() => {
    return registrosDinero.reduce((acc, item) => {
      const monto = parseFloat(item.dinero) || 0;
      acc.total += monto;
      if (item.tipo === 0 || item.tipo === "0") acc.yape += monto;
      else acc.efectivo += monto;
      return acc;
    }, { total: 0, efectivo: 0, yape: 0 });
  }, [registrosDinero]);

  // ==========================================
  // ESTADOS AUDITORÍA DE INVENTARIO
  // ==========================================
  const [tipoInventario, setTipoInventario] = useState<"faltantes" | "sobrantes">("faltantes");
  const [registrosInventario, setRegistrosInventario] = useState<any[]>([]);
  const [confirmandoInventario, setConfirmandoInventario] = useState(false);
  const [nuevoIdInventario, setNuevoIdInventario] = useState<number | null>(null);
  const [formInventario, setFormInventario] = useState({ producto: "", cantidad: "", precio: "" });

  const formularioInventarioValido = useMemo(() => {
    return formInventario.producto.trim() !== "" && formInventario.cantidad !== "" && parseFloat(formInventario.cantidad) > 0 && formInventario.precio !== "" && parseFloat(formInventario.precio) >= 0;
  }, [formInventario]);

  const INV_CONFIG = useMemo(() => ({
    faltantes: { color: "orange", bgBtn: "bg-orange-600", borderBtn: "border-orange-800", text: "text-orange-600", textLight: "text-orange-100", tablaBD: "prod_faltantes", label: "FALTANTES" },
    sobrantes: { color: "indigo", bgBtn: "bg-indigo-600", borderBtn: "border-indigo-800", text: "text-indigo-600", textLight: "text-indigo-100", tablaBD: "prod_sobrante", label: "SOBRANTES" }
  }[tipoInventario]), [tipoInventario]);

  const totalInventario = useMemo(() => {
    return registrosInventario.reduce((acc, item) => acc + (parseFloat(item.cantidad) * parseFloat(item.precio) || 0), 0);
  }, [registrosInventario]);

  // ==========================================
  // ESTADOS PROVEEDORES Y PEDIDOS
  // ==========================================
  const [formProveedor, setFormProveedor] = useState({ proveedor: '', producto: '', cantidad: '' });
  const [opcionesProveedores, setOpcionesProveedores] = useState<any[]>([]);
  const [pedidosDB, setPedidosDB] = useState<any[]>([]);
  const [diaAbierto, setDiaAbierto] = useState<string | null>(null);
  const diasSemana = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

  const pedidosActivosFiltrados = useMemo(() => {
    return pedidosDB.filter((pedido) => {
      if (pedido.oculto) return false;
      if (pedido.recibido) return (new Date().getTime() - new Date(pedido.creado_en).getTime()) < (72 * 60 * 60 * 1000); 
      return true;
    });
  }, [pedidosDB]);

  const proveedoresDelDiaActivo = useMemo(() => {
    return opcionesProveedores.filter((p) => p.dia_pedido?.toLowerCase() === diaAbierto);
  }, [opcionesProveedores, diaAbierto]);

  const opcionesSelectProveedores = useMemo(() => {
    const filtrados = diaAbierto ? opcionesProveedores.filter(p => p.dia_pedido?.toLowerCase() === diaAbierto.toLowerCase()) : opcionesProveedores;
    return Array.from(new Set(filtrados.map(p => p.nombre.toUpperCase()))).sort();
  }, [opcionesProveedores, diaAbierto]);

  // ==========================================
  // ESTADOS MURO Y MASCOTA
  const [animacionPersonaje, setAnimacionPersonaje] = useState<'idle' | 'saludar' | 'bailar' | 'dormir'>('idle');
  const [mensajeMascota, setMensajeMascota] = useState<string>("¡Hola! Listo para registrar.");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [nuevaAcotacion, setNuevaAcotacion] = useState('');
  const [tipoPost, setTipoPost] = useState<'general'|'alerta'|'logro'>('general');
  const [feedPosts, setFeedPosts] = useState<LogActividad[]>([]);
  
  // NUEVO ESTADO: Ocultar o mostrar mensajes automáticos del sistema
  const [mostrarMensajesSistema, setMostrarMensajesSistema] = useState(false);

  // ESTADOS GIPHY
  const [mostrarBuscadorGif, setMostrarBuscadorGif] = useState(false);
  const [terminoGif, setTerminoGif] = useState('');
  const [opcionesGif, setOpcionesGif] = useState<any[]>([]);
  const [nuevoGifUrl, setNuevoGifUrl] = useState('');
  const [buscandoGif, setBuscandoGif] = useState(false);

  // ==========================================
  // LOGROS DINÁMICOS
  // ==========================================
  const LOGROS_DINAMICOS = useMemo(() => {
    return [
      { id: 'l1', titulo: 'Cazador de Mermas', progreso: registrosInventario.filter(r => parseFloat(r.cantidad) > 0).length, total: 5, icono: '🔍' },
      { id: 'l2', titulo: 'Rey del Retorno', progreso: registrosEnvases.length, total: 20, icono: '♻️' },
      { id: 'l3', titulo: 'Negociador', progreso: pedidosDB.filter(p => p.recibido).length, total: 10, icono: '🚚' },
    ];
  }, [registrosEnvases, registrosInventario, pedidosDB]);

  // ==========================================
  // EFECTOS Y FETCH DE DATOS
  // ==========================================
  useEffect(() => {
    fetchMuroYXP();
    // Pre-cargamos data general para los logros también
    fetchEnvases();
    fetchInventario();
    fetchPedidos();
  }, []);

  async function fetchMuroYXP() {
    const { data, error } = await supabase
      .from('gamificacion_logs')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(50);

    if (!error && data) {
      setFeedPosts(data);
      const totalXP = data.reduce((acc, curr) => acc + (curr.xp || 0), 0);
      setUserXP(totalXP);
      setPuntos(Math.floor(totalXP * 0.5));
    }
  }

  useEffect(() => { 
    if (accionActiva === 'envases') fetchEnvases(); 
    if (accionActiva === 'dine_sobrante') fetchDineroSobrante();
  }, [accionActiva, fechaDesde, fechaHasta]);

  useEffect(() => {
    if (accionActiva === 'inventario') fetchInventario();
  }, [accionActiva, fechaDesde, fechaHasta, tipoInventario]);

  useEffect(() => {
    if (accionActiva === 'proveedores') {
      fetchProveedores();
      fetchPedidos();
    }
  }, [accionActiva]);

  // Búsqueda GIPHY
  useEffect(() => {
    if (!mostrarBuscadorGif) return;
    const buscarEnGiphy = async () => {
      setBuscandoGif(true);
      try {
        const url = terminoGif.trim() === ''
          ? `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=4&rating=g`
          : `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(terminoGif)}&limit=4&rating=g`;

        const respuesta = await fetch(url);
        if (!respuesta.ok) throw new Error(`Error de Giphy: HTTP ${respuesta.status}`);

        const data = await respuesta.json();
        if (data.data && data.data.length > 0) {
          const gifsMapeados = data.data.map((gif: any) => ({
            id: gif.id,
            url: gif.images.downsized_medium.url
          }));
          setOpcionesGif(gifsMapeados);
        } else {
          throw new Error("No hay resultados en Giphy");
        }
      } catch (error) {
        console.error("🛑 Giphy falló. Motivo:", error);
        const term = terminoGif.toLowerCase().trim();
        if (term === '') {
          setOpcionesGif(GALERIA_GIFS_DB.slice(0, 4));
        } else {
          const filtrados = GALERIA_GIFS_DB.filter(g => g.tag.toLowerCase().includes(term));
          setOpcionesGif(filtrados.slice(0, 4));
        }
      } finally {
        setBuscandoGif(false);
      }
    };

    const timeoutId = setTimeout(() => {
      buscarEnGiphy();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [terminoGif, mostrarBuscadorGif]);

  async function fetchEnvases() {
    let query = supabase.from("envases").select("*").order("id", { ascending: false });
    if (fechaDesde && fechaHasta) query = query.gte("fecha", `${fechaDesde}T00:00:00`).lte("fecha", `${fechaHasta}T23:59:59`);
    const { data } = await query;
    setRegistrosEnvases(data || []);
  }

  async function fetchDineroSobrante() {
    let query = supabase.from("dine_sobrante").select("*").order("id", { ascending: false });
    if (fechaDesde && fechaHasta) query = query.gte("fecha", fechaDesde).lte("fecha", fechaHasta);
    const { data } = await query;
    setRegistrosDinero(data || []);
  }

  async function fetchInventario() {
    let query = supabase.from(INV_CONFIG.tablaBD).select("*").order("id", { ascending: false });
    if (fechaDesde && fechaHasta) query = query.gte("fecha", fechaDesde).lte("fecha", fechaHasta);
    const { data } = await query;
    setRegistrosInventario(data || []);
  }

  async function fetchProveedores() {
    const { data } = await supabase.from('proveedores').select('*').order('nombre');
    setOpcionesProveedores(data || []);
  }

  async function fetchPedidos() {
    const { data } = await supabase.from('pedidos').select('*').order('creado_en', { ascending: false });
    setPedidosDB(data || []);
  }

  // ==========================================
  // LÓGICA DE DIBUJO DEL HUEVO (CANVAS)
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
      let bodyY = cy; let rotation = 0; let wave = 0;

      if (animacionPersonaje === 'bailar') { bodyY += Math.abs(Math.sin(tick * 3)) * 10 - 5; rotation = Math.sin(tick * 2) * 0.2; }
      else if (animacionPersonaje === 'saludar') { wave = Math.sin(tick * 4) * 0.5; }
      else if (animacionPersonaje === 'dormir') { bodyY += Math.sin(tick * 1) * 2; }

      ctx.fillStyle = 'rgba(0,0,0,0.05)'; ctx.beginPath(); ctx.ellipse(cx, cy + 55, 30 + (animacionPersonaje === 'bailar' ? Math.abs(Math.sin(tick * 3)) * 5 : 0), 8, 0, 0, 2 * Math.PI); ctx.fill();
      ctx.save(); ctx.translate(cx, bodyY); ctx.rotate(rotation);
      const breatheY = animacionPersonaje === 'idle' ? Math.sin(tick) * 3 : 0;
      const breatheX = animacionPersonaje === 'idle' ? Math.cos(tick) * 1.5 : 0;
      
      ctx.fillStyle = animacionPersonaje === 'dormir' ? '#fdba74' : '#fb923c'; ctx.beginPath(); ctx.ellipse(0, 10, 38 + breatheX, 42 + breatheY, 0, 0, 2 * Math.PI); ctx.fill();
      ctx.strokeStyle = '#ea580c'; ctx.lineWidth = 3; ctx.stroke();
      if (animacionPersonaje === 'saludar' || animacionPersonaje === 'bailar') {
        ctx.strokeStyle = '#ea580c'; ctx.lineWidth = 8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(35, 10); ctx.quadraticCurveTo(55, -10 + (wave * 20), 45, -30 + (wave * 20)); ctx.stroke();
      }
      ctx.fillStyle = '#1e293b';
      if (animacionPersonaje === 'dormir') {
        ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(-7, 0); ctx.stroke(); ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(15, 0); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 15, 4, 0, Math.PI * 2); ctx.fill(); 
      } else {
        const parpadeo = Math.sin(tick * 0.5) > 0.96 ? 1 : 8; ctx.beginPath(); ctx.ellipse(-12, 0, 5, parpadeo, 0, 0, 2 * Math.PI); ctx.fill(); ctx.beginPath(); ctx.ellipse(12, 0, 5, parpadeo, 0, 0, 2 * Math.PI); ctx.fill();
        ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 10, animacionPersonaje === 'bailar' ? 12 : 8, 0, Math.PI, false); ctx.stroke();
      }
      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };
    render(); return () => cancelAnimationFrame(animationFrameId);
  }, [animacionPersonaje]);

  useEffect(() => {
    const interval = setInterval(() => setAnimacionPersonaje(Math.random() > 0.5 ? 'idle' : 'saludar'), 6000);
    return () => clearInterval(interval);
  }, []);

  // ==========================================
  // FUNCIONES BD Y GAMIFICACIÓN
  // ==========================================
  const ejecutarMision = async (xpGanada: number, puntosGanados: number, accionMensaje: string) => {
    await supabase.from('gamificacion_logs').insert([{ 
      usuario: 'Sistema', 
      accion: accionMensaje, 
      xp: xpGanada, 
      tipo: 'logro' 
    }]);

    setMensajeMascota(`¡Bien! +${xpGanada} XP 🪙`); 
    setAnimacionPersonaje('bailar');
    fetchMuroYXP();
  };

  const guardarRegistroEnvase = async () => {
    if (!formularioEnvaseValido) return;
    const { data, error } = await supabase.from("envases").insert([{
      cliente: formEnvase.cliente.toUpperCase(), envase: formEnvase.envase, cantidad: Number(formEnvase.cantidad), dinero: Number(formEnvase.dinero), pago: formEnvase.pago, fecha: new Date().toISOString(), devuelto: 0 
    }]).select();

    if (!error && data) {
      setNotificacion(`Envase guardado exitosamente`);
      ejecutarMision(10, 5, `♻️ Retorno registrado: ${formEnvase.envase}`);
      setFormEnvase({ cliente: "", envase: "", cantidad: "", dinero: "", pago: "Efectivo" });
      setConfirmandoEnvase(false);
      setNuevoIdEnvase(data[0].id);
      fetchEnvases();
      setVistaModal('tabla'); 
      setTimeout(() => setNuevoIdEnvase(null), 8000);
    }
  }

  const toggleDevuelto = async (id: number, estadoActual: number) => {
    const nuevoEstado = estadoActual === 1 ? 0 : 1;
    const { error } = await supabase.from("envases").update({ devuelto: nuevoEstado }).eq("id", id);
    if (!error) fetchEnvases();
  }

  const guardarRegistroDinero = async () => {
    if (!formularioDineroValido) return;
    const { data, error } = await supabase.from("dine_sobrante").insert([{
      cajero: formDinero.cajero, dinero: parseFloat(formDinero.dinero), tipo: parseInt(formDinero.tipo), fecha: dates.hoyStr
    }]).select();

    if (!error && data) {
      setNotificacion(`Ingreso de ${formDinero.cajero} guardado`);
      ejecutarMision(30, 15, `💵 Sobrante reportado: S/ ${formDinero.dinero}`);
      setFormDinero({ cajero: '', dinero: '', tipo: "1" });
      setConfirmandoDinero(false);
      setNuevoIdDinero(data[0].id);
      fetchDineroSobrante();
      setVistaModal('tabla'); 
      setTimeout(() => setNuevoIdDinero(null), 8000);
    }
  }

  const guardarRegistroInventario = async () => {
    if (!formularioInventarioValido) return;
    const { data, error } = await supabase.from(INV_CONFIG.tablaBD).insert([{
      producto: formInventario.producto.toUpperCase(),
      cantidad: parseInt(formInventario.cantidad),
      precio: parseFloat(formInventario.precio),
      fecha: dates.hoyStr
    }]).select();

    if (!error && data) {
      setNotificacion(`${INV_CONFIG.label} REGISTRADO EXITOSAMENTE`);
      ejecutarMision(20, 10, `📦 ${INV_CONFIG.label} reportado: ${formInventario.producto}`);
      setFormInventario({ producto: "", cantidad: "", precio: "" });
      setConfirmandoInventario(false);
      setNuevoIdInventario(data[0].id);
      fetchInventario();
      setVistaModal('tabla');
      setTimeout(() => setNuevoIdInventario(null), 8000);
    }
  }

  const formatFechaCorta = (fechaStr: string) => {
    const fecha = new Date(fechaStr);
    const hoy = new Date();
    const esHoy = fecha.getDate() === hoy.getDate() && fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear();
    const dia = fecha.getDate();
    const mes = fecha.toLocaleString('es-ES', { month: 'short' }).replace('.', '').toUpperCase();
    const horaFormateada = fecha.toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'}).toUpperCase();
    return { dia, mes, horaFormateada, esHoy };
  };

  const manejarEnvioPedido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProveedor.producto.trim() || !formProveedor.cantidad || !formProveedor.proveedor) {
      alert("Completa todos los campos"); return;
    }
    setLoadingDB(true);
    try {
      const { error } = await supabase.from('pedidos').insert([{ 
        proveedor: formProveedor.proveedor.toUpperCase(), 
        producto: formProveedor.producto.toUpperCase().trim(), 
        cantidad: `${formProveedor.cantidad} UNIDADES`, 
        creado_en: new Date().toISOString(), 
        recibido: false 
      }]);
      if (!error) {
        setNotificacion(`Pedido guardado`); 
        ejecutarMision(15, 10, `🚚 Pedido registrado para: ${formProveedor.proveedor}`);
        setFormProveedor({ ...formProveedor, producto: '', cantidad: '' }); 
        fetchPedidos();
        setVistaModal('tabla');
      }
    } catch (err) {} finally { setLoadingDB(false); }
  };

  const marcarGrupoComoRecibido = async (provName: string, ids: number[]) => {
    await Promise.all(ids.map(id => supabase.from("pedidos").update({ recibido: true }).eq("id", id)));
    ejecutarMision(25, 15, `✅ Mercadería recibida de: ${provName}`);
    fetchPedidos();
  };

  const revertirGrupoProveedor = async (provName: string, ids: number[]) => {
    await Promise.all(ids.map(id => supabase.from("pedidos").update({ recibido: false }).eq("id", id)));
    fetchPedidos();
    setNotificacion("🔄 Grupo revertido a 'Pendiente'.");
  };

  const ocultarGrupoProveedor = async (ids: number[]) => {
    if (!window.confirm("¿Ocultar este grupo del monitor?")) return;
    await Promise.all(ids.map(id => supabase.from("pedidos").update({ oculto: true }).eq("id", id)));
    fetchPedidos();
  };

  const eliminarGrupoProveedor = async (provName: string, ids: number[]) => {
    if (!window.confirm(`⚠️ ¿Estás seguro de eliminar TODO el bloque de pedidos de "${provName.toUpperCase()}"?`)) return;
    await Promise.all(ids.map(id => supabase.from("pedidos").delete().eq("id", id)));
    fetchPedidos();
  };

  const eliminarPedidoIndividual = async (id: number) => {
    if (!window.confirm("¿Eliminar este producto del pedido?")) return;
    await supabase.from("pedidos").delete().eq("id", id);
    fetchPedidos();
  };

  const revertirPedidoIndividual = async (id: number) => {
    await supabase.from("pedidos").update({ recibido: false }).eq("id", id);
    fetchPedidos();
  };

  const editarPedidoIndividual = async (item: any) => {
    const nuevoNombre = window.prompt(`Modificar nombre del producto:`, item.producto);
    if (!nuevoNombre || nuevoNombre.trim() === "") return;
    const cantidadStr = item.cantidad ? String(item.cantidad) : "";
    const cantidadLimpia = cantidadStr.replace(" UNIDADES", "").trim();
    const nuevaCantidad = window.prompt(`Modificar cantidad para "${nuevoNombre.toUpperCase()}":`, cantidadLimpia);
    if (!nuevaCantidad || nuevaCantidad.trim() === "" || isNaN(Number(nuevaCantidad))) return;
    try {
      const { error } = await supabase.from("pedidos").update({ 
        producto: nuevoNombre.toUpperCase().trim(), 
        cantidad: `${nuevaCantidad} UNIDADES` 
      }).eq("id", item.id);
      if (error) throw error;
      fetchPedidos();
    } catch (err) {
      console.error("Error al actualizar:", err);
      alert("Hubo un problema al actualizar el pedido.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-12 overflow-x-hidden">
      
      {notificacion && (
        <div className="fixed top-6 right-6 z-[1000] animate-in slide-in-from-right duration-500">
          <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border-l-4 border-emerald-500 flex items-center gap-3">
            <p className="text-[11px] font-black uppercase tracking-wider">{notificacion}</p>
          </div>
        </div>
      )}

      {/* HEADER GAMIFICACIÓN */}
      <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm p-4">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex-1 max-w-xs">
            <h1 className="text-sm font-black text-slate-900">NIVEL {userLevel}</h1>
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden my-1">
              <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${progresoNivel}%` }}></div>
            </div>
            <p className="text-[10px] font-bold text-slate-500">{userXP} / {(userLevel) * XP_POR_NIVEL} XP</p>
          </div>
          <div className="bg-amber-100 border border-amber-200 px-4 py-2 rounded-xl font-black text-amber-800 text-lg">
            🪙 {puntos}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMNA IZQUIERDA (Principal) */}
        <div className="lg:col-span-2 space-y-6">
           
          <section>
            <h3 className="text-sm font-black text-slate-800 uppercase mb-3">⚡ Acciones del Turno</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button onClick={() => { setAccionActiva('envases'); setVistaModal('form'); }} className="bg-blue-600 text-white p-4 rounded-2xl shadow-sm hover:scale-105 transition-all text-left">
                <span className="text-2xl block mb-2">♻️</span><span className="font-bold text-sm block">Retorno Envases</span>
              </button>
              <button onClick={() => { setAccionActiva('dine_sobrante'); setVistaModal('form'); }} className="bg-emerald-600 text-white p-4 rounded-2xl shadow-sm hover:scale-105 transition-all text-left">
                <span className="text-2xl block mb-2">💵</span><span className="font-bold text-sm block">Dinero Sobrante</span>
              </button>
              <button onClick={() => { setAccionActiva('inventario'); setVistaModal('form'); }} className="bg-orange-600 text-white p-4 rounded-2xl shadow-sm hover:scale-105 transition-all text-left">
                <span className="text-2xl block mb-2">📦</span><span className="font-bold text-sm block">Auditoría Prod.</span>
              </button>
              <button onClick={() => { setAccionActiva('proveedores'); setVistaModal('form'); }} className="bg-indigo-600 text-white p-4 rounded-2xl shadow-sm hover:scale-105 transition-all text-left">
                <span className="text-2xl block mb-2">🚚</span><span className="font-bold text-sm block">Proveedores</span>
              </button>
            </div>
          </section>

          <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-8">
              <div className="flex-1">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">Logros</h3>
                <div className="space-y-4">
                  {LOGROS_DINAMICOS.map(l => (
                    <div key={l.id} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl">{l.icono}</div>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1"><span className="font-bold">{l.titulo}</span><span className="font-black text-blue-600">{l.progreso}/{l.total}</span></div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{width: `${(l.progreso/l.total)*100}%`}}></div></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 border-t sm:border-t-0 sm:border-l border-slate-100 pt-6 sm:pt-0 sm:pl-8">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">Insignias</h3>
                <div className="grid grid-cols-1 gap-3">
                  {INSIGNIAS.map(i => (
                    <div key={i.id} className={`flex items-center gap-4 p-3 rounded-2xl border ${i.desbloqueado ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl bg-gradient-to-br ${i.color}`}>{i.icono}</div>
                      <div><h4 className="font-bold text-sm">{i.titulo}</h4><p className="text-[10px] text-slate-500">{i.desc}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

           {/* MURO DEL TURNO */}
          <section className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm relative z-10">
            <h3 className="text-sm font-black text-slate-800 uppercase mb-4">Muro del Turno</h3>
            
            <div className="bg-slate-50 rounded-2xl p-3 sm:p-4 border border-slate-200 mb-6 flex flex-col gap-3 relative">
              
              {/* BOTONES SUPERIORES */}
              <div className="flex flex-wrap gap-2 justify-between items-center">
                <div className="flex gap-2">
                  <button onClick={()=>setTipoPost('general')} className={`text-[10px] font-bold px-3 py-1 rounded-full ${tipoPost==='general'?'bg-slate-800 text-white':'bg-slate-200 text-slate-600'}`}>💬 Novedad</button>
                  <button onClick={()=>setTipoPost('alerta')} className={`text-[10px] font-bold px-3 py-1 rounded-full ${tipoPost==='alerta'?'bg-rose-600 text-white':'bg-slate-200 text-slate-600'}`}>🚨 Alerta</button>
                </div>
                <button 
                  onClick={() => setMostrarMensajesSistema(!mostrarMensajesSistema)} 
                  className={`text-[10px] font-bold px-3 py-1 rounded-full transition-colors ${mostrarMensajesSistema ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                >
                  {mostrarMensajesSistema ? '🏆 Ocultar Logros' : '🏆 Ver Logros'}
                </button>
              </div>

              {/* BUSCADOR DE GIFS EN GIPHY */}
              {mostrarBuscadorGif && !nuevoGifUrl && (
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-md mb-2 animate-in slide-in-from-top-2">
                  <input 
                    type="text" 
                    placeholder="Buscar GIF..." 
                    value={terminoGif}
                    onChange={(e) => setTerminoGif(e.target.value)}
                    autoFocus
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs mb-3 focus:outline-none focus:border-indigo-400"
                  />
                  
                  {buscandoGif ? (
                    <p className="text-center text-xs text-indigo-400 font-bold py-4 animate-pulse">Buscando...</p>
                  ) : opcionesGif.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {opcionesGif.map(gif => (
                        <div 
                          key={gif.id} 
                          onClick={() => { setNuevoGifUrl(gif.url); setMostrarBuscadorGif(false); setTerminoGif(''); }}
                          className="relative group cursor-pointer aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-indigo-500 transition-all bg-slate-100"
                        >
                          <img src={gif.url} alt="gif preview" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-xs text-slate-400 font-bold py-4">Sin resultados 😢</p>
                  )}
                </div>
              )}

              {/* PREVIEW DEL GIF SELECCIONADO */}
              {nuevoGifUrl && (
                <div className="relative inline-block w-fit mt-2 animate-in zoom-in-95">
                  <img src={nuevoGifUrl} alt="Preview seleccionado" className="h-24 sm:h-32 rounded-xl object-cover border-4 border-indigo-100 shadow-sm" />
                  <button 
                    onClick={() => setNuevoGifUrl('')} 
                    className="absolute -top-3 -right-3 bg-rose-600 hover:bg-rose-700 text-white w-7 h-7 rounded-full font-bold flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                    title="Quitar GIF"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* INPUT Y BOTÓN ENVIAR */}
              <div className="flex gap-2 items-center mt-2">
                <div className="flex-1 flex items-center bg-white border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-slate-200 transition-all overflow-hidden pr-2">
                  <input 
                    type="text" 
                    placeholder={nuevoGifUrl ? "Añade un comentario..." : "Escribe aquí..."} 
                    value={nuevaAcotacion} 
                    onChange={(e) => setNuevaAcotacion(e.target.value)} 
                    className="flex-1 bg-transparent p-2 sm:p-3 text-sm focus:outline-none" 
                  />
                  <button 
                    onClick={() => { setMostrarBuscadorGif(!mostrarBuscadorGif); setTerminoGif(''); }} 
                    disabled={!!nuevoGifUrl}
                    className={`shrink-0 flex items-center justify-center px-2 py-1.5 rounded-md text-[10px] font-black tracking-wider transition-colors ${nuevoGifUrl ? 'text-slate-300 cursor-not-allowed' : 'text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer'}`}
                    title="Agregar GIF"
                  >
                    <span className="border-2 border-current rounded px-1">GIF</span>
                  </button>
                </div>

                <button 
                  onClick={async () => { 
                    if (!nuevaAcotacion.trim() && !nuevoGifUrl) return;
                    await supabase.from('gamificacion_logs').insert([{ 
                      usuario: 'Turno Activo',
                      accion: nuevaAcotacion || 'Compartió un GIF', 
                      xp: 5, 
                      tipo: tipoPost, 
                      gif: nuevoGifUrl 
                    }]);
                    setNuevaAcotacion(''); 
                    setNuevoGifUrl('');
                    setMostrarBuscadorGif(false);
                    fetchMuroYXP();
                  }} 
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 sm:px-5 py-2 sm:py-3 rounded-lg text-sm transition-colors shrink-0"
                >
                  Enviar
                </button>
              </div>
            </div>

            {/* FEED DE POSTS (CON SCROLLBAR ESTILIZADO) */}
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1 sm:pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 transition-colors">
              {(mostrarMensajesSistema ? feedPosts : feedPosts.filter(p => p.usuario !== 'Sistema')).map(post => (
                <div key={post.id} className={`p-3 sm:p-4 rounded-2xl border ${post.tipo === 'alerta' ? 'bg-rose-50 border-rose-100' : post.tipo === 'logro' ? 'bg-amber-50 border-amber-100' : 'bg-white border-slate-100'}`}>
                   <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] sm:text-[11px] font-black uppercase text-slate-500">
                        {post.usuario} 
                        {post.fecha && <><span className="font-normal mx-1">•</span> {new Date(post.fecha).toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})}</>}
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">+{post.xp} XP</span>
                   </div>
                   {post.accion && post.accion !== 'Compartió un GIF' && (
                     <p className="text-xs sm:text-sm font-medium text-slate-800">{post.accion}</p>
                   )}
                   {post.gif && <img src={post.gif} alt="gif adjunto" className="mt-3 rounded-xl max-h-32 sm:max-h-48 object-cover w-full sm:w-auto border border-slate-100" />}
                </div>
              ))}
              {(mostrarMensajesSistema ? feedPosts : feedPosts.filter(p => p.usuario !== 'Sistema')).length === 0 && (
                <p className="text-center text-xs text-slate-400 font-bold uppercase py-6">El muro está vacío</p>
              )}
            </div>
          </section>
        </div>

        {/* COLUMNA DERECHA (Mascota) */}
        <div className="space-y-6">
          <aside className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col items-center sticky top-24">
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3 mb-2 w-full text-center min-h-[50px] flex items-center justify-center relative">
              <p className="text-xs font-bold text-indigo-800">{mensajeMascota}</p>
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-indigo-50 border-b border-r border-indigo-100 rotate-45"></div>
            </div>
            <canvas ref={canvasRef} width={200} height={180} className="bg-transparent mt-2" />
          </aside>
        </div>
      </main>

      {/* =========================================
          POP-UPS CONFIRMACIONES
      ========================================= */}
      {confirmandoEnvase && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md" onClick={() => setConfirmandoEnvase(false)}></div>
          <div className="bg-white rounded-[3rem] p-8 shadow-2xl border-t-[15px] border-blue-600 text-center relative z-10 animate-in zoom-in duration-300 max-w-sm w-full">
            <h2 className="text-3xl font-black text-slate-900 uppercase italic mb-6 leading-none">REVISAR SALIDA</h2>
            <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 mb-8">
              <p className="text-xl font-black text-slate-900 uppercase">{formEnvase.cliente}</p>
              <p className="text-2xl font-black text-blue-600 uppercase">{formEnvase.cantidad} {formEnvase.envase}</p>
              <p className="text-2xl font-black text-emerald-600 font-mono">S/ {Number(formEnvase.dinero).toFixed(2)}</p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setConfirmandoEnvase(false)} className="flex-1 bg-slate-100 text-slate-500 font-black py-4 rounded-2xl uppercase text-[11px]">CORREGIR</button>
              <button onClick={guardarRegistroEnvase} className="flex-1 bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl uppercase text-[11px]">CONFIRMAR</button>
            </div>
          </div>
        </div>
      )}

      {confirmandoDinero && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md" onClick={() => setConfirmandoDinero(false)}></div>
          <div className="bg-white rounded-[3rem] p-8 shadow-2xl border-t-[15px] border-emerald-600 text-center relative z-10 animate-in zoom-in duration-300 max-w-sm w-full">
            <h2 className="text-3xl font-black text-slate-900 uppercase italic mb-6 leading-none">VALIDAR SOBRANTE</h2>
            <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 mb-8 space-y-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Cajero y Método</p>
                <p className="text-xl font-black text-slate-900 uppercase">{formDinero.cajero} <span className="text-emerald-500">•</span> {formDinero.tipo === "1" ? "EFECTIVO" : "YAPE"}</p>
              </div>
              <div className="pt-4 border-t-2 border-dashed border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Monto a Ingresar</p>
                <p className="text-4xl font-black text-emerald-600">S/ {parseFloat(formDinero.dinero).toFixed(2)}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setConfirmandoDinero(false)} className="flex-1 bg-slate-100 text-slate-500 font-black py-4 rounded-2xl uppercase text-[11px]">CORREGIR</button>
              <button onClick={guardarRegistroDinero} className="flex-1 bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl uppercase text-[11px]">CONFIRMAR</button>
            </div>
          </div>
        </div>
      )}

      {confirmandoInventario && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md" onClick={() => setConfirmandoInventario(false)}></div>
          <div className={`bg-white rounded-[3rem] p-8 shadow-2xl border-t-[15px] ${INV_CONFIG.borderBtn} text-center relative z-10 animate-in zoom-in duration-300 max-w-sm w-full`}>
            <h2 className="text-3xl font-black text-slate-900 uppercase italic mb-6 leading-none">REVISAR REGISTRO</h2>
            <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 mb-8 space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{INV_CONFIG.label}</p>
              <p className="text-xl font-black text-slate-900 uppercase my-2">{formInventario.producto.toUpperCase()}</p>
              <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Cantidad</p>
                  <p className="text-2xl font-black text-slate-900">{formInventario.cantidad}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Subtotal</p>
                  <p className={`text-2xl font-black ${INV_CONFIG.text}`}>S/ {(parseFloat(formInventario.cantidad) * parseFloat(formInventario.precio)).toFixed(2)}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setConfirmandoInventario(false)} className="flex-1 bg-slate-100 text-slate-500 font-black py-4 rounded-2xl uppercase text-[11px]">CORREGIR</button>
              <button onClick={guardarRegistroInventario} className={`flex-1 ${INV_CONFIG.bgBtn} text-white font-black py-4 rounded-2xl shadow-xl uppercase text-[11px]`}>CONFIRMAR</button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          MODALES DE ACCIONES PRINCIPALES
      ========================================= */}
      {accionActiva && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4">
          
          <div className={`relative w-full ${vistaModal === 'tabla' ? 'max-w-2xl' : 'max-w-md'} max-h-[95vh] overflow-y-auto bg-slate-50 rounded-[2rem] sm:rounded-[3rem] shadow-2xl transition-all duration-300`}>
            
            <button onClick={() => { setAccionActiva(null); setVistaModal('form'); }} className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 w-10 h-10 bg-slate-800 text-white rounded-full flex items-center justify-center font-bold hover:bg-slate-900 shadow-md">✕</button>

            {/* SWITCHER GLOBAL DE VISTAS (FORM / TABLA) */}
            <div className="flex justify-center pt-6 pb-2 relative z-40">
              <div className="flex gap-2 bg-slate-200 p-1.5 rounded-2xl">
                <button onClick={() => setVistaModal('form')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${vistaModal === 'form' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {accionActiva === 'proveedores' ? 'Crear Pedido' : 'Registrar'}
                </button>
                <button onClick={() => setVistaModal('tabla')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${vistaModal === 'tabla' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {accionActiva === 'proveedores' ? 'Monitor Activo' : 'Historial'}
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-8 pt-2">
              
              {/* MODAL ENVASES */}
              {accionActiva === 'envases' && (
                <>
                  {vistaModal === 'form' && (
                    <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-xl border-b-[10px] border-blue-600 animate-in fade-in zoom-in duration-300">
                      <h3 className="text-xl font-black text-slate-900 uppercase text-center mb-6 italic">Nuevo Envase</h3>
                      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); if(formularioEnvaseValido) setConfirmandoEnvase(true); }}>
                        <div className="text-left">
                          <label className="text-[10px] font-black text-blue-600 uppercase mb-2 block tracking-widest ml-1">Cliente *</label>
                          <input required placeholder="NOMBRE..." value={formEnvase.cliente} onChange={(e) => setFormEnvase({ ...formEnvase, cliente: e.target.value })} className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-sm font-black text-slate-900 focus:border-blue-600 outline-none uppercase" />
                        </div>
                        <div className="text-left">
                          <label className="text-[10px] font-black text-blue-600 uppercase mb-2 block tracking-widest ml-1">Envase *</label>
                          <select required value={formEnvase.envase} onChange={(e) => setFormEnvase({ ...formEnvase, envase: e.target.value })} className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-sm font-black text-slate-900 outline-none focus:border-blue-600 uppercase cursor-pointer">
                            <option value="">SELECCIONAR...</option>
                            {["Pirañita 192ml", "Envase 296ml", "Inca Kola 1L", "Coca Cola 1L", "Inca K. 1.5L", "Coca C. 1.5L", "Fanta 1.5L", "Inca Gordita", "Inca K. 2.5L", "Coca C. 2.5L", "Cerveza 630ML", "Cerveza 1L"].map(env => <option key={env} value={env}>{env}</option>)}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2 text-left">
                            <label className="text-[9px] font-black text-blue-600 block">CANTIDAD *</label>
                            <input required type="number" placeholder="0" value={formEnvase.cantidad} onChange={(e) => setFormEnvase({ ...formEnvase, cantidad: e.target.value })} className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-center text-xl font-black text-slate-900 focus:border-blue-600 outline-none" />
                          </div>
                          <div className="space-y-2 text-left">
                            <label className="text-[9px] font-black text-blue-600 text-center block">S/ GARANTÍA *</label>
                            <input required type="number" step="0.10" placeholder="0.00" value={formEnvase.dinero} onChange={(e) => setFormEnvase({ ...formEnvase, dinero: e.target.value })} className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-center text-xl font-black text-slate-900 focus:border-blue-600 outline-none font-mono" />
                          </div>
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-2xl">
                          <button type="button" onClick={() => setFormEnvase({...formEnvase, pago: 'Efectivo'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${formEnvase.pago === 'Efectivo' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>EFECTIVO</button>
                          <button type="button" onClick={() => setFormEnvase({...formEnvase, pago: 'Yape'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${formEnvase.pago === 'Yape' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-400'}`}>YAPE</button>
                        </div>
                        <button type="submit" disabled={!formularioEnvaseValido} className={`w-full font-black py-5 rounded-2xl shadow-xl uppercase text-xs tracking-widest border-b-4 transition-all ${formularioEnvaseValido ? 'bg-blue-600 text-white border-blue-900 active:border-b-0 active:translate-y-1' : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'}`}>REGISTRAR SALIDA</button>
                      </form>
                    </div>
                  )}

                  {vistaModal === 'tabla' && (
                    <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300 w-full mx-auto">
                      <div className="bg-slate-900 p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-blue-500">
                        <div className="text-left w-full sm:w-auto"><h3 className="text-lg font-black text-white uppercase italic tracking-tighter">HISTORIAL RECIENTE</h3></div>
                        <div className="flex gap-6 w-full sm:w-auto justify-between sm:justify-end">
                          <div className="flex flex-col text-right"><span className="text-[8px] font-black text-emerald-400 uppercase mb-1">EFECTIVO</span><span className="text-xl font-black text-white font-mono">S/ {statsEnvases.cashPendiente.toFixed(2)}</span></div>
                          <div className="flex flex-col text-right"><span className="text-[8px] font-black text-purple-400 uppercase mb-1">YAPE</span><span className="text-xl font-black text-white font-mono">S/ {statsEnvases.yapePendiente.toFixed(2)}</span></div>
                        </div>
                      </div>
                      <div className="flex-1 p-2 sm:p-4 bg-slate-50 max-h-[500px] overflow-y-auto">
                        <div className="sm:hidden space-y-3">
                          {envasesFiltrados.map((item) => {
                            const { dia, mes, horaFormateada, esHoy } = formatFechaCorta(item.fecha);
                            const esReciente = item.id === nuevoIdEnvase;
                            return (
                              <div key={item.id} className={`bg-white p-4 rounded-3xl border flex items-center justify-between transition-all duration-700 ${esReciente ? 'scale-[1.02] border-blue-400 ring-2 ring-blue-200 animate-pulse' : 'border-slate-100'}`}>
                                <div className="flex items-center gap-3">
                                  <div className="flex flex-col items-center justify-center">
                                    <div className={`flex flex-col items-center p-2 rounded-xl w-12 border ${esReciente || esHoy ? 'bg-blue-600 border-blue-700 text-white' : 'bg-white border-slate-200'}`}>
                                      <span className="text-md font-black">{dia}</span><span className={`text-[9px] uppercase font-bold ${esReciente || esHoy ? 'text-blue-100' : 'text-slate-400'}`}>{mes}</span>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-[12px] font-black text-slate-600 uppercase">{item.cliente}</p>
                                    <p className="text-[11px] font-black uppercase italic">{item.envase}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-black font-mono">S/ {Number(item.dinero).toFixed(2)}</p>
                                  <button onClick={() => toggleDevuelto(item.id, item.devuelto)} className={`mt-1 text-[8px] font-black px-3 py-1 rounded-lg ${item.devuelto === 1 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                    {item.devuelto === 1 ? 'RECIBIDO' : 'PENDIENTE'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="hidden sm:block">
                          <table className="w-full border-separate border-spacing-y-2">
                            <thead>
                              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
                                <th className="px-4 py-2">Fecha</th><th className="px-4 py-2">Detalle</th><th className="px-4 py-2 text-center">Cant.</th><th className="px-4 py-2 text-right">Garantía</th><th className="px-4 py-2 text-center">Acc.</th>
                              </tr>
                            </thead>
                            <tbody>
                              {envasesFiltrados.map((item) => {
                                const { dia, mes, esHoy } = formatFechaCorta(item.fecha);
                                const esReciente = item.id === nuevoIdEnvase;
                                return (
                                  <tr key={item.id} className={`transition-all duration-1000 ease-in-out ${esReciente ? 'scale-[1.01]' : 'scale-100'}`}>
                                    <td className={`px-4 py-3 rounded-l-2xl transition-colors duration-1000 ${esReciente ? 'bg-blue-600' : 'bg-white border-y border-l border-slate-100'}`}>
                                      <div className="flex flex-col items-center justify-center">
                                        <div className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl border ${esReciente ? 'bg-white text-blue-600 border-white' : esHoy ? 'bg-blue-600 text-white border-blue-700' : 'bg-slate-50 text-slate-900 border-slate-200'}`}>
                                          <span className="text-sm font-black leading-none">{dia}</span><span className="text-[7px] font-black mt-1 uppercase">{mes}</span>
                                        </div>
                                      </div>
                                    </td>
                                    <td className={`px-4 py-3 ${esReciente ? 'bg-blue-600' : 'bg-white border-y border-slate-100'}`}>
                                      <p className={`text-[10px] font-black uppercase ${esReciente ? 'text-blue-100' : 'text-slate-400'}`}>{item.cliente}</p>
                                      <p className={`text-xs font-black uppercase italic ${esReciente ? 'text-white' : 'text-slate-900'}`}>{item.envase}</p>
                                    </td>
                                    <td className={`px-4 py-3 text-center ${esReciente ? 'bg-blue-600' : 'bg-white border-y border-slate-100'}`}>
                                      <span className={`text-lg font-black font-mono ${esReciente ? 'text-white' : 'text-blue-600'}`}>{item.cantidad}</span>
                                    </td>
                                    <td className={`px-4 py-3 text-right ${esReciente ? 'bg-blue-600' : 'bg-white border-y border-slate-100'}`}>
                                      <p className={`text-md font-black font-mono ${esReciente ? 'text-white' : 'text-slate-900'}`}>S/ {Number(item.dinero).toFixed(2)}</p>
                                      <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded ${esReciente ? 'bg-blue-400 text-white' : (item.pago === 'Yape' ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600')}`}>{item.pago}</span>
                                    </td>
                                    <td className={`px-4 py-3 rounded-r-2xl text-center ${esReciente ? 'bg-blue-600' : 'bg-white border-y border-r border-slate-100'}`}>
                                      <button onClick={() => toggleDevuelto(item.id, item.devuelto)} className={`text-[9px] font-black px-3 py-2 rounded-xl border-2 transition-all ${item.devuelto === 1 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                        {item.devuelto === 1 ? 'RECIBIDO' : 'PENDIENTE'}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* MODAL DINERO SOBRANTE */}
              {accionActiva === 'dine_sobrante' && (
                <>
                  {vistaModal === 'form' && (
                    <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-xl border-b-[10px] border-emerald-600 animate-in fade-in zoom-in duration-300">
                      <h3 className="text-xl font-black text-slate-900 uppercase text-center mb-6 italic">Dinero Sobrante</h3>
                      <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); if(formularioDineroValido) setConfirmandoDinero(true); }}>
                        <div>
                          <label className="text-[10px] font-black text-emerald-600 uppercase mb-3 block tracking-widest ml-1">Cajero de Turno</label>
                          <select required value={formDinero.cajero} onChange={(e) => setFormDinero({ ...formDinero, cajero: e.target.value })} className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-sm font-black text-slate-900 outline-none uppercase appearance-none transition-all">
                            <option value="">SELECCIONAR...</option>
                            {listaCajeros.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-emerald-600 uppercase mb-3 block tracking-widest ml-1">Método</label>
                          <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
                            <button type="button" onClick={() => setFormDinero({...formDinero, tipo: "1"})} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${formDinero.tipo === "1" ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>EFECTIVO</button>
                            <button type="button" onClick={() => setFormDinero({...formDinero, tipo: "0"})} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${formDinero.tipo === "0" ? 'bg-[#7322e1] text-white shadow-sm' : 'text-slate-400'}`}>YAPE</button>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-emerald-600 uppercase mb-3 block tracking-widest ml-1">Monto Excedente</label>
                          <div className="relative flex items-center">
                            <span className="absolute left-5 text-2xl font-black text-emerald-500">S/</span>
                            <input required type="number" step="0.10" placeholder="0.00" value={formDinero.dinero} onChange={(e) => setFormDinero({ ...formDinero, dinero: e.target.value })} className="w-full border-2 border-slate-100 bg-slate-50 p-6 pl-14 rounded-3xl text-center text-5xl font-black text-slate-900 outline-none transition-all" />
                          </div>
                        </div>
                        <button type="submit" disabled={!formularioDineroValido} className={`w-full font-black py-5 rounded-2xl shadow-xl uppercase text-xs tracking-widest border-b-4 transition-all ${formularioDineroValido ? 'bg-emerald-600 text-white border-emerald-900 active:border-b-0 active:translate-y-1' : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'}`}>REGISTRAR INGRESO</button>
                      </form>
                    </div>
                  )}

                  {vistaModal === 'tabla' && (
                    <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300 w-full mx-auto">
                      <div className="bg-slate-900 p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-emerald-500">
                        <div className="text-left w-full sm:w-auto"><h3 className="text-lg font-black text-white uppercase italic tracking-tighter">HISTORIAL RECIENTE</h3></div>
                        <div className="flex gap-4 w-full sm:w-auto justify-between sm:justify-end">
                          <div className="flex flex-col text-right"><span className="text-[8px] font-black text-slate-400 uppercase mb-1">EFECTIVO</span><span className="text-lg font-black text-white font-mono">S/ {resumenDinero.efectivo.toFixed(2)}</span></div>
                          <div className="flex flex-col text-right"><span className="text-[8px] font-black text-[#a77df3] uppercase mb-1">YAPE</span><span className="text-lg font-black text-[#d0bcff] font-mono">S/ {resumenDinero.yape.toFixed(2)}</span></div>
                          <div className="flex flex-col text-right pl-4 border-l border-slate-700"><span className="text-[8px] font-black text-emerald-400 uppercase mb-1">TOTAL</span><span className="text-lg font-black text-emerald-400 font-mono">S/ {resumenDinero.total.toFixed(2)}</span></div>
                        </div>
                      </div>
                      <div className="flex-1 p-2 sm:p-4 bg-slate-50 max-h-[500px] overflow-y-auto">
                        <table className="w-full border-separate border-spacing-y-2">
                          <thead>
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
                              <th className="px-4 py-2">Fecha</th>
                              <th className="px-4 py-2">Cajero</th>
                              <th className="px-4 py-2 text-center">Tipo</th>
                              <th className="px-4 py-2 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {registrosDinero.map((item) => {
                              const { dia, mes, esHoy } = formatFechaCorta(item.fecha);
                              const esReciente = item.id === nuevoIdDinero;
                              return (
                                <tr key={item.id} className={`transition-all duration-1000 ease-in-out ${esReciente ? 'scale-[1.01]' : 'scale-100'}`}>
                                  <td className={`px-4 py-3 rounded-l-2xl transition-colors duration-1000 ${esReciente ? 'bg-emerald-600' : 'bg-white border-y border-l border-slate-100'}`}>
                                    <div className="flex flex-col items-center justify-center">
                                      <div className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl border ${esReciente ? 'bg-white text-emerald-600 border-white' : esHoy ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-slate-50 text-slate-900 border-slate-200'}`}>
                                        <span className="text-sm font-black leading-none">{dia}</span><span className="text-[7px] font-black mt-1 uppercase">{mes}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className={`px-4 py-3 ${esReciente ? 'bg-emerald-600' : 'bg-white border-y border-slate-100'}`}>
                                    <p className={`text-xs font-black uppercase ${esReciente ? 'text-white' : 'text-slate-900'}`}>{item.cajero}</p>
                                  </td>
                                  <td className={`px-4 py-3 text-center ${esReciente ? 'bg-emerald-600' : 'bg-white border-y border-slate-100'}`}>
                                    {item.tipo === 0 || item.tipo === "0" ? (
                                      <span className={`text-[8px] font-black px-3 py-1 rounded-full uppercase ${esReciente ? 'bg-white text-[#7322e1]' : 'bg-[#7322e1] text-white'}`}>Yape</span>
                                    ) : (
                                      <span className={`text-[8px] font-black px-3 py-1 rounded-full uppercase ${esReciente ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-200 text-slate-600'}`}>Cash</span>
                                    )}
                                  </td>
                                  <td className={`px-4 py-3 rounded-r-2xl text-right ${esReciente ? 'bg-emerald-600' : 'bg-white border-y border-r border-slate-100'}`}>
                                    <p className={`text-lg font-black font-mono ${esReciente ? 'text-white' : 'text-emerald-600'}`}>S/ {parseFloat(item.dinero).toFixed(2)}</p>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* MODAL INVENTARIO (FALTANTES Y SOBRANTES) */}
              {accionActiva === 'inventario' && (
                <>
                  <div className="flex justify-center gap-2 mb-4">
                    <button onClick={() => setTipoInventario("faltantes")} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${tipoInventario === "faltantes" ? "bg-orange-600 text-white shadow-md" : "bg-white text-slate-400 border border-slate-200 hover:text-orange-500"}`}>📉 Faltantes</button>
                    <button onClick={() => setTipoInventario("sobrantes")} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${tipoInventario === "sobrantes" ? "bg-indigo-600 text-white shadow-md" : "bg-white text-slate-400 border border-slate-200 hover:text-indigo-500"}`}>📦 Sobrantes</button>
                  </div>
                  
                  {vistaModal === 'form' && (
                    <div className={`bg-white p-6 sm:p-8 rounded-[2rem] shadow-xl border-b-[10px] ${INV_CONFIG.borderBtn} animate-in fade-in zoom-in duration-300`}>
                      <h3 className={`text-xl font-black ${INV_CONFIG.text} uppercase text-center mb-6 italic`}>Reporte de {INV_CONFIG.label.split('.')[0]}</h3>
                      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); if(formularioInventarioValido) setConfirmandoInventario(true); }}>
                        <input required placeholder="PRODUCTO (Ej. COCA COLA 1L)" value={formInventario.producto} onChange={(e) => setFormInventario({ ...formInventario, producto: e.target.value })} className={`w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-sm font-black outline-none uppercase transition-all focus:${INV_CONFIG.borderBtn}`} />
                        <div className="grid grid-cols-2 gap-4">
                          <input required type="number" placeholder="CANTIDAD" value={formInventario.cantidad} onChange={(e) => setFormInventario({ ...formInventario, cantidad: e.target.value })} className={`w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-center font-black outline-none transition-all focus:${INV_CONFIG.borderBtn}`} />
                          <input required type="number" step="0.10" placeholder="PRECIO UNIT. S/" value={formInventario.precio} onChange={(e) => setFormInventario({ ...formInventario, precio: e.target.value })} className={`w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-center font-black outline-none transition-all focus:${INV_CONFIG.borderBtn}`} />
                        </div>
                        <button type="submit" disabled={!formularioInventarioValido} className={`w-full ${INV_CONFIG.bgBtn} text-white font-black py-5 rounded-2xl shadow-xl uppercase border-b-4 ${INV_CONFIG.borderBtn} active:border-b-0 text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed`}>REGISTRAR {INV_CONFIG.label.split('.')[0]}</button>
                      </form>
                    </div>
                  )}

                  {vistaModal === 'tabla' && (
                    <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300 w-full mx-auto">
                      <div className={`p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-center gap-4 border-b ${INV_CONFIG.bgBtn} text-white`}>
                        <div className="text-left w-full sm:w-auto"><h3 className="text-lg font-black uppercase italic tracking-tighter">HISTORIAL {INV_CONFIG.label.split('.')[0]}</h3></div>
                        <div className="flex gap-4 w-full sm:w-auto justify-between sm:justify-end">
                          <div className="flex flex-col text-right"><span className={`text-[8px] font-black ${INV_CONFIG.textLight} uppercase mb-1`}>TOTAL ACUMULADO</span><span className="text-xl font-black font-mono">S/ {totalInventario.toFixed(2)}</span></div>
                        </div>
                      </div>
                      <div className="flex-1 p-2 sm:p-4 bg-slate-50 max-h-[400px] overflow-y-auto">
                        <table className="w-full border-separate border-spacing-y-2">
                          <thead>
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
                              <th className="px-4 py-2">Fecha</th>
                              <th className="px-4 py-2">Producto</th>
                              <th className="px-4 py-2 text-center">Cant.</th>
                              <th className="px-4 py-2 text-right">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {registrosInventario.map((item) => {
                              const { dia, mes, esHoy } = formatFechaCorta(item.fecha);
                              const esReciente = item.id === nuevoIdInventario;
                              return (
                                <tr key={item.id} className={`transition-all duration-1000 ease-in-out ${esReciente ? 'scale-[1.01]' : 'scale-100'}`}>
                                  <td className={`px-4 py-3 rounded-l-2xl transition-colors duration-1000 ${esReciente ? INV_CONFIG.bgBtn : 'bg-white border-y border-l border-slate-100'}`}>
                                    <div className="flex flex-col items-center justify-center">
                                      <div className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl border ${esReciente ? `bg-white ${INV_CONFIG.text} border-white` : esHoy ? `${INV_CONFIG.bgBtn} text-white ${INV_CONFIG.borderBtn}` : 'bg-slate-50 text-slate-900 border-slate-200'}`}>
                                        <span className="text-sm font-black leading-none">{dia}</span><span className="text-[7px] font-black mt-1 uppercase">{mes}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className={`px-4 py-3 ${esReciente ? INV_CONFIG.bgBtn : 'bg-white border-y border-slate-100'}`}>
                                    <p className={`text-xs font-black uppercase ${esReciente ? 'text-white' : 'text-slate-900'}`}>{item.producto}</p>
                                    <p className={`text-[9px] font-bold uppercase ${esReciente ? INV_CONFIG.textLight : 'text-slate-400'}`}>Unit: S/ {parseFloat(item.precio).toFixed(2)}</p>
                                  </td>
                                  <td className={`px-4 py-3 text-center ${esReciente ? INV_CONFIG.bgBtn : 'bg-white border-y border-slate-100'}`}>
                                    <span className={`text-[10px] font-black px-3 py-1 rounded-full ${esReciente ? `bg-white ${INV_CONFIG.text}` : `${INV_CONFIG.bgBtn.replace('bg-', 'bg-').concat('/10')} ${INV_CONFIG.text}`}`}>{item.cantidad}</span>
                                  </td>
                                  <td className={`px-4 py-3 rounded-r-2xl text-right ${esReciente ? INV_CONFIG.bgBtn : 'bg-white border-y border-r border-slate-100'}`}>
                                    <p className={`text-lg font-black font-mono ${esReciente ? 'text-white' : INV_CONFIG.text}`}>S/ {(parseFloat(item.cantidad) * parseFloat(item.precio)).toFixed(2)}</p>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* MODAL PROVEEDORES */}
              {accionActiva === 'proveedores' && (
                <>
                  {vistaModal === 'form' && (
                    <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-xl border-b-[10px] border-indigo-600 animate-in fade-in zoom-in duration-300">
                      <h3 className="text-xl font-black text-slate-900 uppercase text-center mb-6 italic">Generar Pedido</h3>
                      <form className="space-y-4" onSubmit={manejarEnvioPedido}>
                        
                        {/* PESTAÑAS DE DÍAS DENTRO DEL FORM */}
                        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
                          {diasSemana.map(dia => (
                            <button key={dia} type="button" onClick={() => setDiaAbierto(diaAbierto === dia ? null : dia)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase shrink-0 transition-all ${diaAbierto === dia ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                              {dia}
                            </button>
                          ))}
                        </div>
                        {diaAbierto && (
                          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto bg-slate-50 p-2 rounded-xl border border-slate-200">
                             {proveedoresDelDiaActivo.map(p => (
                               <div key={p.id} onClick={() => setFormProveedor({...formProveedor, proveedor: p.nombre})} className={`cursor-pointer p-2 rounded-lg text-[10px] font-black uppercase border transition-all ${formProveedor.proveedor === p.nombre ? 'bg-indigo-100 border-indigo-500 text-indigo-800' : 'bg-white border-slate-200 text-slate-600'}`}>
                                 {p.nombre}
                               </div>
                             ))}
                             {proveedoresDelDiaActivo.length === 0 && <div className="col-span-2 text-center text-slate-400 text-xs py-4">NO HAY PROVEEDORES ASIGNADOS AL {diaAbierto.toUpperCase()}</div>}
                          </div>
                        )}

                        <select required value={formProveedor.proveedor} onChange={(e) => setFormProveedor({ ...formProveedor, proveedor: e.target.value })} className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-sm font-black outline-none uppercase cursor-pointer">
                          <option value="">{diaAbierto ? `PROVEEDORES DEL ${diaAbierto.toUpperCase()}` : "SELECCIONAR PROVEEDOR..."}</option>
                          {opcionesSelectProveedores.map(nombre => <option key={nombre} value={nombre}>{nombre}</option>)}
                        </select>
                        <input required type="text" placeholder="PRODUCTO (Ej. PILSEN 630)" value={formProveedor.producto} onChange={(e) => setFormProveedor({ ...formProveedor, producto: e.target.value })} className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-sm font-black outline-none uppercase" />
                        <input required type="number" placeholder="CANTIDAD (UNID.)" min="1" value={formProveedor.cantidad} onChange={(e) => setFormProveedor({ ...formProveedor, cantidad: e.target.value })} className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-center font-black outline-none" />
                        <button type="submit" disabled={loadingDB} className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl uppercase border-b-4 border-indigo-900 text-xs">ENVIAR PEDIDO</button>
                      </form>
                    </div>
                  )}

                  {vistaModal === 'tabla' && (
                    <div className="bg-slate-900 rounded-[2rem] shadow-xl overflow-hidden min-h-[400px] text-white animate-in fade-in zoom-in duration-300">
                      <div className="p-4 border-b border-white/10 flex justify-between items-center"><span className="font-black italic text-sm">MONITOR DE PEDIDOS</span></div>
                      
                      <div className="p-4 max-h-[450px] overflow-y-auto space-y-4">
                        {Array.from(new Set(pedidosActivosFiltrados.map(pr => pr.proveedor))).map(provName => {
                          const items = pedidosActivosFiltrados.filter(pr => pr.proveedor === provName);
                          const recibidos = items.every(i => i.recibido);
                          return (
                            <div key={provName} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                              <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-3">
                                <h4 className="font-black text-sm text-indigo-300 uppercase">{provName}</h4>
                                <div className="flex gap-2">
                                  {!recibidos && <button onClick={() => marcarGrupoComoRecibido(provName, items.map(i=>i.id))} className="bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-black uppercase px-2 py-1.5 rounded transition-colors">✓ Recibido</button>}
                                  {recibidos && <button onClick={() => revertirGrupoProveedor(provName, items.map(i=>i.id))} className="bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-black uppercase px-2 py-1.5 rounded transition-colors">↩ Deshacer</button>}
                                  <button onClick={() => ocultarGrupoProveedor(items.map(i=>i.id))} className="bg-slate-700 hover:bg-slate-600 text-white text-[9px] font-black uppercase px-2 py-1.5 rounded transition-colors">✕ Ocultar</button>
                                  <button onClick={() => eliminarGrupoProveedor(provName, items.map(i=>i.id))} className="bg-rose-600/30 text-rose-400 hover:text-white px-2 py-1.5 rounded transition-colors text-xs font-bold">🗑</button>
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                {items.map(item => (
                                  <div key={item.id} className={`flex justify-between items-center text-xs p-2.5 rounded-lg border ${item.recibido ? 'border-slate-500 bg-slate-800 text-slate-400' : 'border-white/10 bg-white/5'}`}>
                                    <div className="flex flex-col">
                                      <span className="font-bold uppercase truncate">{item.producto}</span>
                                      <span className="font-black text-indigo-400 text-[10px]">{item.cantidad}</span>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                      {item.recibido && <button onClick={() => revertirPedidoIndividual(item.id)} className="text-[9px] text-blue-400 font-black uppercase hover:underline">↩ Revertir</button>}
                                      <button onClick={() => editarPedidoIndividual(item)} className="text-slate-400 hover:text-indigo-400 text-[10px]">✏️</button>
                                      <button onClick={() => eliminarPedidoIndividual(item.id)} className="text-slate-400 hover:text-rose-400 text-[10px] font-black">✕</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        {pedidosActivosFiltrados.length === 0 && <div className="text-center text-slate-500 text-xs py-10 uppercase font-bold">Sin pedidos activos</div>}
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}