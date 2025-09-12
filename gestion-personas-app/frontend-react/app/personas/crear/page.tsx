"use client"
import { useState } from "react"
import type React from "react"

import { useRouter } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getAuthHeaders } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { Save, Upload, UserPlus, FileJson, ArrowLeft } from "lucide-react"
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
}

export default function CrearPersonaPage() {
  const [activeTab, setActiveTab] = useState("individual")
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
  const [jsonData, setJsonData] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { toast } = useToast()

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

  const submitIndividualForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)
    setError("")

    try {
      const formDataToSend = new FormData()
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          formDataToSend.append(key, value as string | File)
        }
      })

      const response = await fetch("http://localhost:5000/api/personas/", {
        method: "POST",
        headers: getAuthHeaders(),
        body: formDataToSend,
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Persona creada exitosamente",
          description: `${formData.primer_nombre} ${formData.apellidos} ha sido registrado`,
        })
        router.push("/personas")
      } else {
        setError(data.error || "Error al crear la persona")
      }
    } catch (err) {
      setError("Error de conexión al crear la persona")
    } finally {
      setIsLoading(false)
    }
  }

  const submitBulkForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!jsonData.trim()) {
      setError("Debe ingresar los datos JSON")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const personas = JSON.parse(jsonData)
      if (!Array.isArray(personas)) {
        throw new Error("Los datos deben ser un array de objetos")
      }

      const results = []
      for (const persona of personas) {
        try {
          const formDataToSend = new FormData()
          Object.entries(persona).forEach(([key, value]) => {
            if (value !== undefined && value !== "") {
              formDataToSend.append(key, value as string)
            }
          })

          const response = await fetch("http://localhost:5000/api/personas/", {
            method: "POST",
            headers: getAuthHeaders(),
            body: formDataToSend,
          })

          const data = await response.json()
          results.push({ success: response.ok, data, persona })
        } catch (err) {
          results.push({ success: false, error: err, persona })
        }
      }

      const successful = results.filter((r) => r.success).length
      const failed = results.length - successful

      toast({
        title: "Creación masiva completada",
        description: `${successful} personas creadas exitosamente, ${failed} fallaron`,
      })

      if (successful > 0) {
        router.push("/personas")
      }
    } catch (err) {
      setError("Error al procesar los datos JSON. Verifique el formato.")
    } finally {
      setIsLoading(false)
    }
  }

  const jsonExample = `[
  {
    "numero_documento": "1234567890",
    "tipo_documento": "Cédula",
    "primer_nombre": "Juan",
    "segundo_nombre": "Carlos",
    "apellidos": "Pérez González",
    "fecha_nacimiento": "1990-01-15",
    "genero": "Masculino",
    "correo_electronico": "juan@example.com",
    "celular": "3001234567"
  },
  {
    "numero_documento": "0987654321",
    "tipo_documento": "Cédula",
    "primer_nombre": "María",
    "apellidos": "López Rodríguez",
    "fecha_nacimiento": "1985-05-20",
    "genero": "Femenino",
    "correo_electronico": "maria@example.com",
    "celular": "3009876543"
  }
]`

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
              <h1 className="text-3xl font-bold text-balance">Crear Persona</h1>
              <p className="text-muted-foreground text-pretty">
                Registre una nueva persona individual o múltiples personas usando JSON
              </p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="individual">
                <UserPlus className="h-4 w-4 mr-2" />
                Persona Individual
              </TabsTrigger>
              <TabsTrigger value="bulk">
                <FileJson className="h-4 w-4 mr-2" />
                Creación Masiva (JSON)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="individual">
              <Card>
                <CardHeader>
                  <CardTitle>Formulario Individual</CardTitle>
                  <CardDescription>Complete todos los campos requeridos para crear una nueva persona</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={submitIndividualForm} className="space-y-6">
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
                        <Label htmlFor="foto">Foto (Opcional)</Label>
                        <Input id="foto" name="foto" type="file" accept="image/*" onChange={handleInputChange} />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Creando...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Save className="h-4 w-4" />
                            Crear Persona
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
            </TabsContent>

            <TabsContent value="bulk">
              <Card>
                <CardHeader>
                  <CardTitle>Creación Masiva con JSON</CardTitle>
                  <CardDescription>
                    Ingrese un array JSON con múltiples personas para crear varios registros a la vez
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={submitBulkForm} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="jsonData">Datos JSON</Label>
                      <Textarea
                        id="jsonData"
                        placeholder="Ingrese el array JSON con las personas..."
                        value={jsonData}
                        onChange={(e) => setJsonData(e.target.value)}
                        rows={15}
                        className="font-mono text-sm"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Procesando...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Upload className="h-4 w-4" />
                            Crear Personas
                          </div>
                        )}
                      </Button>
                      <Button type="button" variant="outline" asChild>
                        <Link href="/personas">Cancelar</Link>
                      </Button>
                    </div>
                  </form>

                  <div className="mt-6">
                    <Label className="text-sm font-medium">Ejemplo de formato JSON:</Label>
                    <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-x-auto">{jsonExample}</pre>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
