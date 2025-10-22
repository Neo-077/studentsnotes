import * as XLSX from 'sheetjs'
export function exportToExcel(sheets: Record<string, any[]>){
  const wb = XLSX.utils.book_new()
  Object.entries(sheets).forEach(([name, rows])=>{
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0,31))
  })
  XLSX.writeFile(wb, 'studentsnotes.xlsx')
}
