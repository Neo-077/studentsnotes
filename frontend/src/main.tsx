<<<<<<< HEAD

import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './styles/index.css'
import App from './App'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import ParetoChart from './pages/ParetoChart'
import ScatterChartPage from './pages/ScatterChart'
import ControlChart from './pages/ControlChart'
import PieChartPage from './pages/PieChart'
import { SessionProvider } from './lib/supabase'
const router = createBrowserRouter([{ path:'/', element:<Landing/> }, { path:'/app', element:<App/>, children:[{ index:true, element:<Dashboard/> }, { path:'students', element:<Students/> }, { path:'pareto', element:<ParetoChart/> }, { path:'dispersion', element:<ScatterChartPage/> }, { path:'control', element:<ControlChart/> }, { path:'pastel', element:<PieChartPage/> }]}])
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><SessionProvider><RouterProvider router={router} /></SessionProvider></React.StrictMode>)
=======
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/globals.css'
import useAuth from './store/useAuth'

// Inicializa auth una sola vez
useAuth.getState().init()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
>>>>>>> d2eb161 (Proyecto StudentsNotes: frontend y backend iniciales)
