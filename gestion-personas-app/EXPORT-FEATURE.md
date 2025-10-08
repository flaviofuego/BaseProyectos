# Funcionalidad de Exportación de Personas

## 📊 Descripción General

Se ha implementado la funcionalidad de **exportar personas a CSV y Excel** desde la página de consulta. La exportación respeta los mismos filtros de búsqueda aplicados en la consulta.

---

## ✨ Características Implementadas

### **1. Formatos de Exportación**

| Formato | Extensión | Descripción |
|---------|-----------|-------------|
| **CSV** | `.csv` | Archivo de texto separado por comas con UTF-8 BOM |
| **Excel** | `.xlsx` | Libro de Excel con formato automático |

### **2. Compatibilidad de Columnas**

El formato del CSV exportado es **idéntico al formato de la plantilla de carga masiva**, permitiendo:
- ✅ Exportar datos de la consulta
- ✅ Modificar el archivo exportado
- ✅ Re-importar usando la función de carga masiva

**Columnas incluidas:**
```
numero_documento
tipo_documento
primer_nombre
segundo_nombre
apellidos
fecha_nacimiento
genero
correo_electronico
celular
```

**Nota:** La columna `foto_url` NO se incluye (al igual que en la carga masiva).

### **3. Respeto de Filtros de Búsqueda**

La exportación aplica los mismos criterios de búsqueda:

| Tipo de Búsqueda | Comportamiento |
|------------------|----------------|
| **Búsqueda Individual** | Exporta solo la persona encontrada |
| **Búsqueda Avanzada** | Exporta todas las personas que coincidan con los filtros |
| **Sin filtros** | Exporta hasta 1000 registros |

**Filtros soportados:**
- Tipo de documento
- Género
- Edad mínima
- Edad máxima

---

## 🎯 Interfaz de Usuario

### **Ubicación de los Botones**

Los botones de exportación aparecen en el **encabezado de la tabla de resultados**:

```
┌─────────────────────────────────────────────────────┐
│  📋 Resultados [5]        [ CSV ] [ Excel ]  ← Aquí│
├─────────────────────────────────────────────────────┤
│                                                      │
│  [Tabla con los resultados]                         │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### **Estilos de los Botones**

- **CSV**: Botón verde con icono `fa-file-csv`
- **Excel**: Botón azul con icono `fa-file-excel`
- Ambos botones tienen tooltip descriptivo

---

## 🔧 Implementación Técnica

### **Backend - app.py**

**Nueva ruta agregada:**
```python
@app.route('/personas/exportar')
@login_required
def exportar_personas():
```

**Flujo de exportación:**

1. **Recibe parámetros:**
   - `formato`: 'csv' o 'excel'
   - Mismos parámetros de búsqueda que `consultar_personas`

2. **Obtiene datos:**
   - Llama al API de consulta con los filtros
   - Límite de 1000 registros para exportación

3. **Transforma datos:**
   - Convierte a DataFrame de pandas
   - Extrae solo las columnas necesarias
   - Formatea fecha_nacimiento (elimina timestamp)

4. **Genera archivo:**
   - **CSV**: UTF-8 con BOM (compatible con Excel en Windows)
   - **Excel**: Formato `.xlsx` con anchos de columna automáticos

5. **Descarga:**
   - Nombre de archivo con timestamp: `personas_export_YYYYMMDD_HHMMSS`
   - Se descarga automáticamente sin mostrar en navegador

### **Frontend - consultar_personas.html**

**Botones agregados en el card-header:**
```html
<div class="btn-group" role="group">
    <a href="{{ url_for('exportar_personas', formato='csv', **request.args) }}" 
       class="btn btn-success btn-sm" title="Exportar a CSV">
        <i class="fas fa-file-csv"></i> CSV
    </a>
    <a href="{{ url_for('exportar_personas', formato='excel', **request.args) }}" 
       class="btn btn-primary btn-sm" title="Exportar a Excel">
        <i class="fas fa-file-excel"></i> Excel
    </a>
</div>
```

**Uso de `**request.args`:**
- Pasa automáticamente todos los parámetros de búsqueda a la URL de exportación
- Mantiene consistencia entre consulta y exportación

### **Dependencias**

**Nueva dependencia agregada:**
```
openpyxl==3.1.2
```

**requirements.txt actualizado:**
- `openpyxl`: Para escritura de archivos Excel (.xlsx)

---

## 📝 Encoding UTF-8 BOM

### **¿Por qué UTF-8 BOM?**

El archivo CSV se exporta con **UTF-8 BOM** (Byte Order Mark) para:
- ✅ Compatibilidad con Excel en Windows
- ✅ Correcta visualización de tildes y caracteres especiales
- ✅ Mismo formato que la plantilla de carga masiva

### **Implementación:**

```python
# CSV con BOM
csv_bytes = io.BytesIO()
csv_bytes.write(b'\xef\xbb\xbf')  # UTF-8 BOM
csv_bytes.write(output.getvalue().encode('utf-8'))
```

---

## 🧪 Casos de Uso

### **1. Exportar Todas las Personas**

1. Ir a **Consultar Personas**
2. Hacer búsqueda avanzada sin filtros (edad 0-120)
3. Clic en **CSV** o **Excel**
4. Se descarga archivo con todas las personas (máx 1000)

### **2. Exportar Personas Filtradas**

1. Aplicar filtros (ej: Género=Femenino, Tipo=Cédula)
2. Ver resultados en la tabla
3. Clic en **CSV** o **Excel**
4. Se descarga archivo solo con personas que cumplen filtros

### **3. Exportar Una Persona**

1. Búsqueda individual por número de documento
2. Se muestra vista detallada
3. Clic en **CSV** o **Excel**
4. Se descarga archivo con una sola fila

### **4. Ciclo Completo: Exportar → Modificar → Importar**

```
1. Exportar personas a CSV
   ↓
2. Abrir CSV en Excel
   ↓
3. Modificar datos (ej: actualizar emails)
   ↓
4. Guardar CSV
   ↓
5. Eliminar personas originales (si es necesario)
   ↓
6. Importar CSV modificado usando Carga Masiva
   ↓
7. Sistema valida y crea/actualiza personas
```

---

## ⚠️ Limitaciones y Consideraciones

### **Limitaciones:**

| Aspecto | Limitación | Motivo |
|---------|------------|--------|
| **Máximo registros** | 1000 | Para evitar archivos muy grandes |
| **Fotos** | No se incluyen | No aplica en formato CSV/Excel |
| **Campos calculados** | No se incluyen | Solo campos editables |

### **Campos NO Exportados:**

- `id` (interno del sistema)
- `foto_url` (no aplica para re-importación)
- `created_at` / `updated_at` (timestamps del sistema)
- `created_by` / `updated_by` (usuario que registró)
- `edad` (campo calculado)

### **Formato de Fecha:**

- **Exportación**: `YYYY-MM-DD` (ISO 8601)
- **Ejemplo**: `1990-05-15`
- **Compatible con:** Excel, carga masiva, estándares internacionales

---

## 🎓 Mejores Prácticas

### **Para Usuarios:**

1. **Usar filtros** antes de exportar para obtener datos específicos
2. **Verificar cantidad** de registros antes de exportar
3. **Elegir CSV** si necesitas editar y re-importar
4. **Elegir Excel** si necesitas análisis con fórmulas

### **Para Edición y Re-importación:**

1. Exportar a **CSV**
2. Abrir con **Excel** (se verá correctamente por el BOM)
3. **No cambiar el orden de las columnas**
4. **No eliminar el encabezado**
5. Mantener formatos válidos para cada campo
6. Guardar como **CSV UTF-8** antes de re-importar

---

## 🚀 Ejemplos de Uso

### **Ejemplo 1: Backup de Datos**

```
Objetivo: Respaldar todas las personas

1. Consultar Personas → Búsqueda Avanzada (sin filtros)
2. Clic en "Excel"
3. Guardar archivo: personas_export_20251008_150000.xlsx
4. Almacenar en ubicación segura
```

### **Ejemplo 2: Actualización Masiva de Emails**

```
Objetivo: Actualizar correos de múltiples personas

1. Exportar personas a CSV
2. Abrir en Excel
3. Modificar columna correo_electronico
4. Guardar CSV
5. Eliminar personas originales (opcional)
6. Importar CSV modificado
```

### **Ejemplo 3: Análisis por Género**

```
Objetivo: Analizar distribución por género

1. Consultar Personas → Búsqueda Avanzada
2. Sin filtros (para obtener todas)
3. Clic en "Excel"
4. Abrir en Excel
5. Crear tabla dinámica por género
6. Generar gráficos
```

---

## 📊 Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `frontend/app.py` | ✅ Importaciones: `send_file`, `io`<br>✅ Nueva ruta: `/personas/exportar`<br>✅ Lógica de exportación CSV/Excel |
| `frontend/templates/consultar_personas.html` | ✅ Botones de exportación en header<br>✅ Pasa parámetros de búsqueda |
| `frontend/requirements.txt` | ✅ Agregado `openpyxl==3.1.2` |

---

## ✅ Estado de Implementación

```
✅ Backend: Ruta de exportación implementada
✅ Frontend: Botones agregados en template
✅ CSV: Formato UTF-8 BOM
✅ Excel: Formato .xlsx con anchos automáticos
✅ Compatibilidad: Mismo formato que carga masiva
✅ Filtros: Respeta búsqueda aplicada
✅ Dependencias: openpyxl instalado
✅ Docker: Imagen reconstruida
✅ Servicios: Activos y funcionando
```

---

## 🧪 Para Probar

1. **Acceder:** http://localhost:5000
2. **Ir a:** Personas → Consultar Personas
3. **Hacer búsqueda** (individual o avanzada)
4. **Verificar** que aparezcan botones CSV y Excel
5. **Clic en CSV:**
   - Debe descargar `personas_export_YYYYMMDD_HHMMSS.csv`
   - Abrir en Excel: tildes correctas
   - Verificar columnas coinciden con plantilla de carga
6. **Clic en Excel:**
   - Debe descargar `personas_export_YYYYMMDD_HHMMSS.xlsx`
   - Abrir en Excel: formato correcto
   - Columnas con ancho automático

---

¡La funcionalidad de exportación está completamente implementada y lista para usar! 🎉
