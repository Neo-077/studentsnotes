
import { Router } from 'express'
import { listLogs } from '../controllers/logsController.js'
import { verifyAuth } from '../middleware/authMiddleware.js'
export const logsRouter = Router()

logsRouter.get('/', verifyAuth, listLogs)
