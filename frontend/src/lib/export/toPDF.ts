import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export async function exportToPDF(selector = 'main'){
  const el = document.querySelector(selector) as HTMLElement
  if(!el) return
  const canvas = await html2canvas(el)
  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF('l', 'pt', [canvas.width, canvas.height])
  pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
  pdf.save('studentsnotes.pdf')
}
