import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="22" height="13" rx="2" />
                <path d="M5 3v13M19 3v13M1 9h22" />
                <circle cx="7" cy="19" r="2" />
                <circle cx="17" cy="19" r="2" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">Busvio</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Iniciar sesión
            </Link>
            <Link href="/registro" className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
              Empieza gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
            Diseñado para empresas de transporte discrecional
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6 tracking-tight">
            Presupuesta más rápido,<br />
            <span className="text-blue-600">cierra más viajes</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Busvio calcula automáticamente el precio real de cada servicio —
            combustible, conductor, peajes, pluses y margen — y envía el
            presupuesto al cliente en segundos.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/registro" className="w-full sm:w-auto bg-blue-600 text-white px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-blue-700 transition-all hover:shadow-lg hover:shadow-blue-100 hover:-translate-y-0.5">
              Empieza gratis — sin tarjeta
            </Link>
            <Link href="/demo" className="w-full sm:w-auto border border-gray-200 text-gray-700 px-8 py-3.5 rounded-xl text-base font-medium hover:border-gray-300 hover:bg-gray-50 transition-all">
              Ver demo en vivo →
            </Link>
          </div>
          <p className="text-sm text-gray-400 mt-4">
            Configuración en menos de 5 minutos · Sin permanencia
          </p>
        </div>

        {/* Mockup dashboard */}
        <div className="max-w-5xl mx-auto mt-16">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-1 shadow-xl shadow-gray-100">
            <div className="bg-white rounded-xl overflow-hidden border border-gray-100">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-300"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-300"></div>
                  <div className="w-3 h-3 rounded-full bg-green-300"></div>
                </div>
                <div className="flex-1 mx-4 bg-white border border-gray-200 rounded-md px-3 py-1 text-xs text-gray-400">
                  busvio.vercel.app/dashboard
                </div>
              </div>
              <div className="p-6 bg-gray-50">
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {[
                    { label: "Solicitudes hoy", value: "12", color: "text-gray-900" },
                    { label: "En revisión", value: "5", color: "text-amber-600" },
                    { label: "Enviados", value: "4", color: "text-blue-600" },
                    { label: "Aceptados", value: "3", color: "text-green-600" },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white rounded-xl p-4 border border-gray-100">
                      <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
                      <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Solicitudes recientes</span>
                    <span className="text-xs text-gray-400">Hoy</span>
                  </div>
                  {[
                    { origin: "Madrid", dest: "Barcelona", client: "Viajes Pérez S.L.", price: "1.240 €", status: "Enviado", statusColor: "bg-blue-50 text-blue-700" },
                    { origin: "Sevilla", dest: "Granada", client: "Grupo Escolar Sur", price: "420 €", status: "Aceptado", statusColor: "bg-green-50 text-green-700" },
                    { origin: "Valencia", dest: "Alicante", client: "Club Deportivo FC", price: "310 €", status: "En revisión", statusColor: "bg-amber-50 text-amber-700" },
                  ].map((row, i) => (
                    <div key={i} className="px-4 py-3 flex items-center gap-4 border-b border-gray-50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{row.origin} → {row.dest}</p>
                        <p className="text-xs text-gray-400 truncate">{row.client}</p>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{row.price}</span>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${row.statusColor}`}>{row.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
              Todo lo que necesitas para presupuestar
            </h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              Sin hojas de cálculo. Sin cálculos manuales. Sin errores.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>,
                title: "Cálculo automático del precio",
                desc: "Introduce el origen y destino y Busvio calcula los kilómetros reales, el coste de combustible, conductor, peajes y margen de beneficio al instante.",
              },
              {
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
                title: "PDF profesional en un clic",
                desc: "Genera un presupuesto en PDF con tu logo, colores corporativos y datos fiscales. Se envía automáticamente al cliente por email.",
              },
              {
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>,
                title: "Dashboard centralizado",
                desc: "Gestiona todas tus solicitudes desde un panel. Filtra por estado, busca por cliente o destino, y actualiza el precio final antes de enviar.",
              },
            ].map((feature, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-blue-100 hover:shadow-lg hover:shadow-blue-50 transition-all group">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
              Cómo funciona
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Tu cliente rellena el formulario", desc: "Comparte tu enlace personalizado. El cliente introduce el origen, destino, fecha y pasajeros." },
              { step: "02", title: "Busvio calcula el precio", desc: "En segundos tienes el coste real del servicio con desglose completo visible solo para ti." },
              { step: "03", title: "Envías el presupuesto en PDF", desc: "Con un clic envías el PDF por email con tu imagen de marca. El cliente acepta o negocia." },
            ].map((item, i) => (
              <div key={i} className="relative z-10">
                <span className="text-5xl font-black text-blue-50 select-none">{item.step}</span>
                <h3 className="text-base font-semibold text-gray-900 mt-1 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-blue-600 rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-blue-500 rounded-full opacity-50"></div>
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-blue-700 rounded-full opacity-40"></div>
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
                Empieza a usarlo hoy mismo
              </h2>
              <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
                Configura tu empresa en menos de 5 minutos y empieza a enviar presupuestos profesionales al instante.
              </p>
              <Link href="/registro" className="inline-block bg-white text-blue-600 font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-50 transition-all hover:shadow-xl hover:-translate-y-0.5 text-base">
                Crear mi cuenta gratis →
              </Link>
              <p className="text-blue-200 text-sm mt-4">Sin tarjeta de crédito · Sin compromiso</p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="22" height="13" rx="2" /><circle cx="7" cy="19" r="2" /><circle cx="17" cy="19" r="2" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-700">Busvio</span>
          </div>
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} Busvio · Gestión de presupuestos para transporte discrecional
          </p>
          <div className="flex gap-6">
            <Link href="/login" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Acceder</Link>
            <Link href="/registro" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Registro</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}