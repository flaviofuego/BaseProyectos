#!/usr/bin/env python3
"""
Script de prueba para el endpoint de carga masiva de personas
"""
import requests
import json

# URL del API Gateway
GATEWAY_URL = "http://localhost:8001"

# Archivo CSV de prueba
CSV_FILE = "test_bulk_upload.csv"

def test_bulk_upload():
    """Prueba el endpoint de carga masiva"""
    
    print("=" * 80)
    print("PRUEBA DE CARGA MASIVA DE PERSONAS")
    print("=" * 80)
    print()
    
    # Preparar el archivo
    with open(CSV_FILE, 'rb') as f:
        files = {'csv_file': (CSV_FILE, f, 'text/csv')}
        
        print(f"📤 Enviando archivo: {CSV_FILE}")
        print(f"🌐 Endpoint: {GATEWAY_URL}/api/personas/bulk-upload")
        print()
        
        try:
            # Hacer la petición
            response = requests.post(
                f"{GATEWAY_URL}/api/personas/bulk-upload",
                files=files,
                timeout=30
            )
            
            print(f"📊 Código de respuesta: {response.status_code}")
            print()
            
            if response.status_code == 200:
                results = response.json()
                
                print("✅ RESULTADOS DEL PROCESAMIENTO")
                print("-" * 80)
                print(f"📝 Total de registros: {results['total']}")
                print(f"✅ Creados exitosamente: {results['created']}")
                print(f"⚠️  Errores de validación: {len(results['validation_errors'])}")
                print(f"🔄 Duplicados: {len(results['duplicates'])}")
                print(f"❌ Errores de base de datos: {len(results['failed'])}")
                print()
                
                # Mostrar errores de validación
                if results['validation_errors']:
                    print("⚠️  ERRORES DE VALIDACIÓN:")
                    print("-" * 80)
                    for error in results['validation_errors']:
                        print(f"  Fila {error['row']}: {error['data']['numero_documento']} - {error['data']['primer_nombre']} {error['data']['apellidos']}")
                        print(f"  Error: {error['error']}")
                        print()
                
                # Mostrar duplicados
                if results['duplicates']:
                    print("🔄 DUPLICADOS:")
                    print("-" * 80)
                    for dup in results['duplicates']:
                        print(f"  Fila {dup['row']}: {dup['data']['numero_documento']} - {dup['data']['primer_nombre']} {dup['data']['apellidos']}")
                        print()
                
                # Mostrar errores de base de datos
                if results['failed']:
                    print("❌ ERRORES DE BASE DE DATOS:")
                    print("-" * 80)
                    for fail in results['failed']:
                        print(f"  Fila {fail['row']}: {fail['data']['numero_documento']} - {fail['data']['primer_nombre']} {fail['data']['apellidos']}")
                        print(f"  Error: {fail['error']}")
                        print()
                
                print("=" * 80)
                print("✅ Prueba completada exitosamente")
                print("=" * 80)
            else:
                print("❌ ERROR EN LA PETICIÓN")
                print("-" * 80)
                try:
                    error_data = response.json()
                    print(f"Mensaje: {error_data.get('error', 'Error desconocido')}")
                except:
                    print(f"Respuesta: {response.text}")
                print("=" * 80)
        
        except requests.exceptions.RequestException as e:
            print(f"❌ Error de conexión: {e}")
            print("=" * 80)

if __name__ == "__main__":
    test_bulk_upload()
