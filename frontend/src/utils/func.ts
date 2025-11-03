export const getUserIdFromLocalStorage = () => {
  const sessionStr = localStorage.getItem('sb-tlijmmcrmqorqsprslpi-auth-token')
  if (!sessionStr) return null

  try {
    const session = JSON.parse(sessionStr)
    return session.user?.id || null
  } catch (error) {
    console.error('Error al parsear la sesión:', error)
    return null
  }
}