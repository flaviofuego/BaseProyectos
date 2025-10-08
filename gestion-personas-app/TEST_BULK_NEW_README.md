# TEST_BULK_NEW.CSV - Documento de Prueba

## 📋 Descripción General

Este archivo CSV contiene **11 registros** diseñados específicamente para probar todas las funcionalidades de validación del sistema de carga masiva.

## ✅ Encoding

- **Formato:** UTF-8 con BOM (EF BB BF)
- **Verificado:** ✓ Compatible con Windows/Excel
- **Tildes:** Correctamente codificadas ("Cédula", "Sofía", "Ángel")

---

## 📊 Composición del Archivo

### **Registros Válidos: 5** ✅

Estos registros deben ser creados exitosamente:

| Fila | Documento | Nombres | Tipo | Resultado Esperado |
|------|-----------|---------|------|-------------------|
| 2 | 9000000001 | Carlos Eduardo Prueba Válida | Cédula | ✅ CREADO |
| 3 | 9000000002 | Sofía Andrea Prueba Válida Dos | Tarjeta | ✅ CREADO |
| 4 | 9000000003 | Miguel Ángel Prueba Válida Tres | Cédula | ✅ CREADO |
| 10 | 9000000009 | Diego Fernando Prueba Válida Cuatro | Cédula | ✅ CREADO |
| 11 | 9000000010 | Valentina Isabel Prueba Válida Cinco | Tarjeta | ✅ CREADO |

**Características de registros válidos:**
- Número documento: Solo dígitos, máximo 10 caracteres
- Tipo documento: "Cédula" o "Tarjeta de identidad"
- Nombres: Solo letras (incluyendo tildes y ñ)
- Email: Formato válido
- Fecha: Pasado válido
- Género: Valores permitidos

---

### **Errores de Validación: 6** ⚠️

Estos registros deben ser rechazados con mensajes de error específicos:

#### 1️⃣ **Fila 5 - Documento con letras**
```
Documento: LETRAS9999
Error esperado: "El número de documento debe contener solo números"
```

#### 2️⃣ **Fila 6 - Tipo de documento inválido**
```
Documento: 9000000004
Tipo: Pasaporte
Error esperado: "El tipo de documento debe ser 'Tarjeta de identidad' o 'Cédula'"
```

#### 3️⃣ **Fila 7 - Nombre con números**
```
Documento: 9000000005
Nombre: María123
Error esperado: "El primer nombre no puede contener números"
```

#### 4️⃣ **Fila 8 - Email vacío**
```
Documento: 9000000006
Email: (vacío)
Error esperado: "correo_electronico is not allowed to be empty" o similar
```

#### 5️⃣ **Fila 9 - Fecha futura**
```
Documento: 9000000007
Fecha: 2035-01-01
Error esperado: "La fecha de nacimiento no puede ser futura"
```

#### 6️⃣ **Fila 10 - Email inválido**
```
Documento: 9000000008
Email: no-es-email
Error esperado: "correo_electronico must be a valid email" o similar
```

---

## 🎯 Resultados Esperados en el Frontend

Al subir este archivo, el frontend debe mostrar:

### **Panel de Estadísticas:**

```
┌─────────────────────────────────────────────────────────┐
│          RESULTADOS DEL PROCESAMIENTO                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📊 Total: 11    ✅ Creados: 5                          │
│  ⚠️  Errores: 6   ❌ DB Errors: 0                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### **Mensajes Flash:**

```
✅ Se crearon 5 de 11 personas exitosamente
⚠️ No se pudieron procesar 6 registros. Ver detalles abajo.
```

### **Tabla de Errores de Validación:**

Debe aparecer una tabla con 6 filas mostrando:

| Fila | N° Documento | Nombres | Apellidos | Error |
|------|-------------|---------|-----------|-------|
| 5 | LETRAS9999 | Error Número | Documento Con Letras | El número de documento debe contener solo números |
| 6 | 9000000004 | Error Tipo | Documento Incorrecto | El tipo de documento debe ser... |
| 7 | 9000000005 | María123 Con | Números En Nombre | El primer nombre no puede contener números |
| 8 | 9000000006 | José Luis | Sin Correo Electrónico | is not allowed to be empty |
| 9 | 9000000007 | Pedro Pablo | Fecha En Futuro | La fecha de nacimiento no puede ser futura |
| 10 | 9000000008 | Ana María | Email Inválido | must be a valid email |

### **Secciones que NO deben aparecer:**

- ❌ Tabla de "Duplicados" (no hay duplicados en este test)
- ❌ Tabla de "Errores de Base de Datos" (todos los errores son de validación)

---

## 🧪 Pasos para Probar

1. **Limpiar base de datos** (opcional, para evitar duplicados):
   ```bash
   # Solo si alguno de los documentos 9000000001-9000000010 ya existe
   ```

2. **Abrir aplicación:**
   ```
   http://localhost:5000
   ```

3. **Navegar a:**
   ```
   Personas → Carga Masiva CSV
   ```

4. **Subir archivo:**
   ```
   test_bulk_new.csv
   ```

5. **Verificar estadísticas:**
   - ✓ Total: 11
   - ✓ Creados: 5
   - ✓ Errores validación: 6
   - ✓ Errores BD: 0

6. **Verificar tabla de errores:**
   - ✓ Muestra 6 filas
   - ✓ Cada fila tiene: número fila, documento, nombres, apellidos, error
   - ✓ Mensajes de error son claros y descriptivos

7. **Verificar que no aparezcan:**
   - ✓ Tabla de duplicados (vacía, no debe mostrarse)
   - ✓ Tabla de errores de BD (vacía, no debe mostrarse)

---

## 📝 Casos de Prueba Adicionales

### **Prueba de Duplicados:**

Para probar la detección de duplicados, sube el mismo archivo **dos veces**:

**Primera subida:**
- ✅ Creados: 5
- ⚠️ Errores: 6

**Segunda subida:**
- ✅ Creados: 0
- 🔄 Duplicados: 5 (los 5 documentos válidos ya existen)
- ⚠️ Errores: 6 (los mismos errores de validación)

---

## 🔍 Debugging

Si las estadísticas no se muestran correctamente, revisa los logs:

```bash
wsl docker logs flask_app_dev --tail 50
```

Busca las líneas:
```
DEBUG: Bulk upload response: {...}
DEBUG: Extracted results: {...}
DEBUG: Stats - total:11, created:5, errors:6, dups:0, failed:0
```

Si los valores no coinciden, hay un problema en la extracción de datos.

---

## ✅ Checklist de Validación

Frontend debe mostrar:
- [ ] Panel con 4 estadísticas (total, creados, errores, BD errors)
- [ ] Mensaje flash verde: "Se crearon 5 de 11..."
- [ ] Mensaje flash amarillo: "No se pudieron procesar 6..."
- [ ] Tabla de errores de validación con 6 filas
- [ ] Cada error muestra: fila, documento, nombres, apellidos, mensaje
- [ ] NO muestra tabla de duplicados
- [ ] NO muestra tabla de errores BD
- [ ] Botones: "Cargar Más Personas" y "Ver Todas las Personas"

---

## 🎓 Lecciones de Este Test

1. **Encoding UTF-8 BOM**: Esencial para Windows/Excel
2. **Validación exhaustiva**: Cada campo tiene sus restricciones
3. **Mensajes claros**: Los errores deben ser descriptivos
4. **Categorización**: Errores de validación vs duplicados vs BD
5. **UX**: Solo mostrar secciones con datos relevantes

---

## 📌 Notas Finales

- Este archivo está diseñado para **no causar duplicados** en la primera ejecución
- Los números de documento empiezan en 9000000001 para evitar conflictos
- Todos los emails tienen formato válido (excepto el caso de prueba)
- Las fechas están en el pasado (excepto el caso de prueba)
- Los nombres usan tildes y caracteres especiales para validar encoding

**¡Usa este archivo para verificar que el frontend funcione perfectamente!** 🚀
