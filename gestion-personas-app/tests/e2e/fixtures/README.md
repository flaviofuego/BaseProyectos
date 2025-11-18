# Test Fixtures

Este directorio contiene archivos de prueba para los tests E2E.

## Archivos necesarios:

### Imágenes válidas

- `test-photo.jpg` - Imagen válida de prueba (< 2MB, formato JPG)
- `test-photo.png` - Imagen válida en PNG
- `test-photo.gif` - Imagen válida en GIF

### Imágenes para tests de validación

- `large-image.jpg` - Imagen > 2MB para probar validación de tamaño
- `document.pdf` - Archivo PDF para probar validación de formato
- `corrupt-image.jpg` - Imagen corrupta para probar manejo de errores

## Cómo crear las imágenes de prueba:

### Opción 1: Crear manualmente

Copia imágenes reales en este directorio con los nombres especificados.

### Opción 2: Generar con Node.js (Sharp)

```javascript
const sharp = require("sharp");

// Imagen pequeña válida (100x100, < 2MB)
sharp({
  create: {
    width: 100,
    height: 100,
    channels: 3,
    background: { r: 100, g: 150, b: 200 },
  },
})
  .jpeg()
  .toFile("test-photo.jpg");

// Imagen grande (3000x3000, > 2MB)
sharp({
  create: {
    width: 3000,
    height: 3000,
    channels: 3,
    background: { r: 255, g: 0, b: 0 },
  },
})
  .jpeg({ quality: 100 })
  .toFile("large-image.jpg");
```

### Opción 3: Descargar desde URLs

```bash
# Windows PowerShell
Invoke-WebRequest -Uri "https://via.placeholder.com/300" -OutFile "test-photo.jpg"
Invoke-WebRequest -Uri "https://via.placeholder.com/300.png" -OutFile "test-photo.png"
```

## Nota

Si estos archivos no existen, los tests que los necesitan se saltarán automáticamente o usarán rutas alternativas.
