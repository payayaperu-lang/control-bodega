"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function InicioRegistroPage() {
  const [saludo, setSaludo] = useState("");

  useEffect(() => {
    const hora = new Date().getHours();
    if (hora < 12) setSaludo("¡Buenos días!");
    else if (hora < 18) setSaludo("¡Buenas tardes!");
    else setSaludo("¡Buenas noches!");
  }, []);

  const accesos = [
    {
      titulo: "Envases",
      desc: "Retornables y botellas de vidrio",
      icon: "🍾", // Icono de botella de vidrio
      href: "/registro/envases",
      color: "border-blue-500",
      bg: "bg-blue-50",
      textColor: "text-blue-600"
    },
    {
      titulo: "Faltantes",
      desc: "Snacks, galletas y abarrotes",
      icon: "🍪", // Icono de galleta/bodega
      href: "/registro/pfaltantes",
      color: "border-orange-500",
      bg: "bg-orange-50",
      textColor: "text-orange-600"
    },
    {
      titulo: "P. Sobrantes",
      desc: "Mercadería excedente",
      icon: "🥨", // Icono de snack/pretzel para bodega
      href: "/registro/psobrantes",
      color: "border-indigo-500",
      bg: "bg-indigo-50",
      textColor: "text-indigo-600"
    },
    {
      titulo: "D. Sobrantes",
      desc: "Dinero extra en caja",
      icon: "💵",
      href: "/registro/dsobrantes",
      color: "border-emerald-500",
      bg: "bg-emerald-50",
      textColor: "text-emerald-600"
    }
  ];

  return (
    <div className="max-w-5xl mx-auto pt-10 pb-20 px-4">
      {/* SECCIÓN BIENVENIDA */}
      <div className="mb-12">
        <h2 className="text-blue-600 font-black uppercase tracking-[0.3em] text-[10px] mb-2 ml-1">
          Bodega Payaya • Sistema de Registro
        </h2>
        <h1 className="text-6xl font-black text-slate-900 tracking-tighter italic leading-none mb-4">
          {saludo.toUpperCase()}
        </h1>
        <p className="text-slate-500 font-medium text-lg max-w-md leading-relaxed">
          Selecciona la categoría de mercadería o efectivo que deseas registrar hoy.
        </p>
      </div>

      {/* GRILLA DE ACCESOS DIRECTOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {accesos.map((item) => (
          <Link key={item.href} href={item.href}>
            <div className={`group relative bg-white p-8 rounded-[2.5rem] border-2 border-transparent hover:${item.color} shadow-xl hover:shadow-2xl transition-all cursor-pointer overflow-hidden`}>
              <div className="flex items-start justify-between relative z-10">
                <div>
                  <span className={`${item.bg} ${item.textColor} px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest`}>
                    Acceso Rápido
                  </span>
                  <h3 className="text-3xl font-black text-slate-900 mt-4 mb-1 uppercase italic tracking-tighter">
                    {item.titulo}
                  </h3>
                  <p className="text-slate-400 font-bold text-sm uppercase">
                    {item.desc}
                  </p>
                </div>
                <span className="text-5xl transition-all duration-500">
                  {item.icon}
                </span>
              </div>
              
              <div className={`absolute -bottom-4 -right-4 w-24 h-24 ${item.bg} rounded-full opacity-0 group-hover:opacity-50 transition-all blur-2xl`}></div>
            </div>
          </Link>
        ))}
      </div>

      {/* NOTA DE PIE */}
      <div className="mt-12 p-8 bg-slate-900 rounded-[2.5rem] text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-orange-500 to-indigo-500"></div>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.5em] mb-2">Inventario de Bodega</p>
        <p className="text-white font-bold italic uppercase tracking-tight">
          "Cada galleta y cada envase cuenta para el cierre de caja."
        </p>
      </div>
    </div>
  );
}