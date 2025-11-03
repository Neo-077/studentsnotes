
import { Request, Response } from 'express'
import { buildCSV, buildXLSXBuffer, buildPDFBuffer } from '../utils/exportUtils.js'

export async function exportCSV(_req: Request, res: Response){
  const csv = await buildCSV()
  res.setHeader('Content-Type','text/csv; charset=utf-8')
  res.setHeader('Content-Disposition','attachment; filename="students.csv"')
  res.send(csv)
}
export async function exportExcel(_req: Request, res: Response){
  const buf = await buildXLSXBuffer()
  res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition','attachment; filename="students.xlsx"')
  res.send(buf)
}
export async function exportPDF(_req: Request, res: Response){
  const buf = await buildPDFBuffer()
  res.setHeader('Content-Type','application/pdf')
  res.setHeader('Content-Disposition','attachment; filename="students.pdf"')
  res.send(buf)
}
