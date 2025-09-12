"use client"
import { useEffect, useState } from "react"
import type React from "react"

import { useRouter, useParams } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getAuthHeaders } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { Save, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface PersonFormData {
  numero_documento: string
  tipo_documento: string
  primer_nombre: string
  segundo_nombre: string
  apellidos: string
  fecha_nacimiento: string
  genero: string
  correo_electronico: string
  celular: string
  foto?: File
  foto_url?: string
}

export default function EditarPersonaPage() {
  const [formData, setFormData] = useState<PersonFormData>({
    numero_documento: "",
    tipo_documento: "",
    primer_nombre: "",
    segundo_nombre: "",
    apellidos: "",
    fecha_nacimiento: "",
    genero: "",
    correo_electronico: "",
    celular: "",
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const personId = params.id as string

  const fetchPerson = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/personas/${personId}`, {
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        const data = await response.json()
        setFormData({
          numero_documento: data.numero_documento,
          tipo_documento: data.tipo_documento,
          primer_nombre: data.primer_nombre,
          segundo_nombre: data.segundo_nombre || "",
          apellidos: data.apellidos,
          fecha_nacimiento: data.fecha_nacimiento,
          genero: data.genero,
          correo_electronico: data.correo_electronico,
          celular: data.celular,
          foto_url: data.foto_url,
        })
      } else {
        throw new Error("Persona no encontrada")
      }
    } catch (err) {
      setError("Error al cargar los datos de la persona")
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, files } = e.target
    if (name === "foto" && files) {
      setFormData({ ...formData, foto: files[0] })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value })
  }

  const validateForm = (): boolean => {
    if (!formData.numero_documento || formData.numero_documento.length !== 10) {
      setError("El número de documento debe tener 10 caracteres")
      return false
    }
    if (!formData.tipo_documento) {
      setError("Debe seleccionar un tipo de documento")
      return false
    }
    if (!formData.primer_nombre || formData.primer_nombre.length > 30) {
      setError("El primer nombre es requerido y debe tener máximo 30 caracteres")
      return false
    }
    if (formData.segundo_nombre && formData.segundo_nombre.length > 30) {
      setError("El segundo nombre debe tener máximo 30 caracteres")
      return false
    }
    if (!formData.apellidos || formData.apellidos.length > 60) {
      setError("Los apellidos son requeridos y deben tener máximo 60 caracteres")
      return false
    }
    if (!formData.fecha_nacimiento) {
      setError("La fecha de nacimiento es requerida")
      return false
    }
    if (!formData.genero) {
      setError("Debe seleccionar un género")
      return false
    }
    if (!formData.correo_electronico || !/\S+@\S+\.\S+/.test(formData.correo_electronico)) {
      setError("Debe ingresar un correo electrónico válido")
      return false
    }
    if (!formData.celular || formData.celular.length !== 10) {
      setError("El celular debe tener 10 dígitos")
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSaving(true)
    setError("")

    try {
      const formDataToSend = new FormData()
      Object.entries(formData).forEach(([key, value]) => {
        if (key !== "foto_url" && value !== undefined && value !== "") {
          formDataToSend.append(key, value as string | File)
        }
      })

      const response = await fetch(`http://localhost:5000/api/personas/${personId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: formDataToSend,
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Persona actualizada exitosamente",
          description: `${formData.primer_nombre} ${formData.apellidos} ha sido actualizado`,
        })
        router.push("/personas")
      } else {
        setError(data.error || "Error al actualizar la persona")
      }
    } catch (err) {
      setError("Error de conexión al actualizar la persona")
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    if (personId) {
      fetchPerson()
    }
  }, [personId])

  if (isLoading) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </DashboardLayout>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/personas">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver
                  </Link>
                </Button>
              </div>
              <h1 className="text-3xl font-bold text-balance">Editar Persona</h1>
              <p className="text-muted-foreground text-pretty">
                Modifique los datos de {formData.primer_nombre} {formData.apellidos}
              </p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
              <CardDescription>Actualice los campos que desee modificar</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Current Photo */}
                {formData.foto_url && (
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={formData.foto_url || "/placeholder.svg"} alt="Foto actual" />
                      <AvatarFallback>
                        {formData.primer_nombre.charAt(0)}
                        {formData.apellidos.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Label className="text-sm font-medium">Foto Actual</Label>
                      <p className="text-sm text-muted-foreground">Seleccione una nueva foto para reemplazarla</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="numero_documento">
                      Número de Documento <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="numero_documento"
                      name="numero_documento"
                      placeholder="1234567890"
                      value={formData.numero_documento}
                      onChange={handleInputChange}
                      maxLength={10}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tipo_documento">
                      Tipo de Documento <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.tipo_documento}
                      onValueChange={(value) => handleSelectChange("tipo_documento", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cédula">Cédula</SelectItem>
                        <SelectItem value="Tarjeta de identidad">Tarjeta de identidad</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="primer_nombre">
                      Primer Nombre <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="primer_nombre"
                      name="primer_nombre"
                      placeholder="Juan"
                      value={formData.primer_nombre}
                      onChange={handleInputChange}
                      maxLength={30}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="segundo_nombre">Segundo Nombre</Label>
                    <Input
                      id="segundo_nombre"
                      name="segundo_nombre"
                      placeholder="Carlos"
                      value={formData.segundo_nombre}
                      onChange={handleInputChange}
                      maxLength={30}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="apellidos">
                      Apellidos <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="apellidos"
                      name="apellidos"
                      placeholder="Pérez González"
                      value={formData.apellidos}
                      onChange={handleInputChange}
                      maxLength={60}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fecha_nacimiento">
                      Fecha de Nacimiento <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="fecha_nacimiento"
                      name="fecha_nacimiento"
                      type="date"
                      value={formData.fecha_nacimiento}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="genero">
                      Género <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.genero} onValueChange={(value) => handleSelectChange("genero", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar género" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Masculino">Masculino</SelectItem>
                        <SelectItem value="Femenino">Femenino</SelectItem>
                        <SelectItem value="No binario">No binario</SelectItem>
                        <SelectItem value="Prefiero no reportar">Prefiero no reportar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="correo_electronico">
                      Correo Electrónico <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="correo_electronico"
                      name="correo_electronico"
                      type="email"
                      placeholder="juan@example.com"
                      value={formData.correo_electronico}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="celular">
                      Celular <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="celular"
                      name="celular"
                      placeholder="3001234567"
                      value={formData.celular}
                      onChange={handleInputChange}
                      maxLength={10}
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="foto">Nueva Foto (Opcional)</Label>
                    <Input id="foto" name="foto" type="file" accept="image/*" onChange={handleInputChange} />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Guardando...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Save className="h-4 w-4" />
                        Guardar Cambios
                      </div>
                    )}
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link href="/personas">Cancelar</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
