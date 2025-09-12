"use client"
import { useEffect, useState } from "react"
import type React from "react"

import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getAuthHeaders } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { Search, Filter, Download, Eye, Edit, Trash2, UserPlus, RefreshCw } from "lucide-react"
import Link from "next/link"

interface Person {
  id: number
  numero_documento: string
  tipo_documento: string
  primer_nombre: string
  segundo_nombre?: string
  apellidos: string
  fecha_nacimiento: string
  genero: string
  correo_electronico: string
  celular: string
  foto_url?: string
  created_at: string
  updated_at: string
}

interface SearchFilters {
  tipo_documento?: string
  genero?: string
  edad_min?: number
  edad_max?: number
  limit?: number
}

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Person[]>([])
  const [filteredPersonas, setFilteredPersonas] = useState<Person[]>([])
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState<SearchFilters>({
    tipo_documento: "",
    genero: "",
    edad_min: undefined,
    edad_max: undefined,
    limit: undefined,
  })
  const [showFilters, setShowFilters] = useState(false)
  const { toast } = useToast()

  const fetchPersonas = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("http://localhost:5000/api/personas/", {
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        const data = await response.json()
        setPersonas(data)
        setFilteredPersonas(data)
      } else {
        throw new Error("Error al cargar personas")
      }
    } catch (err) {
      setError("Error al cargar la lista de personas")
    } finally {
      setIsLoading(false)
    }
  }

  const searchPersonas = async () => {
    try {
      setIsSearching(true)
      const queryParams = new URLSearchParams()

      if (filters.tipo_documento) queryParams.append("tipo_documento", filters.tipo_documento)
      if (filters.genero) queryParams.append("genero", filters.genero)
      if (filters.edad_min) queryParams.append("edad_min", filters.edad_min.toString())
      if (filters.edad_max) queryParams.append("edad_max", filters.edad_max.toString())
      if (filters.limit) queryParams.append("limit", filters.limit.toString())

      const response = await fetch(`http://localhost:5000/api/consulta/search?${queryParams}`, {
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        const data = await response.json()
        setFilteredPersonas(data.personas || [])
        toast({
          title: "Búsqueda completada",
          description: `Se encontraron ${data.total || 0} resultados`,
        })
      } else {
        throw new Error("Error en la búsqueda")
      }
    } catch (err) {
      setError("Error al realizar la búsqueda")
    } finally {
      setIsSearching(false)
    }
  }

  const exportToExcel = async () => {
    try {
      const queryParams = new URLSearchParams()
      if (filters.tipo_documento) queryParams.append("tipo_documento", filters.tipo_documento)
      if (filters.genero) queryParams.append("genero", filters.genero)
      if (filters.edad_min) queryParams.append("edad_min", filters.edad_min.toString())
      if (filters.edad_max) queryParams.append("edad_max", filters.edad_max.toString())
      queryParams.append("format", "excel")

      const response = await fetch(`http://localhost:5000/api/consulta/export?${queryParams}`, {
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `personas_${new Date().toISOString().split("T")[0]}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        toast({
          title: "Exportación exitosa",
          description: "El archivo Excel ha sido descargado",
        })
      } else {
        throw new Error("Error al exportar")
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudo exportar el archivo",
        variant: "destructive",
      })
    }
  }

  const deletePerson = async (id: number) => {
    if (!confirm("¿Está seguro de que desea eliminar esta persona?")) return

    try {
      const response = await fetch(`http://localhost:5000/api/personas/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        toast({
          title: "Persona eliminada",
          description: "La persona ha sido eliminada exitosamente",
        })
        fetchPersonas()
      } else {
        throw new Error("Error al eliminar")
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la persona",
        variant: "destructive",
      })
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (Object.keys(filters).length > 0) {
      searchPersonas()
    } else {
      // Simple text search
      const filtered = personas.filter(
        (person) =>
          person.primer_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          person.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
          person.numero_documento.includes(searchTerm) ||
          person.correo_electronico.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredPersonas(filtered)
    }
  }

  const clearFilters = () => {
    setFilters({ tipo_documento: "", genero: "", edad_min: undefined, edad_max: undefined, limit: undefined })
    setSearchTerm("")
    setFilteredPersonas(personas)
    setShowFilters(false)
  }

  const calculateAge = (birthDate: string) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  useEffect(() => {
    fetchPersonas()
  }, [])

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-balance">Gestión de Personas</h1>
              <p className="text-muted-foreground text-pretty">
                Consulte, filtre y administre todas las personas registradas
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={fetchPersonas} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
              <Button asChild>
                <Link href="/personas/crear">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Crear Persona
                </Link>
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Búsqueda y Filtros</CardTitle>
              <CardDescription>Use los filtros para encontrar personas específicas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Buscar por nombre, apellido, documento o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={isSearching}>
                  <Search className="h-4 w-4 mr-2" />
                  {isSearching ? "Buscando..." : "Buscar"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowFilters(!showFilters)}>
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                </Button>
              </form>

              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/50">
                  <div className="space-y-2">
                    <Label>Tipo de Documento</Label>
                    <Select
                      value={filters.tipo_documento}
                      onValueChange={(value) => setFilters({ ...filters, tipo_documento: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos</SelectItem>
                        <SelectItem value="Cédula">Cédula</SelectItem>
                        <SelectItem value="Tarjeta de identidad">Tarjeta de identidad</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Género</Label>
                    <Select value={filters.genero} onValueChange={(value) => setFilters({ ...filters, genero: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos</SelectItem>
                        <SelectItem value="Masculino">Masculino</SelectItem>
                        <SelectItem value="Femenino">Femenino</SelectItem>
                        <SelectItem value="No binario">No binario</SelectItem>
                        <SelectItem value="Prefiero no reportar">Prefiero no reportar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Edad Mínima</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={filters.edad_min || ""}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          edad_min: e.target.value ? Number.parseInt(e.target.value) : undefined,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Edad Máxima</Label>
                    <Input
                      type="number"
                      placeholder="100"
                      value={filters.edad_max || ""}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          edad_max: e.target.value ? Number.parseInt(e.target.value) : undefined,
                        })
                      }
                    />
                  </div>

                  <div className="flex items-end gap-2 md:col-span-2 lg:col-span-4">
                    <Button onClick={searchPersonas} disabled={isSearching}>
                      Aplicar Filtros
                    </Button>
                    <Button variant="outline" onClick={clearFilters}>
                      Limpiar
                    </Button>
                    <Button variant="outline" onClick={exportToExcel}>
                      <Download className="h-4 w-4 mr-2" />
                      Exportar Excel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results */}
          <Card>
            <CardHeader>
              <CardTitle>Resultados ({filteredPersonas.length})</CardTitle>
              <CardDescription>Lista de personas que coinciden con los criterios de búsqueda</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : filteredPersonas.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPersonas.map((person) => (
                    <Card key={person.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={person.foto_url || "/placeholder.svg"} alt={person.primer_nombre} />
                            <AvatarFallback>
                              {person.primer_nombre.charAt(0)}
                              {person.apellidos.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">
                              {person.primer_nombre} {person.segundo_nombre} {person.apellidos}
                            </h3>
                            <p className="text-sm text-muted-foreground">{person.numero_documento}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline">{person.tipo_documento}</Badge>
                              <Badge variant="secondary">{calculateAge(person.fecha_nacimiento)} años</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{person.correo_electronico}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 mt-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedPerson(person)}
                            className="flex-1"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/personas/${person.id}/editar`}>
                              <Edit className="h-4 w-4 mr-1" />
                              Editar
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deletePerson(person.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No se encontraron personas con los criterios especificados</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Person Detail Modal */}
          <Dialog open={!!selectedPerson} onOpenChange={() => setSelectedPerson(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Detalles de la Persona</DialogTitle>
                <DialogDescription>Información completa del registro</DialogDescription>
              </DialogHeader>
              {selectedPerson && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage
                        src={selectedPerson.foto_url || "/placeholder.svg"}
                        alt={selectedPerson.primer_nombre}
                      />
                      <AvatarFallback className="text-lg">
                        {selectedPerson.primer_nombre.charAt(0)}
                        {selectedPerson.apellidos.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-semibold">
                        {selectedPerson.primer_nombre} {selectedPerson.segundo_nombre} {selectedPerson.apellidos}
                      </h3>
                      <p className="text-muted-foreground">{selectedPerson.correo_electronico}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Documento</Label>
                      <p className="text-sm">{selectedPerson.numero_documento}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Tipo</Label>
                      <p className="text-sm">{selectedPerson.tipo_documento}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Fecha de Nacimiento</Label>
                      <p className="text-sm">{new Date(selectedPerson.fecha_nacimiento).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Edad</Label>
                      <p className="text-sm">{calculateAge(selectedPerson.fecha_nacimiento)} años</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Género</Label>
                      <p className="text-sm">{selectedPerson.genero}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Celular</Label>
                      <p className="text-sm">{selectedPerson.celular}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Creado</Label>
                      <p className="text-sm">{new Date(selectedPerson.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Actualizado</Label>
                      <p className="text-sm">{new Date(selectedPerson.updated_at).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button asChild className="flex-1">
                      <Link href={`/personas/${selectedPerson.id}/editar`}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar Persona
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => deletePerson(selectedPerson.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
