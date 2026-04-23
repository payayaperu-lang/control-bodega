export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-700 to-indigo-900 text-white flex items-center justify-center px-6">
      <div className="max-w-5xl w-full grid md:grid-cols-2 gap-10 items-center">
        
        {/* Texto izquierda */}
        <div>
          <p className="uppercase tracking-widest text-blue-200 mb-3">
            Sistema Inteligente
          </p>

          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
            CONTROL <span className="text-yellow-300">BODEGA</span>
          </h1>

          <p className="text-lg text-blue-100 mb-8 leading-relaxed">
            Administra trabajadores, caja, productos faltantes, envases
            retornables y reportes diarios desde cualquier dispositivo.
          </p>

          <a
            href="/login"
            className="inline-block bg-yellow-400 text-black font-semibold px-8 py-4 rounded-2xl hover:scale-105 transition"
          >
            Iniciar Sesión
          </a>
        </div>

        {/* Caja derecha */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl">
          <h2 className="text-2xl font-bold mb-6">Resumen del Sistema</h2>

          <div className="space-y-4">
            <div className="bg-white/10 p-4 rounded-xl">
              💵 Control de caja por turnos
            </div>

            <div className="bg-white/10 p-4 rounded-xl">
              📦 Registro de productos faltantes
            </div>

            <div className="bg-white/10 p-4 rounded-xl">
              🥤 Control de envases prestados
            </div>

            <div className="bg-white/10 p-4 rounded-xl">
              👷 Historial por trabajador
            </div>

            <div className="bg-white/10 p-4 rounded-xl">
              📊 Reportes automáticos
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}