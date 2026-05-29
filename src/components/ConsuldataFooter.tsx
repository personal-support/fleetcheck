export function ConsuldataFooter() {
  return (
    <footer style={{
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTop: '1px solid rgba(201,168,76,0.25)',
      background: 'var(--cd-surface)',
      flexShrink: 0,
      gap: 8,
      flexWrap: 'wrap',
    }}>
      <a href="https://wa.me/5511957737933" target="_blank" rel="noreferrer"
        style={{ fontSize: 10, color: 'var(--cd-orange)', fontFamily: "'Open Sans', sans-serif", textDecoration: 'none', fontWeight: 600 }}>
        📱 11.95773.7933
      </a>
      <a href="/manual.html" target="_blank" rel="noreferrer"
        style={{ fontSize: 10, color: 'var(--cd-orange)', fontFamily: "'Open Sans', sans-serif", textDecoration: 'none', fontWeight: 600 }}>
        📋 Manual
      </a>
      <a href="https://www.personalsupport.tec.br/" target="_blank" rel="noreferrer"
        style={{ fontSize: 10, color: 'var(--cd-subtext)', fontFamily: "'Open Sans', sans-serif", textDecoration: 'none', textAlign: 'right' }}>
        © Todos os Direitos Reservados a Personal Support
      </a>
    </footer>
  )
}
