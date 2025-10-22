export function buildPareto<T>(items:T[], getValue:(x:T)=>number, getLabel:(x:T)=>string){
  const sorted = [...items].sort((a,b)=> getValue(b)-getValue(a))
  const total = sorted.reduce((s,x)=> s+getValue(x), 0) || 1
  let acc = 0
  return sorted.map((x)=>{
    const v = getValue(x)
    acc += v
    return { label: getLabel(x), value: v, acumPct: +(acc/total*100).toFixed(2) }
  })
}
