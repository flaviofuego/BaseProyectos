"use client"
import { useEffect, useState } from "react"
import type React from "react"

import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { getStoredUser } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { Save, User, Settings, Shield, Eye, EyeOff, Calendar } from "lucide-react"

interface UserProfile {
  id: number
  username: string
  email: string
  created_at?: string
  last_login?: string
}

interface PasswordChangeData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export default function PerfilPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null)
  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const { toast } = useToast()

  const user = getStoredUser()

  useEffect(() => {
    // For now, we'll use the stored user data
    // In a real implementation, you might fetch additional profile data from the API
    if (user) {
      const userProfile: UserProfile = {
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: new Date().toISOString(), // Mock data
        last_login: new Date().toISOString(), // Mock data
      }
      setProfile(userProfile)
      setEditedProfile(userProfile)
    }
    setIsLoading(false)
  }, [user])

  const handleProfileChange = (field: keyof UserProfile, value: string) => {
    if (editedProfile) {
      setEditedProfile({
        ...editedProfile,
        [field]: value,
      })
    }
  }

  const handlePasswordChange = (field: keyof PasswordChangeData, value: string) => {
    setPasswordData({
      ...passwordData,
      [field]: value,
    })
  }

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords({
      ...showPasswords,
      [field]: !showPasswords[field],
    })
  }

  const validateProfileForm = (): boolean => {
    if (!editedProfile?.username || editedProfile.username.length < 3) {
      setError("El nombre de usuario debe tener al menos 3 caracteres")
      return false
    }
    if (!editedProfile?.email || !/\S+@\S+\.\S+/.test(editedProfile.email)) {
      setError("Debe ingresar un correo electrónico válido")
      return false
    }
    return true
  }

  const validatePasswordForm = (): boolean => {
    if (!passwordData.currentPassword) {
      setError("Debe ingresar su contraseña actual")
      return false
    }
    if (!passwordData.newPassword || passwordData.newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres")
      return false
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("Las contraseñas no coinciden")
      return false
    }
    return true
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateProfileForm()) return

    setIsSaving(true)
    setError("")

    try {
      // Mock API call - in real implementation, this would update the user profile
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Update local storage
      if (editedProfile) {
        localStorage.setItem("user", JSON.stringify(editedProfile))
        setProfile(editedProfile)
      }

      toast({
        title: "Perfil actualizado",
        description: "Su información personal ha sido actualizada exitosamente",
      })
    } catch (err) {
      setError("Error al actualizar el perfil")
    } finally {
      setIsSaving(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validatePasswordForm()) return

    setIsSaving(true)
    setError("")

    try {
      // Mock API call - in real implementation, this would change the password
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })

      toast({
        title: "Contraseña actualizada",
        description: "Su contraseña ha sido cambiada exitosamente",
      })
    } catch (err) {
      setError("Error al cambiar la contraseña")
    } finally {
      setIsSaving(false)
    }
  }

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

  if (!profile) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <Alert variant="destructive">
            <AlertDescription>No se pudo cargar la información del perfil</AlertDescription>
          </Alert>
        </DashboardLayout>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-balance">Mi Perfil</h1>
            <p className="text-muted-foreground text-pretty">
              Gestione su información personal y configuración de cuenta
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Profile Overview */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {profile.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h2 className="text-2xl font-semibold">{profile.username}</h2>
                  <p className="text-muted-foreground">{profile.email}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Miembro desde {new Date(profile.created_at || "").toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      <span>ID: {profile.id}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="profile" className="space-y-4">
            <TabsList>
              <TabsTrigger value="profile">
                <User className="h-4 w-4 mr-2" />
                Información Personal
              </TabsTrigger>
              <TabsTrigger value="security">
                <Shield className="h-4 w-4 mr-2" />
                Seguridad
              </TabsTrigger>
              <TabsTrigger value="preferences">
                <Settings className="h-4 w-4 mr-2" />
                Preferencias
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Información Personal</CardTitle>
                  <CardDescription>Actualice su información básica de perfil</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">
                          Nombre de Usuario <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="username"
                          value={editedProfile?.username || ""}
                          onChange={(e) => handleProfileChange("username", e.target.value)}
                          placeholder="Ingrese su nombre de usuario"
                          required
                          minLength={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">
                          Correo Electrónico <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={editedProfile?.email || ""}
                          onChange={(e) => handleProfileChange("email", e.target.value)}
                          placeholder="Ingrese su correo electrónico"
                          required
                        />
                      </div>
                    </div>

                    <Separator />

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
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEditedProfile(profile)}
                        disabled={isSaving}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Cambiar Contraseña</CardTitle>
                    <CardDescription>Actualice su contraseña para mantener su cuenta segura</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">
                          Contraseña Actual <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="currentPassword"
                            type={showPasswords.current ? "text" : "password"}
                            value={passwordData.currentPassword}
                            onChange={(e) => handlePasswordChange("currentPassword", e.target.value)}
                            placeholder="Ingrese su contraseña actual"
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => togglePasswordVisibility("current")}
                          >
                            {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="newPassword">
                          Nueva Contraseña <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showPasswords.new ? "text" : "password"}
                            value={passwordData.newPassword}
                            onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
                            placeholder="Ingrese su nueva contraseña"
                            required
                            minLength={6}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => togglePasswordVisibility("new")}
                          >
                            {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">
                          Confirmar Nueva Contraseña <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showPasswords.confirm ? "text" : "password"}
                            value={passwordData.confirmPassword}
                            onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
                            placeholder="Confirme su nueva contraseña"
                            required
                            minLength={6}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => togglePasswordVisibility("confirm")}
                          >
                            {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <Separator />

                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? (
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Cambiando...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Cambiar Contraseña
                          </div>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Información de Seguridad</CardTitle>
                    <CardDescription>Detalles sobre la seguridad de su cuenta</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Último Inicio de Sesión</Label>
                        <p className="text-sm text-muted-foreground">
                          {profile.last_login ? new Date(profile.last_login).toLocaleString() : "No disponible"}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Estado de la Cuenta</Label>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 bg-green-500 rounded-full" />
                          <span className="text-sm text-green-600">Activa</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences">
              <Card>
                <CardHeader>
                  <CardTitle>Preferencias del Sistema</CardTitle>
                  <CardDescription>Configure sus preferencias de uso del sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Notificaciones por Email</Label>
                        <p className="text-sm text-muted-foreground">
                          Recibir notificaciones sobre actividades importantes
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Configurar
                      </Button>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Tema de la Interfaz</Label>
                        <p className="text-sm text-muted-foreground">Personalizar la apariencia del sistema</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Cambiar Tema
                      </Button>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Idioma</Label>
                        <p className="text-sm text-muted-foreground">Configurar el idioma de la interfaz</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Español (ES)
                      </Button>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Zona Horaria</Label>
                        <p className="text-sm text-muted-foreground">Configurar la zona horaria para fechas y horas</p>
                      </div>
                      <Button variant="outline" size="sm">
                        UTC-5 (Bogotá)
                      </Button>
                    </div>
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
