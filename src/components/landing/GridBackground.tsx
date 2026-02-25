export function GridBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          maskImage:
            'radial-gradient(ellipse at center, black 0%, black 20%, transparent 60%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at center, black 0%, black 20%, transparent 60%)',
        }}
      />
    </div>
  )
}
