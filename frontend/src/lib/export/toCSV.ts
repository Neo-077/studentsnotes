import Papa from 'papaparse'
export function exportToCSV(rows: any[], name='studentsnotes.csv'){
  const csv = Papa.unparse(rows)
  const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'})
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
}
