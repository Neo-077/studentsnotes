import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import useAuth from '../store/useAuth'
import { useNavigate } from 'react-router-dom'

const schema = z.object({ email: z.string().email(), password: z.string().min(6) })

export default function Login(){
  const { register, handleSubmit, formState:{errors} } = useForm({ resolver: zodResolver(schema) })
  const { login } = useAuth()
  const nav = useNavigate()

  const onSubmit = async (values:any)=>{
    const ok = await login(values.email, values.password)
    if(ok) nav('/dashboard')
  }
  return (
    <div className="h-screen grid place-items-center bg-gray-100">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white border rounded-2xl shadow p-6 w-[360px] space-y-3">
        <h2 className="text-xl font-semibold">Iniciar sesión (Maestro)</h2>
        <input placeholder="Email" className="w-full border rounded-xl px-3 py-2" {...register('email')}/>
        {errors.email && <p className="text-red-600 text-sm">Email inválido</p>}
        <input type="password" placeholder="Password" className="w-full border rounded-xl px-3 py-2" {...register('password')}/>
        {errors.password && <p className="text-red-600 text-sm">Mínimo 6 caracteres</p>}
        <button className="w-full bg-blue-600 text-white rounded-xl py-2">Entrar</button>
      </form>
    </div>
  )
}
