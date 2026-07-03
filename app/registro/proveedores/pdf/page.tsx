"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase"; // Asegúrate de que esta ruta apunte a tu archivo supabase.ts

interface PedidoPDF {
  id: number;
  proveedor: string;
  producto: string;
  cantidad: string;
  precio: number | null;
  creado_en: string;
}

function VistaPDFContent() {
  const searchParams = useSearchParams();
  const idsParam = searchParams.get("ids");
  
  const [pedidos, setPedidos] = useState<PedidoPDF[]>([]);
  const [proveedorNombre, setProveedorNombre] = useState<string>("VARIOS");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      if (!idsParam) {
        setCargando(false);
        return;
      }

      // Convertimos el string "1,2,3" en un array de números [1, 2, 3]
      const idsArray = idsParam.split(',').map(id => Number(id.trim())).filter(id => !isNaN(id));

      if (idsArray.length === 0) {
        setCargando(false);
        return;
      }

      // Buscamos EXACTAMENTE los IDs que pasamos por la URL
      const { data, error } = await supabase
        .from("pedidos")
        .select("id, proveedor, producto, cantidad, precio, creado_en, orden")
        .in("id", idsArray)
        .order("orden", { ascending: true });

      if (!error && data && data.length > 0) {
        setPedidos(data);
        // Tomamos el nombre del proveedor del primer producto
        setProveedorNombre(data[0].proveedor);
      }
      setCargando(false);
    };

    cargarDatos();
  }, [idsParam]);

  const opcionesFecha: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const fechaLegible = new Date().toLocaleDateString("es-ES", opcionesFecha);
  const totalSuma = pedidos.reduce((acc, item) => acc + Number(item.precio || 0), 0);

  if (cargando) {
    return <div className="flex h-screen items-center justify-center font-black text-xl text-slate-400 uppercase tracking-widest">Generando Documento...</div>;
  }

  if (!idsParam || pedidos.length === 0) {
    return <div className="flex h-screen items-center justify-center font-black text-xl text-red-400 uppercase tracking-widest">No se encontraron los datos del pedido</div>;
  }

  return (
    <div className="min-h-screen bg-slate-200 py-8 print:bg-white print:py-0">
      
      {/* Botones de acción (Ocultos al imprimir) */}
      <div className="max-w-[210mm] mx-auto mb-4 flex justify-end gap-4 print:hidden">
        <button 
          onClick={() => window.close()} 
          className="px-4 py-2 bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold rounded-lg text-sm uppercase tracking-wider transition-colors"
        >
          Cerrar
        </button>
        <button 
          onClick={() => window.print()} 
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-lg text-sm uppercase tracking-wider shadow-lg transition-colors"
        >
          🖨️ Imprimir / Guardar PDF
        </button>
      </div>

      {/* Contenedor A4 */}
      <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white p-[20mm] shadow-2xl print:shadow-none print:m-0 print:w-full print:max-w-none text-slate-900">
        
        <header className="border-b-2 border-slate-900 pb-6 mb-8">
          <h1 className="text-3xl font-black uppercase tracking-tighter">Nota de Pedido</h1>
          <h2 className="text-2xl font-bold text-indigo-700 uppercase mt-1">{proveedorNombre}</h2>
          <p className="text-sm font-semibold text-slate-500 mt-4 uppercase tracking-widest">
            Generado el: {fechaLegible}
          </p>
        </header>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b-2 border-slate-800">
              <th className="py-3 px-2 font-black uppercase text-xs tracking-wider w-12 text-center">#</th>
              <th className="py-3 px-2 font-black uppercase text-xs tracking-wider">Producto</th>
              <th className="py-3 px-2 font-black uppercase text-xs tracking-wider text-center w-32">Cantidad</th>
              <th className="py-3 px-2 font-black uppercase text-xs tracking-wider text-right w-32">Precio</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((item, index) => {
              // Lógica de detección y colores
              const esBono = item.producto.toUpperCase().includes("[BONO]");
              const esPercepcion = item.producto.toUpperCase() === "PERCEPCIÓN";
              
              const filaClase = esPercepcion 
                ? "bg-amber-100/50 print:bg-amber-100/50" // Mostaza suave
                : esBono 
                  ? "bg-purple-100/50 print:bg-purple-100/50" // Morado suave
                  : "";

              const textoClase = esPercepcion 
                ? "text-amber-900 font-black" 
                : esBono 
                  ? "text-purple-900 font-black" 
                  : "text-slate-900";

              return (
                <tr 
                  key={item.id} 
                  className={`border-b border-slate-200 ${filaClase}`}
                >
                  <td className="py-3 px-2 text-sm text-center font-bold text-slate-500">{index + 1}</td>
                  <td className={`py-3 px-2 text-sm uppercase ${textoClase}`}>
                    {item.producto}
                  </td>
                  <td className={`py-3 px-2 text-sm text-center font-bold ${textoClase}`}>
                    {item.cantidad === "-" ? "N/A" : item.cantidad}
                  </td>
                  <td className={`py-3 px-2 text-sm text-right font-black ${textoClase}`}>
                    {item.precio ? `S/ ${item.precio.toFixed(2)}` : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Resumen Final */}
        <div className="mt-8 flex justify-end">
          <div className="bg-slate-50 p-4 border-2 border-slate-900 rounded-xl min-w-[250px]">
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-200">
               <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Items:</span>
               <span className="text-sm font-black text-slate-700">{pedidos.length}</span>
            </div>
            
            {totalSuma > 0 && (
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Monto Total Estimado</span>
                <span className="text-2xl font-black text-slate-900 text-right">S/ {totalSuma.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// Envolvemos en Suspense porque usamos useSearchParams
export default function VistaPDF() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center font-black text-xl text-slate-400 uppercase tracking-widest">Cargando Documento...</div>}>
      <VistaPDFContent />
    </Suspense>
  );
}