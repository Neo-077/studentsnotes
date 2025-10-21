
import { supabaseAdmin } from './supabaseClient.js'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import * as XLSX from 'xlsx'

export async function fetchAllStudents(){
  const { data, error } = await supabaseAdmin.from('students').select('*')
  if(error) throw new Error(error.message)
  return data || []
}

export async function buildCSV(){
  const rows = await fetchAllStudents()
  if(!rows.length) return 'nombre,matricula,carrera,semestre\n'
  const headers = Object.keys(rows[0])
  const lines = [headers.join(',')]
  for(const r of rows){
    lines.push(headers.map(h=> JSON.stringify((r as any)[h] ?? '')).join(','))
  }
  return lines.join('\n')
}

export async function buildXLSXBuffer(){
  const rows = await fetchAllStudents()
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Students')
  return XLSX.write(wb, { bookType:'xlsx', type:'buffer' })
}

export async function buildPDFBuffer(){
  const rows = await fetchAllStudents()
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842])
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  let y = 800
  page.drawText('Reporte de Estudiantes – StudentsNotes', { x: 40, y, size: 14, font: fontBold, color: rgb(0.15,0.15,0.2) })
  y -= 24
  const cols = ['nombre','matricula','carrera','semestre','promedio','estado']
  page.drawText(cols.join(' | '), { x: 40, y, size: 10, font })
  y -= 14
  rows.slice(0, 40).forEach(r=>{
    const line = cols.map(c=> String((r as any)[c] ?? '')).join(' | ')
    page.drawText(line, { x: 40, y, size: 10, font })
    y -= 12
  })
  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
