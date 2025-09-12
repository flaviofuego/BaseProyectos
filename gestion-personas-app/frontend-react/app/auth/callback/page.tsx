"use client"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle, XCircle, Users } from "lucide-react"

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  useEffect(() => {
    const token = searchParams.get("token")

    if (!token) {
      setStatus("error")
      setMessage("No se recibió el token de autenticación")
      return
    }

    const verifyToken = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/auth/verify-token", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        const data = await response.json()

        if (response.ok && data.valid) {
          localStorage.setItem("token", token)
          localStorage.setItem("user", JSON.stringify(data.user))

          setStatus("success")
          setMessage(`Bienvenido, ${data.user.username}`)

          toast({
            title: "Autenticación exitosa",
            description: "Ha iniciado sesión correctamente con Auth0",
          })

          setTimeout(() => {
            router.push("/dashboard")
          }, 2000)
        } else {
          setStatus("error")
          setMessage(data.error || "Token inválido")
        }
      } catch (err) {
        setStatus("error")
        setMessage("Error de conexión al verificar el token")
      }
    }

    verifyToken()
  }, [searchParams, router, toast])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-primary rounded-full p-3">
              <Users className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-balance">
            {status === "loading" && "Verificando autenticación..."}
            {status === "success" && "¡Autenticación exitosa!"}
            {status === "error" && "Error de autenticación"}
          </CardTitle>
          <CardDescription className="text-pretty">
            {status === "loading" && "Por favor espere mientras verificamos sus credenciales"}
            {status === "success" && "Será redirigido al dashboard en unos momentos"}
            {status === "error" && "Hubo un problema con la autenticación"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {status === "loading" && (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}

          {status === "success" && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {status === "error" && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
