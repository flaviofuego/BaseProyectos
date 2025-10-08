# Problema de Encoding UTF-8 en Archivos CSV

## 🔍 Problema Detectado

Los archivos CSV mostraban caracteres incorrectos para las tildes:
- "Cédula" aparecía como "CÃ©dula"
- Este es un problema clásico de encoding UTF-8

## 🎯 Causa Raíz

Los archivos CSV fueron creados **sin BOM (Byte Order Mark)**.

### ¿Qué es BOM?

BOM (Byte Order Mark) son los primeros 3 bytes de un archivo UTF-8:
- **Con BOM**: `EF BB BF` (indica explícitamente que el archivo es UTF-8)
- **Sin BOM**: El archivo no tiene estos bytes iniciales

Windows y Excel requieren BOM para interpretar correctamente UTF-8.

## ✅ Solución Implementada

### 1. Archivos Corregidos

Se recrearon los siguientes archivos con UTF-8 BOM:
- `frontend/static/templates/personas_template.csv` - Plantilla para descarga
- `test_bulk_upload.csv` - Archivo de prueba

### 2. Verificación de Encoding

```powershell
# Comando para verificar BOM
$bytes = [System.IO.File]::ReadAllBytes("ruta/archivo.csv")
$bytes[0..2] | ForEach-Object { "{0:X2}" -f $_ }
# Debe mostrar: EF BB BF
```

### 3. Backend ya Configurado

El backend ya estaba preparado para manejar BOM:

```javascript
records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
  bom: true // ✅ Maneja BOM UTF-8
});
```

## 📋 Validaciones Confirmadas

### Base de Datos ✅
```sql
-- Restricción CHECK correcta
CHECK (tipo_documento IN ('Tarjeta de identidad', 'Cédula'))
```

### Backend ✅
```javascript
tipo_documento: Joi.string()
  .valid('Tarjeta de identidad', 'Cédula')
  .required()
```

### Frontend ✅
```html
<meta charset="UTF-8">
<!-- Correcto en todos los templates -->
```

## 🔧 Cómo Crear CSV con UTF-8 BOM

### Opción 1: PowerShell (Recomendado para Windows)
```powershell
$content = "tu,contenido,csv"
$utf8BOM = New-Object System.Text.UTF8Encoding $true
[System.IO.File]::WriteAllText("archivo.csv", $content, $utf8BOM)
```

### Opción 2: Notepad++
1. Abrir archivo
2. Encoding → Convert to UTF-8-BOM
3. Guardar

### Opción 3: Excel
1. Guardar Como
2. Seleccionar "CSV UTF-8 (delimitado por comas) (*.csv)"

### Opción 4: Python
```python
with open('archivo.csv', 'w', encoding='utf-8-sig') as f:
    f.write("contenido")
```

## ✅ Estado Actual

- ✅ Plantilla CSV: UTF-8 BOM
- ✅ Archivo de prueba: UTF-8 BOM  
- ✅ Backend: Configurado con `bom: true`
- ✅ Base de datos: Restricciones con tildes correctas
- ✅ Frontend: Charset UTF-8
- ✅ Schema Joi: Valores con tildes correctas

## 🧪 Prueba de Validación

```bash
# Los siguientes valores son válidos:
tipo_documento: "Cédula"          ✅
tipo_documento: "Tarjeta de identidad"  ✅

# Los siguientes valores son inválidos:
tipo_documento: "Cedula"          ❌ (sin tilde)
tipo_documento: "Pasaporte"       ❌ (no está en la lista)
```

## 📝 Notas Importantes

1. **Windows y Excel** requieren BOM para interpretar UTF-8 correctamente
2. **Los usuarios deben descargar la plantilla** del sistema, no crearla manualmente
3. Si crean CSV manualmente, deben usar las opciones mencionadas arriba
4. El sistema **rechaza** valores sin tilde ("Cedula" en lugar de "Cédula")

## 🎯 Recomendación para Usuarios

**Siempre descargar la plantilla CSV desde el sistema** haciendo clic en el botón "Descargar Plantilla CSV" en la página de carga masiva. Esto garantiza el encoding correcto.
