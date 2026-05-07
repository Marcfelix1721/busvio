export default function PublicThanksPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', system-ui, sans-serif", padding: 24 }}>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 20, padding: '48px 40px', maxWidth: 480, width: '100%', textAlign: 'center' as const }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: '0 0 8px' }}>¡Solicitud enviada!</h1>
        <p style={{ fontSize: 15, color: '#6b7280', margin: '0 0 24px', lineHeight: 1.6 }}>
          Hemos recibido tu solicitud de presupuesto.<br />
          Nos pondremos en contacto contigo en <strong>menos de 24 horas</strong>.
        </p>
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 20px' }}>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>¿Tienes dudas? Llámanos directamente o espera nuestra respuesta por email.</p>
        </div>
      </div>
    </div>
  )
}