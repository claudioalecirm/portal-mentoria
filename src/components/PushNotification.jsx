export default function PushNotification({ title, body, tag, onClose }) {
  return (
    <div className="push-notification">
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: 'rgba(200,169,122,0.15)', border: '1px solid #c8a97a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Cormorant Garamond', serif", fontSize: 13,
        color: '#c8a97a', fontWeight: 500, flexShrink: 0
      }}>CA</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', marginBottom: 2 }}>
          Portal de Mentoria · agora
        </div>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#fff', marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', lineHeight: 1.4 }}>{body}</div>
      </div>
      <button className="push-close" onClick={onClose}>×</button>
    </div>
  )
}
