"use client"
import { useEffect, useState } from "react"

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
import { getAuthHeaders } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { Filter, RefreshCw, Eye, Calendar, User, Activity, ChevronLeft, ChevronRight } from "lucide-react"

interface LogEntry {
  id: number
  transaction_type: string
  entity_type: string
  entity_id?: number
  numero_documento?: string
  user_id: number
  ip_address: string
  user_agent: string
  request_data: Record<string, any>
  response_data: Record<string, any>
  status: string
  error_message?: string
  created_at: string
}

interface LogsResponse {
  logs: LogEntry[]
  total: number
  pagina_actual: number
  total_paginas: number
}

interface LogFilters {
  user_id?: number
  transaction_type?: string
  entity_type?: string
  status?: string
  fecha_inicio?: string
  fecha_fin?: string
  limit: number
  offset: number
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [filters, setFilters] = useState<LogFilters>({
    limit: 20,
    offset: 0,
  })
  const [pagination, setPagination] = useState({
    total: 0,
    currentPage: 1,
    totalPages: 1,
  })
  const [showFilters, setShowFilters] = useState(false)
  const { toast } = useToast()

  const fetchLogs = async () => {
    try {
      setIsLoading(true)
      const queryParams = new URLSearchParams()

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          queryParams.append(key, value.toString())
        }
      })

      const response = await fetch(`http://localhost:5000/api/logs/?${queryParams}`, {
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        const data: LogsResponse = await response.json()
        setLogs(data.logs)
        setPagination({
          total: data.total,
          currentPage: data.pagina_actual,
          totalPages: data.total_paginas,
        })
      } else {
        throw new Error("Error al cargar logs")
      }
    } catch (err) {
      setError("Error al cargar los logs del sistema")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFilterChange = (key: keyof LogFilters, value: string | number) => {
    setFilters({
      ...filters,
      [key]: value === "" ? undefined : value,
      offset: 0, // Reset to first page when filtering
    })
  }

  const handlePageChange = (newPage: number) => {
    const newOffset = (newPage - 1) * filters.limit
    setFilters({
      ...filters,
      offset: newOffset,
    })
  }

  const clearFilters = () => {
    setFilters({
      limit: 20,
      offset: 0,
    })
    setShowFilters(false)
  }

  const getStatusColor = (status: string) => {
    return status === "SUCCESS" ? "default" : "destructive"
  }

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      CREATE: "Crear",
      UPDATE: "Actualizar",
      DELETE: "Eliminar",
      QUERY: "Consultar",
      NLP_QUERY: "Consulta NLP",
      LOGIN: "Iniciar Sesión",
      LOGOUT: "Cerrar Sesión",
    }
    return labels[type] || type
  }

  const getEntityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      PERSONA: "Persona",
      USER: "Usuario",
      SYSTEM: "Sistema",
    }
    return labels[type] || type
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const formatJsonData = (data: Record<string, any>) => {
    return JSON.stringify(data, null, 2)
  }

  useEffect(() => {
    fetchLogs()
  }, [filters])

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-balance">Logs del Sistema</h1>
              <p className="text-muted-foreground text-pretty">
                Auditoría completa de todas las transacciones y actividades del sistema
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={fetchLogs} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Filters */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Filtros de Búsqueda</CardTitle>
                  <CardDescription>
                    Filtre los logs por diferentes criterios para encontrar información específica
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                  <Filter className="h-4 w-4 mr-2" />
                  {showFilters ? "Ocultar" : "Mostrar"} Filtros
                </Button>
              </div>
            </CardHeader>
            {showFilters && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Transacción</Label>
                    <Select
                      value={filters.transaction_type || "ALL"}
                      onValueChange={(value) => handleFilterChange("transaction_type", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los tipos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Todos los tipos</SelectItem>
                        <SelectItem value="CREATE">Crear</SelectItem>
                        <SelectItem value="UPDATE">Actualizar</SelectItem>
                        <SelectItem value="DELETE">Eliminar</SelectItem>
                        <SelectItem value="QUERY">Consultar</SelectItem>
                        <SelectItem value="NLP_QUERY">Consulta NLP</SelectItem>
                        <SelectItem value="LOGIN">Iniciar Sesión</SelectItem>
                        <SelectItem value="LOGOUT">Cerrar Sesión</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Entidad</Label>
                    <Select
                      value={filters.entity_type || "ALL"}
                      onValueChange={(value) => handleFilterChange("entity_type", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todas las entidades" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Todas las entidades</SelectItem>
                        <SelectItem value="PERSONA">Persona</SelectItem>
                        <SelectItem value="USER">Usuario</SelectItem>
                        <SelectItem value="SYSTEM">Sistema</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select
                      value={filters.status || "ALL"}
                      onValueChange={(value) => handleFilterChange("status", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los estados" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Todos los estados</SelectItem>
                        <SelectItem value="SUCCESS">Exitoso</SelectItem>
                        <SelectItem value="ERROR">Error</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>ID de Usuario</Label>
                    <Input
                      type="number"
                      placeholder="ID del usuario"
                      value={filters.user_id || ""}
                      onChange={(e) =>
                        handleFilterChange("user_id", e.target.value ? Number.parseInt(e.target.value) : "")
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Fecha Inicio</Label>
                    <Input
                      type="datetime-local"
                      value={filters.fecha_inicio || ""}
                      onChange={(e) => handleFilterChange("fecha_inicio", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Fecha Fin</Label>
                    <Input
                      type="datetime-local"
                      value={filters.fecha_fin || ""}
                      onChange={(e) => handleFilterChange("fecha_fin", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Registros por página</Label>
                    <Select
                      value={filters.limit.toString()}
                      onValueChange={(value) => handleFilterChange("limit", Number.parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={clearFilters} variant="outline">
                    Limpiar Filtros
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Results */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Registros de Auditoría</CardTitle>
                  <CardDescription>
                    Mostrando {logs.length} de {pagination.total} registros (Página {pagination.currentPage} de{" "}
                    {pagination.totalPages})
                  </CardDescription>
                </div>
                {/* Pagination Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {pagination.currentPage} / {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage >= pagination.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : logs.length > 0 ? (
                <div className="space-y-4">
                  {logs.map((log) => (
                    <Card key={log.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant={getStatusColor(log.status)}>{log.status}</Badge>
                              <Badge variant="outline">{getTransactionTypeLabel(log.transaction_type)}</Badge>
                              <Badge variant="secondary">{getEntityTypeLabel(log.entity_type)}</Badge>
                              {log.numero_documento && <Badge variant="outline">Doc: {log.numero_documento}</Badge>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">Fecha:</span>
                                <span>{formatDate(log.created_at)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">Usuario:</span>
                                <span>{log.user_id}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Activity className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">IP:</span>
                                <span>{log.ip_address}</span>
                              </div>
                              {log.entity_id && (
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground">ID Entidad:</span>
                                  <span>{log.entity_id}</span>
                                </div>
                              )}
                            </div>

                            {log.error_message && (
                              <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded">
                                <strong>Error:</strong> {log.error_message}
                              </div>
                            )}
                          </div>

                          <Button variant="outline" size="sm" onClick={() => setSelectedLog(log)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Ver Detalles
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No se encontraron logs con los criterios especificados</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination Footer */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" onClick={() => handlePageChange(1)} disabled={pagination.currentPage <= 1}>
                Primera
              </Button>
              <Button
                variant="outline"
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <span className="px-4 py-2 text-sm">
                Página {pagination.currentPage} de {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage >= pagination.totalPages}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              <Button
                variant="outline"
                onClick={() => handlePageChange(pagination.totalPages)}
                disabled={pagination.currentPage >= pagination.totalPages}
              >
                Última
              </Button>
            </div>
          )}

          {/* Log Detail Modal */}
          <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Detalles del Log #{selectedLog?.id}</DialogTitle>
                <DialogDescription>Información completa de la transacción</DialogDescription>
              </DialogHeader>
              {selectedLog && (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">ID del Log</Label>
                      <p className="text-sm">{selectedLog.id}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Fecha y Hora</Label>
                      <p className="text-sm">{formatDate(selectedLog.created_at)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Tipo de Transacción</Label>
                      <p className="text-sm">{getTransactionTypeLabel(selectedLog.transaction_type)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Tipo de Entidad</Label>
                      <p className="text-sm">{getEntityTypeLabel(selectedLog.entity_type)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Estado</Label>
                      <Badge variant={getStatusColor(selectedLog.status)}>{selectedLog.status}</Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">ID de Usuario</Label>
                      <p className="text-sm">{selectedLog.user_id}</p>
                    </div>
                    {selectedLog.entity_id && (
                      <div>
                        <Label className="text-sm font-medium">ID de Entidad</Label>
                        <p className="text-sm">{selectedLog.entity_id}</p>
                      </div>
                    )}
                    {selectedLog.numero_documento && (
                      <div>
                        <Label className="text-sm font-medium">Número de Documento</Label>
                        <p className="text-sm">{selectedLog.numero_documento}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-sm font-medium">Dirección IP</Label>
                      <p className="text-sm">{selectedLog.ip_address}</p>
                    </div>
                  </div>

                  {/* User Agent */}
                  <div>
                    <Label className="text-sm font-medium">User Agent</Label>
                    <p className="text-sm bg-muted p-2 rounded text-wrap break-all">{selectedLog.user_agent}</p>
                  </div>

                  {/* Error Message */}
                  {selectedLog.error_message && (
                    <div>
                      <Label className="text-sm font-medium text-red-600">Mensaje de Error</Label>
                      <p className="text-sm bg-red-50 dark:bg-red-950/20 p-2 rounded text-red-600">
                        {selectedLog.error_message}
                      </p>
                    </div>
                  )}

                  {/* Request Data */}
                  <div>
                    <Label className="text-sm font-medium">Datos de la Petición</Label>
                    <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                      {formatJsonData(selectedLog.request_data)}
                    </pre>
                  </div>

                  {/* Response Data */}
                  <div>
                    <Label className="text-sm font-medium">Datos de la Respuesta</Label>
                    <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                      {formatJsonData(selectedLog.response_data)}
                    </pre>
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
