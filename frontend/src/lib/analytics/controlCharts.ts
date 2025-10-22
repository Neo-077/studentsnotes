export function xbarR(samples: number[][]){
  const means = samples.map(s=> s.reduce((a,b)=>a+b,0)/s.length)
  const ranges = samples.map(s=> Math.max(...s)-Math.min(...s))
  const center = means.reduce((a,b)=>a+b,0)/means.length
  const Rbar = ranges.reduce((a,b)=>a+b,0)/ranges.length
  // Constantes aproximadas para n=5
  const A2 = 0.577
  const d2 = 2.326
  const ucl = center + A2 * Rbar
  const lcl = center - A2 * Rbar
  return { center, ucl, lcl, points: means.map((m,i)=> ({ i:i+1, xbar:m })) }
}
export function pChart(ps: number[]){
  const pbar = ps.reduce((a,b)=>a+b,0)/ps.length
  const n = 100 // asunción
  const sigma = Math.sqrt(pbar*(1-pbar)/n)
  return {
    center: pbar, ucl: pbar + 3*sigma, lcl: Math.max(0, pbar - 3*sigma)
  }
}
