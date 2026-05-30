export function ConsuldataFooter() {
  return (
    <footer style={{
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTop: '1px solid var(--cd-border)',
      background: 'var(--cd-surface)',
      flexShrink: 0,
      gap: 8,
    }}>
      <span style={{ fontSize: 10, color: 'var(--cd-subtext)', fontFamily: "'Open Sans', sans-serif" }}>
        Consuldata - Logística
      </span>
      <a href="/manual.html" target="_blank" rel="noreferrer"
        style={{ fontSize: 10, color: 'var(--cd-orange)', fontFamily: "'Open Sans', sans-serif", textDecoration: 'none', fontWeight: 600 }}>
        📋 Manual
      </a>
      <span style={{ fontSize: 10, color: 'var(--cd-subtext)', fontFamily: "'Open Sans', sans-serif", textAlign: 'right' }}>
        Desenvolvido por Jucimar Lopes
      </span>
    </footer>
  )
}
