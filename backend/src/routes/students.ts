
import { Router } from 'express'
import { listStudents, createStudent, updateStudent, deleteStudent } from '../controllers/studentsController.js'
import { verifyAuth } from '../middleware/authMiddleware.js'
export const studentsRouter = Router()

studentsRouter.get('/', verifyAuth, listStudents)
studentsRouter.post('/', verifyAuth, createStudent)
studentsRouter.put('/:id', verifyAuth, updateStudent)
studentsRouter.delete('/:id', verifyAuth, deleteStudent)
