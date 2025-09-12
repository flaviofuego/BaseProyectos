"use client"
import { useEffect, useState } from "react"
import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getAuthHeaders } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { Users, UserPlus, FileText, Search, RefreshCw, TrendingUp, Activity } from "lucide-react"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import Link from "next/link"

interface PersonStats {
  total_personas: number
  por_genero: {
    Masculino: number
    Femenino: number
    "No binario": number
    "Prefiero no reportar": number
  }
  por_tipo_documento: {
    Cédula: number
    "Tarjeta de identidad": number
  }
  por_grupo_edad: {
    "Menor de edad": number
    Adulto: number
    "Adulto mayor": number
  }
}

interface RecentLog {
  id: number
  transaction_type: string
  entity_type: string
  user_id: number
  status: string
  created_at: string
}

const COLORS = ["#3b82f6", "#06b6d4", "#8b5cf6", "#f59e0b"]

export default function DashboardPage() {
  const [stats, setStats] = useState<PersonStats | null>(null)
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const { toast } = useToast()

  const fetchStats = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/personas/stats", {
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data)
        setLastUpdate(new Date())
      } else {
        throw new Error("Error al cargar estadísticas")
      }
    } catch (err) {
      setError("Error al cargar las estadísticas del dashboard")
    }
  }

  const fetchRecentLogs = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/logs/?limit=5", {
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        const data = await response.json()
        setRecentLogs(data.logs || [])
      }
    } catch (err) {
      console.error("Error al cargar logs recientes:", err)
    }
  }

  const refreshData = async () => {
    setIsLoading(true)
    await Promise.all([fetchStats(), fetchRecentLogs()])
    setIsLoading(false)
    toast({
      title: "Datos actualizados",
      description: "La información del dashboard ha sido actualizada",
    })
  }

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([fetchStats(), fetchRecentLogs()])
      setIsLoading(false)
    }

    loadData()

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchStats()
      fetchRecentLogs()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const genderData = stats
    ? Object.entries(stats.por_genero).map(([key, value]) => ({
        name: key,
        value,
      }))
    : []

  const ageGroupData = stats
    ? Object.entries(stats.por_grupo_edad).map(([key, value]) => ({
        name: key,
        value,
      }))
    : []

  const documentTypeData = stats
    ? Object.entries(stats.por_tipo_documento).map(([key, value]) => ({
        name: key,
        value,
      }))
    : []

  const getStatusColor = (status: string) => {
    return status === "SUCCESS" ? "bg-green-500" : "bg-red-500"
  }

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      CREATE: "Crear",
      UPDATE: "Actualizar",
      DELETE: "Eliminar",
      QUERY: "Consultar",
      NLP_QUERY: "Consulta NLP",
    }
    return labels[type] || type
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-balance">Dashboard Principal</h1>
              <p className="text-muted-foreground text-pretty">Resumen general del sistema de gestión de personas</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Última actualización: {lastUpdate.toLocaleTimeString()}
              </Badge>
              <Button onClick={refreshData} disabled={isLoading} size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Actualizar
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/personas/crear">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center p-6">
                  <UserPlus className="h-8 w-8 text-primary mr-4" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Acción Rápida</p>
                    <p className="text-lg font-semibold">Crear Persona</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/personas">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center p-6">
                  <Search className="h-8 w-8 text-primary mr-4" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Acción Rápida</p>
                    <p className="text-lg font-semibold">Consultar Personas</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/logs">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center p-6">
                  <FileText className="h-8 w-8 text-primary mr-4" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Acción Rápida</p>
                    <p className="text-lg font-semibold">Ver Logs</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/nlp">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center p-6">
                  <Activity className="h-8 w-8 text-primary mr-4" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Acción Rápida</p>
                    <p className="text-lg font-semibold">Consulta NLP</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Personas</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_personas || 0}</div>
                <p className="text-xs text-muted-foreground">Registros en el sistema</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Adultos</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.por_grupo_edad?.Adulto || 0}</div>
                <p className="text-xs text-muted-foreground">Personas adultas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cédulas</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.por_tipo_documento?.Cédula || 0}</div>
                <p className="text-xs text-muted-foreground">Documentos tipo cédula</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Actividad Reciente</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{recentLogs.length}</div>
                <p className="text-xs text-muted-foreground">Transacciones recientes</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Género</CardTitle>
                <CardDescription>Porcentaje de personas por género</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={genderData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {genderData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Grupos de Edad</CardTitle>
                <CardDescription>Distribución por rangos de edad</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ageGroupData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
              <CardDescription>Últimas transacciones en el sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentLogs.length > 0 ? (
                  recentLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(log.status)}`} />
                        <div>
                          <p className="font-medium">{getTransactionTypeLabel(log.transaction_type)}</p>
                          <p className="text-sm text-muted-foreground">
                            {log.entity_type} - {new Date(log.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant={log.status === "SUCCESS" ? "default" : "destructive"}>{log.status}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">No hay actividad reciente</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
