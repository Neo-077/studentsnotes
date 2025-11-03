
import { Router } from 'express'
import { exportCSV, exportExcel, exportPDF } from '../controllers/exportController.js'
import { verifyAuth } from '../middleware/authMiddleware.js'
export const exportRouter = Router()

exportRouter.get('/csv', verifyAuth, exportCSV)
exportRouter.get('/excel', verifyAuth, exportExcel)
exportRouter.get('/pdf', verifyAuth, exportPDF)
