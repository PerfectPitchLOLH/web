export function makeResponsiveSvg(svgText: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgText, 'image/svg+xml')
  const svg = doc.querySelector('svg')
  if (!svg) return svgText
  const width = svg.getAttribute('width')
  const height = svg.getAttribute('height')
  const viewBox = svg.getAttribute('viewBox')
  if (!viewBox && width && height) {
    const w = parseFloat(width.replace(/[^0-9.]/g, ''))
    const h = parseFloat(height.replace(/[^0-9.]/g, ''))
    if (!isNaN(w) && !isNaN(h)) {
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
    }
  }
  svg.removeAttribute('width')
  svg.removeAttribute('height')
  svg.setAttribute('width', '100%')
  svg.setAttribute('height', 'auto')
  return new XMLSerializer().serializeToString(doc)
}
