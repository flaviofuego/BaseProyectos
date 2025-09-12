"use client"
import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Settings, Database, Shield, Bell, Palette, Globe, Clock, HardDrive } from "lucide-react"

export default function ConfiguracionPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-balance">Configuración del Sistema</h1>
            <p className="text-muted-foreground text-pretty">
              Administre la configuración general del sistema de gestión de personas
            </p>
          </div>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Estado del Sistema
              </CardTitle>
              <CardDescription>Información general sobre el estado de los servicios</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">API Gateway</p>
                    <p className="text-xs text-muted-foreground">Puerto 5000</p>
                  </div>
                  <Badge variant="default">Activo</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Auth Service</p>
                    <p className="text-xs text-muted-foreground">Puerto 8001</p>
                  </div>
                  <Badge variant="default">Activo</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Personas Service</p>
                    <p className="text-xs text-muted-foreground">Puerto 8002</p>
                  </div>
                  <Badge variant="default">Activo</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">NLP Service</p>
                    <p className="text-xs text-muted-foreground">Puerto 8004</p>
                  </div>
                  <Badge variant="default">Activo</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuration Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Base de Datos
                </CardTitle>
                <CardDescription>Configuración de conexión y respaldos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Estado de Conexión</p>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full" />
                    <span className="text-sm text-green-600">Conectado</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Último Respaldo</p>
                  <p className="text-sm text-muted-foreground">{new Date().toLocaleString()}</p>
                </div>
                <Button variant="outline" size="sm" className="w-full bg-transparent">
                  Configurar Respaldos
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Seguridad
                </CardTitle>
                <CardDescription>Configuración de autenticación y permisos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Auth0 Integration</p>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full" />
                    <span className="text-sm text-green-600">Configurado</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Sesiones Activas</p>
                  <p className="text-sm text-muted-foreground">1 usuario conectado</p>
                </div>
                <Button variant="outline" size="sm" className="w-full bg-transparent">
                  Gestionar Permisos
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notificaciones
                </CardTitle>
                <CardDescription>Configuración de alertas y notificaciones</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Email Notifications</p>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-yellow-500 rounded-full" />
                    <span className="text-sm text-yellow-600">Pendiente</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Sistema de Logs</p>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full" />
                    <span className="text-sm text-green-600">Activo</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full bg-transparent">
                  Configurar Alertas
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Sistema
                </CardTitle>
                <CardDescription>Configuración general del sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Versión</p>
                  <p className="text-sm text-muted-foreground">v1.0.0</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Última Actualización</p>
                  <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString()}</p>
                </div>
                <Button variant="outline" size="sm" className="w-full bg-transparent">
                  Configuración Avanzada
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Additional Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Configuración Adicional</CardTitle>
              <CardDescription>Otras opciones de configuración del sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2 bg-transparent">
                  <Palette className="h-6 w-6" />
                  <span className="text-sm">Temas</span>
                </Button>
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2 bg-transparent">
                  <Globe className="h-6 w-6" />
                  <span className="text-sm">Idiomas</span>
                </Button>
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2 bg-transparent">
                  <Clock className="h-6 w-6" />
                  <span className="text-sm">Zona Horaria</span>
                </Button>
                <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2 bg-transparent">
                  <Database className="h-6 w-6" />
                  <span className="text-sm">Exportar Datos</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
