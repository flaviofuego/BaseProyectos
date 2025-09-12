"use client"
import { useState, useRef, useEffect } from "react"
import type React from "react"

import { AuthGuard } from "@/components/auth-guard"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getAuthHeaders } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { Send, MessageSquare, Bot, User, Lightbulb, RefreshCw, Copy, Download } from "lucide-react"

interface NLPResponse {
  query_natural: string
  query_sql: string
  resultados: Person[]
  total_resultados: number
  interpretacion: {
    filtros_detectados: string[]
    confianza: number
  }
}

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
  edad?: number
  grupo_edad?: string
}

interface ChatMessage {
  id: string
  type: "user" | "assistant"
  content: string
  timestamp: Date
  nlpResponse?: NLPResponse
  error?: string
}

export default function NLPPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Add welcome message
    const welcomeMessage: ChatMessage = {
      id: "welcome",
      type: "assistant",
      content:
        "¡Hola! Soy tu asistente de consultas inteligente. Puedes preguntarme sobre las personas registradas en el sistema usando lenguaje natural.",
      timestamp: new Date(),
    }
    setMessages([welcomeMessage])
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    try {
      const response = await fetch("http://localhost:5000/api/nlp/query", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: userMessage.content }),
      })

      const data = await response.json()

      if (response.ok) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: "assistant",
          content: `Encontré ${data.total_resultados} resultado${data.total_resultados !== 1 ? "s" : ""} para tu consulta.`,
          timestamp: new Date(),
          nlpResponse: data,
        }
        setMessages((prev) => [...prev, assistantMessage])
      } else {
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: "assistant",
          content: "Lo siento, no pude procesar tu consulta.",
          timestamp: new Date(),
          error: data.error || "Error desconocido",
        }
        setMessages((prev) => [...prev, errorMessage])
      }
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: "Hubo un error de conexión. Por favor, intenta nuevamente.",
        timestamp: new Date(),
        error: "Error de conexión",
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copiado",
      description: "El texto ha sido copiado al portapapeles",
    })
  }

  const exportResults = (results: Person[]) => {
    const csvContent = [
      "ID,Documento,Tipo,Nombre,Apellidos,Fecha Nacimiento,Género,Email,Celular",
      ...results.map((person) =>
        [
          person.id,
          person.numero_documento,
          person.tipo_documento,
          `${person.primer_nombre} ${person.segundo_nombre || ""}`.trim(),
          person.apellidos,
          person.fecha_nacimiento,
          person.genero,
          person.correo_electronico,
          person.celular,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `consulta_nlp_${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    toast({
      title: "Exportación exitosa",
      description: "Los resultados han sido exportados a CSV",
    })
  }

  const clearChat = () => {
    const welcomeMessage: ChatMessage = {
      id: "welcome-new",
      type: "assistant",
      content:
        "¡Hola! Soy tu asistente de consultas inteligente. Puedes preguntarme sobre las personas registradas en el sistema usando lenguaje natural.",
      timestamp: new Date(),
    }
    setMessages([welcomeMessage])
  }

  const suggestedQueries = [
    "Muéstrame todas las personas mayores de 30 años",
    "¿Cuántas mujeres hay registradas?",
    "Busca personas con cédula que vivan en Bogotá",
    "Encuentra personas nacidas en 1990",
    "Muestra los hombres menores de 25 años",
    "¿Cuántas personas hay por género?",
  ]

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

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-balance">Consultas Inteligentes</h1>
              <p className="text-muted-foreground text-pretty">
                Haz preguntas en lenguaje natural sobre las personas registradas
              </p>
            </div>
            <Button onClick={clearChat} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Nueva Conversación
            </Button>
          </div>

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Chat Area */}
            <div className="lg:col-span-3 flex flex-col">
              <Card className="flex-1 flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Conversación
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-0">
                  <ScrollArea className="flex-1 px-4">
                    <div className="space-y-4 pb-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex gap-3 ${message.type === "user" ? "justify-end" : "justify-start"}`}
                        >
                          {message.type === "assistant" && (
                            <Avatar className="h-8 w-8 mt-1">
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                <Bot className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              message.type === "user" ? "bg-primary text-primary-foreground ml-auto" : "bg-muted"
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs opacity-70 mt-1">{message.timestamp.toLocaleTimeString()}</p>

                            {/* NLP Response Details */}
                            {message.nlpResponse && (
                              <div className="mt-3 space-y-3">
                                {/* Query Analysis */}
                                <div className="bg-background/50 rounded p-2 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">
                                      Confianza: {Math.round(message.nlpResponse.interpretacion.confianza * 100)}%
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => copyToClipboard(message.nlpResponse!.query_sql)}
                                    >
                                      <Copy className="h-3 w-3 mr-1" />
                                      SQL
                                    </Button>
                                  </div>
                                  <div className="text-xs">
                                    <strong>Filtros detectados:</strong>{" "}
                                    {message.nlpResponse.interpretacion.filtros_detectados.join(", ")}
                                  </div>
                                </div>

                                {/* Results */}
                                {message.nlpResponse.resultados.length > 0 ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-medium">
                                        Resultados ({message.nlpResponse.total_resultados})
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => exportResults(message.nlpResponse!.resultados)}
                                      >
                                        <Download className="h-3 w-3 mr-1" />
                                        CSV
                                      </Button>
                                    </div>
                                    <div className="grid gap-2 max-h-60 overflow-y-auto">
                                      {message.nlpResponse.resultados.slice(0, 10).map((person) => (
                                        <div
                                          key={person.id}
                                          className="bg-background/70 rounded p-2 flex items-center gap-2"
                                        >
                                          <Avatar className="h-8 w-8">
                                            <AvatarImage
                                              src={person.foto_url || "/placeholder.svg"}
                                              alt={person.primer_nombre}
                                            />
                                            <AvatarFallback className="text-xs">
                                              {person.primer_nombre.charAt(0)}
                                              {person.apellidos.charAt(0)}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium truncate">
                                              {person.primer_nombre} {person.segundo_nombre} {person.apellidos}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                              {person.numero_documento} • {calculateAge(person.fecha_nacimiento)} años
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                      {message.nlpResponse.resultados.length > 10 && (
                                        <p className="text-xs text-muted-foreground text-center">
                                          Y {message.nlpResponse.resultados.length - 10} más...
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground">No se encontraron resultados</p>
                                )}
                              </div>
                            )}

                            {/* Error Details */}
                            {message.error && (
                              <Alert className="mt-3">
                                <AlertDescription className="text-xs">{message.error}</AlertDescription>
                              </Alert>
                            )}
                          </div>
                          {message.type === "user" && (
                            <Avatar className="h-8 w-8 mt-1">
                              <AvatarFallback className="bg-secondary">
                                <User className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex gap-3 justify-start">
                          <Avatar className="h-8 w-8 mt-1">
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              <Bot className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="bg-muted rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 bg-current rounded-full animate-bounce" />
                              <div className="h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:0.1s]" />
                              <div className="h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:0.2s]" />
                              <span className="text-sm ml-2">Procesando consulta...</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div ref={messagesEndRef} />
                  </ScrollArea>

                  {/* Input Area */}
                  <div className="border-t p-4">
                    <form onSubmit={handleSubmit} className="flex gap-2">
                      <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Escribe tu consulta en lenguaje natural..."
                        disabled={isLoading}
                        className="flex-1"
                      />
                      <Button type="submit" disabled={isLoading || !inputValue.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Suggested Queries */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lightbulb className="h-4 w-4" />
                    Consultas Sugeridas
                  </CardTitle>
                  <CardDescription className="text-sm">Haz clic en cualquier ejemplo para probarlo</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {suggestedQueries.map((query, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      className="w-full text-left justify-start h-auto p-2 text-wrap"
                      onClick={() => setInputValue(query)}
                      disabled={isLoading}
                    >
                      <span className="text-xs">{query}</span>
                    </Button>
                  ))}
                </CardContent>
              </Card>

              {/* Tips */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Consejos de Uso</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p>• Usa términos como "mayores de", "menores de", "entre X y Y años"</p>
                  <p>• Especifica género: "hombres", "mujeres", "masculino", "femenino"</p>
                  <p>• Menciona tipos de documento: "cédula", "tarjeta de identidad"</p>
                  <p>• Pregunta por cantidades: "¿cuántos?", "¿cuántas?"</p>
                  <p>• Usa fechas: "nacidos en 1990", "entre 1980 y 1995"</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
