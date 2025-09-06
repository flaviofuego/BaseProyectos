from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
import requests
import pandas as pd
from datetime import datetime, date
import json
import os
from dotenv import load_dotenv
import base64
from io import BytesIO
from PIL import Image
import plotly
import plotly.express as px
import plotly.graph_objects as go

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'dev-secret-key-change-in-production')

# API Configuration
API_BASE_URL = os.getenv('API_GATEWAY_URL', 'http://localhost:8001')

def build_image_url(foto_url):
    """Build complete image URL using the gateway"""
    if foto_url and foto_url.startswith('/uploads/'):
        return f"{API_BASE_URL}{foto_url}"
    return foto_url

def invalidate_stats_cache():
    """Invalidate stats cache to force refresh of dashboard"""
    try:
        make_request('POST', '/api/consulta/cache/invalidate-stats', timeout_seconds=2.0)
        print("Stats cache invalidated successfully")
    except Exception as e:
        print(f"Failed to invalidate stats cache: {e}")
        # No bloquear la operación principal si falla la invalidación del cache

# Jinja context: expose date/datetime to templates
@app.context_processor
def inject_datetime_tools():
    return {
        'date': date,
        'datetime': datetime,
        'build_image_url': build_image_url
    }

# Also register as Jinja globals to ensure availability in all render paths
app.jinja_env.globals.update(date=date, datetime=datetime)

DEFAULT_HTTP_TIMEOUT_SECONDS = float(os.getenv('HTTP_TIMEOUT_SECONDS', '6'))

# Helper functions
def make_request(method, endpoint, data=None, files=None, params=None, timeout_seconds: float = DEFAULT_HTTP_TIMEOUT_SECONDS):
    """Make authenticated API request with sane timeouts and graceful failures"""
    headers = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
    }
    if session.get('token'):
        headers['Authorization'] = f'Bearer {session["token"]}'

    url = f"{API_BASE_URL}{endpoint}"

    try:
        if method == 'GET':
            response = requests.get(url, headers=headers, params=params, timeout=timeout_seconds)
        elif method == 'POST':
            if files:
                response = requests.post(url, headers=headers, data=data, files=files, timeout=timeout_seconds)
            else:
                headers['Content-Type'] = 'application/json'
                response = requests.post(url, headers=headers, json=data, timeout=timeout_seconds)
        elif method == 'PUT':
            if files:
                response = requests.put(url, headers=headers, data=data, files=files, timeout=timeout_seconds)
            else:
                headers['Content-Type'] = 'application/json'
                response = requests.put(url, headers=headers, json=data, timeout=timeout_seconds)
        elif method == 'DELETE':
            response = requests.delete(url, headers=headers, timeout=timeout_seconds)
        else:
            return None

        return response
    except (requests.exceptions.ConnectionError, requests.exceptions.Timeout, requests.exceptions.ReadTimeout):
        # No bloquear la UI: devolver None y dejar que la vista maneje el fallback
        return None

def login_required(f):
    """Decorator to require login"""
    def decorated_function(*args, **kwargs):
        if not session.get('authenticated'):
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

# Routes

@app.route('/')
def index():
    if session.get('authenticated'):
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        login_method = request.form.get('login_method')
        
        app.logger.info(f"DEBUG: Login attempt - method: {login_method}")
        flash(f'DEBUG: MÃ©todo de login: {login_method}', 'info')
        
        if login_method == 'local':
            username = request.form.get('username')
            password = request.form.get('password')
            
            app.logger.info(f"DEBUG: Local login - username: {username}")
            flash(f'DEBUG: Intentando login con usuario: {username}', 'info')
            
            if username and password:
                # Intentar con el backend de autenticaciÃ³n
                response = make_request('POST', '/api/auth/login', {
                    'username': username,
                    'password': password
                })
                
                if response and response.status_code == 200:
                    try:
                        data = response.json()
                        session['authenticated'] = True
                        session['token'] = data['token']
                        session['user'] = data['user']
                        flash('Inicio de sesiÃ³n exitoso', 'success')
                        return redirect(url_for('dashboard'))
                    except Exception as e:
                        app.logger.error(f"Error processing login response: {e}")
                        flash(f'Error procesando respuesta del servidor: {e}', 'error')
                else:
                    if response:
                        try:
                            error_text = response.text
                            flash(f'Error del servidor: {error_text}', 'error')
                        except:
                            flash('Error desconocido del servidor', 'error')
                    else:
                        flash('Error de conexiÃ³n con el servidor', 'error')
                    flash(f'DEBUG: Login fallÃ³ - status: {response.status_code if response else "None"}', 'warning')
                    # Fallback para admin en caso de emergencia
                    if username == 'admin' and password == 'admin123':
                        session['authenticated'] = True
                        session['token'] = 'temp-admin-token'
                        session['user'] = {
                            'id': 1,
                            'username': 'admin',
                            'email': 'admin@example.com'
                        }
                        flash('âœ… Inicio de sesiÃ³n exitoso (modo de emergencia)', 'warning')
                        return redirect(url_for('dashboard'))
                    else:
                        flash('Credenciales invÃ¡lidas o error de conexiÃ³n', 'error')
            else:
                flash('Por favor, completa todos los campos', 'warning')
        
        elif login_method == 'microsoft':
            # Redirect to Microsoft login
            return redirect(f'{API_BASE_URL}/api/auth/login/microsoft')
    
    return render_template('login.html')

@app.route('/quick-login')
def quick_login():
    """Login rÃ¡pido para desarrollo"""
    session['authenticated'] = True
    session['token'] = 'temp-admin-token'
    session['user'] = {'id': 1, 'username': 'admin', 'role': 'admin'}
    flash('Login rÃ¡pido activado (solo desarrollo)', 'success')
    return redirect(url_for('dashboard'))

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        if password != confirm_password:
            flash('Las contraseÃ±as no coinciden', 'error')
            return render_template('register.html')
        
        if username and email and password:
            # Intentar registrar con el backend de autenticaciÃ³n
            response = make_request('POST', '/api/auth/register', {
                'username': username,
                'email': email,
                'password': password
            })
            
            if response and response.status_code == 201:
                data = response.json()
                session['authenticated'] = True
                session['token'] = data['token']
                session['user'] = data['user']
                flash('Registro exitoso', 'success')
                return redirect(url_for('dashboard'))
            elif response and response.status_code == 409:
                flash('Usuario o email ya existe', 'error')
            else:
                # Solo como Ãºltimo recurso, crear usuario temporal
                if len(username) >= 3 and '@' in email and len(password) >= 6:
                    flash('Error de conexiÃ³n con el servidor. Usando modo temporal.', 'warning')
                    session['authenticated'] = True
                    session['token'] = f'temp-{username}-token'
                    session['user'] = {
                        'id': hash(username) % 1000,
                        'username': username,
                        'email': email
                    }
                    return redirect(url_for('dashboard'))
                else:
                    flash('Error al registrar usuario. Revisa que el username tenga al menos 3 caracteres, el email sea vÃ¡lido y la contraseÃ±a al menos 6 caracteres.', 'error')
        else:
            flash('Por favor, completa todos los campos', 'warning')
    
    return render_template('register.html')

@app.route('/logout')
@login_required
def logout():
    # Call logout endpoint
    make_request('POST', '/api/auth/logout')
    
    session.clear()
    flash('SesiÃ³n cerrada exitosamente', 'success')
    return redirect(url_for('login'))

@app.route('/dashboard')
@login_required
def dashboard():
    # Get statistics
    response = make_request('GET', '/api/consulta/stats')

    stats = {}
    if response and response.status_code == 200:
        stats = response.json()
    else:
        # No bloquear: renderizar sin datos y mostrar aviso suave en la UI
        if response is None:
            flash('El servicio de estadisticas esta lento o no disponible. Mostrando el panel sin datos.', 'info')
    
    return render_template('dashboard.html', stats=stats, user=session.get('user'))

@app.route('/api/dashboard/stats')
@login_required
def dashboard_stats_api():
    """API endpoint for dashboard statistics (for auto-refresh)"""
    try:
        # Llamar directamente al endpoint específico del dashboard
        response = make_request('GET', '/api/consulta/dashboard/stats', timeout_seconds=3.0)
        
        if response and response.status_code == 200:
            stats_data = response.json()
            # Agregar timestamp para debugging
            stats_data['_frontend_timestamp'] = datetime.now().isoformat()
            return jsonify(stats_data)
        else:
            # Responder con error más específico
            error_msg = f"Backend error: {response.status_code if response else 'No response'}"
            return jsonify({
                'error': error_msg,
                '_frontend_timestamp': datetime.now().isoformat()
            }), 503
    except Exception as e:
        return jsonify({
            'error': f'Stats request failed: {str(e)}',
            '_frontend_timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/dashboard/refresh', methods=['POST'])
@login_required
def force_dashboard_refresh():
    """Force refresh dashboard stats by invalidating cache"""
    try:
        # Invalidar cache
        invalidate_stats_cache()
        
        # Obtener nuevas estadísticas
        response = make_request('GET', '/api/consulta/dashboard/stats', timeout_seconds=3.0)
        
        if response and response.status_code == 200:
            stats_data = response.json()
            stats_data['_forced_refresh'] = True
            stats_data['_frontend_timestamp'] = datetime.now().isoformat()
            return jsonify(stats_data)
        else:
            return jsonify({
                'error': 'Failed to get fresh stats after cache invalidation',
                '_frontend_timestamp': datetime.now().isoformat()
            }), 503
    except Exception as e:
        return jsonify({
            'error': f'Force refresh failed: {str(e)}',
            '_frontend_timestamp': datetime.now().isoformat()
        }), 500

@app.route('/personas/crear', methods=['GET', 'POST'])
@login_required
def crear_persona():
    def today_iso():
        return date.today().isoformat()
    if request.method == 'POST':
        # Validate required fields
        required_fields = ['numero_documento', 'tipo_documento', 'primer_nombre', 
                          'apellidos', 'fecha_nacimiento', 'genero', 
                          'correo_electronico', 'celular']
        
        data = {}
        for field in required_fields:
            value = request.form.get(field)
            if not value:
                flash(f'El campo {field.replace("_", " ").title()} es requerido', 'error')
                return render_template('crear_persona.html', today_iso=today_iso())
            data[field] = value
        
        # Optional fields
        data['segundo_nombre'] = request.form.get('segundo_nombre') or None
        
        # Handle file upload
        files = None
        if 'foto' in request.files:
            foto = request.files['foto']
            if foto.filename and foto.filename != '':
                # Check file size (2MB)
                if len(foto.read()) > 2 * 1024 * 1024:
                    flash('La foto no puede superar los 2MB', 'error')
                    return render_template('crear_persona.html', today_iso=today_iso())
                foto.seek(0)  # Reset file pointer
                files = {'foto': (foto.filename, foto, foto.content_type)}
        
        # Make request
        response = make_request('POST', '/api/personas', data=data, files=files)
        
        if response:
            if response.status_code == 201:
                # Invalidar cache de estadísticas después de crear
                invalidate_stats_cache()
                flash('✅ Persona creada exitosamente', 'success')
                return redirect(url_for('dashboard'))
            elif response.status_code == 400:
                try:
                    error_data = response.json()
                    error_message = error_data.get('error', 'Error de validación desconocido')
                    # Mostrar detalles específicos si están disponibles
                    if 'details' in error_data:
                        details = error_data['details']
                        if isinstance(details, dict):
                            detail_messages = []
                            for field, messages in details.items():
                                if isinstance(messages, list):
                                    detail_messages.extend([f"{field}: {msg}" for msg in messages])
                                else:
                                    detail_messages.append(f"{field}: {messages}")
                            error_message += f" - {'; '.join(detail_messages)}"
                    flash(f'❌ Error de validación: {error_message}', 'error')
                except:
                    flash('❌ Error de validación: Datos inválidos', 'error')
            elif response.status_code == 409:
                flash('❌ Ya existe una persona con ese número de documento. Por favor, verifique el número ingresado.', 'error')
            elif response.status_code == 422:
                try:
                    error_data = response.json()
                    error_message = error_data.get('error', 'Error de procesamiento')
                    flash(f'❌ Error de procesamiento: {error_message}', 'error')
                except:
                    flash('❌ Error de procesamiento: Los datos no pudieron ser procesados', 'error')
            elif response.status_code == 500:
                flash('❌ Error interno del servidor. Por favor, intente nuevamente más tarde.', 'error')
            else:
                flash(f'❌ Error al crear la persona (Código: {response.status_code})', 'error')
        else:
            flash('❌ Error de conexión: No se pudo contactar con el servidor. Verifique su conexión.', 'error')
    
    return render_template('crear_persona.html', today_iso=today_iso())

@app.route('/personas/modificar', methods=['GET', 'POST'])
@login_required
def modificar_persona():
    persona = None
    def today_iso():
        return date.today().isoformat()
    
    # Handle GET request with numero_documento parameter
    if request.method == 'GET':
        # Check if we want to force a clean state (after limpiar_busqueda)
        force_clean = request.args.get('clean') == 'true'
        numero_documento = request.args.get('numero_documento')
        app.logger.info(f"DEBUG: GET request - force_clean: {force_clean}, numero_documento: {numero_documento}")
        
        if numero_documento and not force_clean:
            response = make_request('GET', f'/api/personas/{numero_documento}')
            
            if response and response.status_code == 200:
                persona = response.json()
                session['persona_to_modify'] = persona
            elif response and response.status_code == 404:
                flash('Persona no encontrada', 'error')
            else:
                flash('Error al buscar la persona', 'error')
        elif 'persona_to_modify' in session and not force_clean:
            persona = session['persona_to_modify']
    
    elif request.method == 'POST':
        action = request.form.get('action')
        app.logger.info(f"DEBUG: POST action received: {action}")
        
        if action == 'limpiar_busqueda':
            # Clear session and redirect to clean state
            app.logger.info("DEBUG: Limpiando bÃºsqueda y redirigiendo")
            session.pop('persona_to_modify', None)
            flash('BÃºsqueda reiniciada', 'info')
            return redirect(url_for('modificar_persona', clean='true'))
        
        elif action == 'buscar':
            numero_documento = request.form.get('numero_documento')
            if numero_documento:
                response = make_request('GET', f'/api/personas/{numero_documento}')
                
                if response and response.status_code == 200:
                    persona = response.json()
                    session['persona_to_modify'] = persona
                    flash(f'✅ Persona encontrada: {persona.get("primer_nombre", "")} {persona.get("apellidos", "")}', 'success')
                elif response and response.status_code == 404:
                    flash(f'❌ No se encontró una persona con el documento: {numero_documento}', 'error')
                elif response and response.status_code == 400:
                    flash('❌ Número de documento inválido. Verifique el formato.', 'error')
                elif response and response.status_code == 500:
                    flash('❌ Error interno del servidor. Intente nuevamente más tarde.', 'error')
                else:
                    flash(f'❌ Error al buscar la persona (Código: {response.status_code if response else "Sin respuesta"})', 'error')
            else:
                flash('❌ Debe ingresar un número de documento para buscar', 'error')
        
        elif action == 'modificar':
            persona = session.get('persona_to_modify')
            if not persona:
                flash('No hay persona seleccionada para modificar', 'error')
                return render_template('modificar_persona.html', today_iso=today_iso())
            
            # Build update data
            data = {}
            updateable_fields = ['tipo_documento', 'primer_nombre', 'segundo_nombre', 
                               'apellidos', 'fecha_nacimiento', 'genero', 
                               'correo_electronico', 'celular']
            
            for field in updateable_fields:
                value = request.form.get(field)
                if value:
                    data[field] = value
            
            # Handle file upload
            files = None
            if 'foto' in request.files:
                foto = request.files['foto']
                if foto.filename and foto.filename != '':
                    if len(foto.read()) > 2 * 1024 * 1024:
                        flash('La foto no puede superar los 2MB', 'error')
                        return render_template('modificar_persona.html', persona=persona, today_iso=today_iso())
                    foto.seek(0)
                    files = {'foto': (foto.filename, foto, foto.content_type)}
            
            # Make request
            response = make_request('PUT', f'/api/personas/{persona["numero_documento"]}', 
                                  data=data, files=files)
            
            if response:
                if response.status_code == 200:
                    # Invalidar cache de estadísticas después de modificar
                    invalidate_stats_cache()
                    flash('✅ Persona actualizada exitosamente', 'success')
                    # Clear the session cache
                    session.pop('persona_to_modify', None)
                    
                    # Redirect to view the updated person to show fresh data
                    numero_documento = persona.get('numero_documento') if persona else None
                    if numero_documento:
                        return redirect(url_for('consultar_personas', numero_documento=numero_documento))
                    else:
                        return redirect(url_for('dashboard'))
                elif response.status_code == 400:
                    try:
                        error_data = response.json()
                        error_message = error_data.get('error', 'Error de validación desconocido')
                        # Mostrar detalles específicos si están disponibles
                        if 'details' in error_data:
                            details = error_data['details']
                            if isinstance(details, dict):
                                detail_messages = []
                                for field, messages in details.items():
                                    if isinstance(messages, list):
                                        detail_messages.extend([f"{field}: {msg}" for msg in messages])
                                    else:
                                        detail_messages.append(f"{field}: {messages}")
                                error_message += f" - {'; '.join(detail_messages)}"
                        flash(f'❌ Error de validación: {error_message}', 'error')
                    except:
                        flash('❌ Error de validación: Datos inválidos', 'error')
                elif response.status_code == 404:
                    flash('❌ La persona que intenta modificar no existe o fue eliminada.', 'error')
                    session.pop('persona_to_modify', None)  # Limpiar sesión
                elif response.status_code == 409:
                    flash('❌ Conflicto: Los datos ingresados entran en conflicto con otra persona existente.', 'error')
                elif response.status_code == 422:
                    try:
                        error_data = response.json()
                        error_message = error_data.get('error', 'Error de procesamiento')
                        flash(f'❌ Error de procesamiento: {error_message}', 'error')
                    except:
                        flash('❌ Error de procesamiento: Los datos no pudieron ser procesados', 'error')
                elif response.status_code == 500:
                    flash('❌ Error interno del servidor. Por favor, intente nuevamente más tarde.', 'error')
                else:
                    flash(f'❌ Error al actualizar la persona (Código: {response.status_code})', 'error')
            else:
                flash('❌ Error de conexión: No se pudo contactar con el servidor. Verifique su conexión.', 'error')
    
    # Ensure we have the persona data for the template
    if not persona and 'persona_to_modify' in session:
        persona = session['persona_to_modify']
    
    return render_template('modificar_persona.html', persona=persona, today_iso=today_iso())

@app.route('/personas/consultar')
@login_required
def consultar_personas():
    personas = []
    
    # Check if it's a search request
    numero_documento = request.args.get('numero_documento')
    tipo_documento = request.args.get('tipo_documento')
    genero = request.args.get('genero')
    edad_min = request.args.get('edad_min')
    edad_max = request.args.get('edad_max')
    
    if numero_documento:
        # Individual search
        response = make_request('GET', f'/api/consulta/persona/{numero_documento}')
        
        if response and response.status_code == 200:
            personas = [response.json()]
        elif response and response.status_code == 404:
            flash('Persona no encontrada', 'error')
        else:
            flash('Error al buscar la persona', 'error')
    
    elif any([tipo_documento, genero, edad_min, edad_max]):
        # Advanced search
        app.logger.info(f"DEBUG: BÃºsqueda avanzada - params: tipo_documento={tipo_documento}, genero={genero}, edad_min={edad_min}, edad_max={edad_max}")
        params = {}
        if tipo_documento and tipo_documento != 'Todos':
            params['tipo_documento'] = tipo_documento
        if genero and genero != 'Todos':
            params['genero'] = genero
        if edad_min:
            params['edad_min'] = edad_min
        if edad_max:
            params['edad_max'] = edad_max
        
        app.logger.info(f"DEBUG: Enviando solicitud a /api/consulta/search con params: {params}")
        response = make_request('GET', '/api/consulta/search', params=params)
        app.logger.info(f"DEBUG: Respuesta recibida - status: {response.status_code if response else 'None'}")
        
        if response and response.status_code == 200:
            data = response.json()
            personas = data.get('personas', [])
            app.logger.info(f"DEBUG: Personas encontradas: {len(personas)}")
            if personas:
                flash(f'Se encontraron {len(personas)} personas', 'success')
            else:
                flash('No se encontraron personas con los criterios especificados', 'info')
    
    return render_template('consultar_personas.html', personas=personas)

@app.route('/personas/nlp', methods=['GET', 'POST'])
@login_required
def consulta_nlp():
    resultado = None
    
    if request.method == 'POST':
        pregunta = request.form.get('pregunta')
        
        if pregunta:
            response = make_request('POST', '/api/nlp/query', {'pregunta': pregunta})
            
            if response and response.status_code == 200:
                resultado = response.json()
                flash('Consulta procesada exitosamente', 'success')
            else:
                flash('Error al procesar la pregunta. Verifica que el servicio de NLP estÃ© configurado correctamente con tu API key de Gemini.', 'error')
        else:
            flash('Por favor, escribe una pregunta', 'warning')
    
    return render_template('consulta_nlp.html', resultado=resultado)

@app.route('/personas/borrar', methods=['GET', 'POST'])
@login_required
def borrar_persona():
    persona = None
    
    if request.method == 'POST':
        action = request.form.get('action')
        
        if action == 'buscar':
            numero_documento = request.form.get('numero_documento')
            if numero_documento:
                response = make_request('GET', f'/api/personas/{numero_documento}')
                
                if response and response.status_code == 200:
                    persona = response.json()
                    session['persona_to_delete'] = persona
                elif response and response.status_code == 404:
                    flash('Persona no encontrada', 'error')
                else:
                    flash('Error al buscar la persona', 'error')
        
        elif action == 'eliminar':
            persona = session.get('persona_to_delete')
            if persona and request.form.get('confirm') == 'true':
                response = make_request('DELETE', f'/api/personas/{persona["numero_documento"]}')
                
                if response and response.status_code == 200:
                    # Invalidar cache de estadísticas después de eliminar
                    invalidate_stats_cache()
                    flash('âœ… Persona eliminada exitosamente', 'success')
                    session.pop('persona_to_delete', None)
                    return redirect(url_for('dashboard'))
                else:
                    flash('Error al eliminar la persona', 'error')
            else:
                flash('Debe confirmar la eliminaciÃ³n', 'warning')
    
    if 'persona_to_delete' in session:
        persona = session['persona_to_delete']
    
    return render_template('borrar_persona.html', persona=persona)

@app.route('/logs-test')
def consultar_logs_test():
    """Endpoint temporal para probar logs sin autenticaciÃ³n"""
    logs = []
    stats = {}
    
    # Simular token de admin para las pruebas
    session['token'] = 'temp-admin-token'
    
    try:
        # Check for search parameters
        transaction_type = request.args.get('transaction_type')
        entity_type = request.args.get('entity_type')
        numero_documento = request.args.get('numero_documento')
        status = request.args.get('status')
        fecha_inicio = request.args.get('fecha_inicio')
        fecha_fin = request.args.get('fecha_fin')
        show_stats = request.args.get('show_stats')
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 20, type=int)
        
        # Check if we have actual search parameters (not empty strings)
        has_search_params = any([
            transaction_type and transaction_type.strip(),
            entity_type and entity_type.strip(),
            numero_documento and numero_documento.strip(),
            status and status.strip(),
            fecha_inicio and fecha_inicio.strip(),
            fecha_fin and fecha_fin.strip()
        ])
        
        app.logger.info(f"Log request - has_search_params: {has_search_params}, show_stats: {show_stats}")
        
        if has_search_params or (not show_stats and any(request.args.keys())):
            # Search logs
            params = {}
            if transaction_type and transaction_type.strip() and transaction_type != 'Todos':
                params['transaction_type'] = transaction_type
            if entity_type and entity_type.strip() and entity_type != 'Todos':
                params['entity_type'] = entity_type
            if numero_documento and numero_documento.strip():
                params['numero_documento'] = numero_documento
            if status and status.strip() and status != 'Todos':
                # Map frontend status values to API values
                status_mapping = {
                    'success': 'SUCCESS',
                    'error': 'ERROR',
                    'not_found': 'NOT_FOUND'
                }
                params['status'] = status_mapping.get(status, status.upper())
            if fecha_inicio and fecha_inicio.strip():
                params['fecha_inicio'] = fecha_inicio
            if fecha_fin and fecha_fin.strip():
                params['fecha_fin'] = fecha_fin
            
            # Add pagination parameters
            params['page'] = page
            params['limit'] = limit
            
            app.logger.info(f"Making request to /api/logs/search with params: {params}")
            response = make_request('GET', '/api/logs/search', params=params)
            
            app.logger.info(f"Response status code: {response.status_code if response else 'No response'}")
            
            if response and response.status_code == 200:
                data = response.json()
                app.logger.info(f"Response data keys: {list(data.keys())}")
                logs = data.get('logs', [])
                app.logger.info(f"Number of logs retrieved: {len(logs)}")
                
                # Process logs to ensure data consistency
                for log in logs:
                    # Parse JSON fields that might be strings
                    for field in ['request_data', 'response_data']:
                        if log.get(field) and isinstance(log[field], str):
                            try:
                                log[field] = json.loads(log[field])
                            except (json.JSONDecodeError, ValueError):
                                # Keep as string if not valid JSON
                                pass
                    
                    # Set details field based on available data
                    if not log.get('details'):
                        if log.get('request_data'):
                            log['details'] = log['request_data']
                        elif log.get('response_data'):
                            log['details'] = log['response_data']
                        elif log.get('error_message'):
                            log['details'] = {'error': log['error_message']}
                            
                    # Ensure created_at is properly formatted
                    if log.get('created_at') and isinstance(log['created_at'], str):
                        # Normalize the datetime format if needed
                        pass  # Keep as is for now, template handles it
                    
                if logs:
                    flash(f'Se encontraron {data.get("pagination", {}).get("total", len(logs))} registros', 'success')
                else:
                    flash('No se encontraron registros con los criterios especificados', 'info')
            else:
                flash('Error al buscar los logs', 'error')
                app.logger.error(f"Error searching logs: {response.status_code if response else 'No response'}")
                if response:
                    app.logger.error(f"Response text: {response.text}")
    
    except Exception as e:
        app.logger.error(f"Error in consultar_logs_test: {str(e)}")
        flash('Error interno del sistema', 'error')
    
    app.logger.info(f"Final logs count: {len(logs)}, stats: {bool(stats)}")
    return render_template('consultar_logs.html', logs=logs, stats=stats)

@app.route('/logs')
@login_required
def consultar_logs():
    logs = []
    stats = {}
    pagination_info = None
    
    # Check for search parameters
    transaction_type = request.args.get('transaction_type')
    entity_type = request.args.get('entity_type')
    numero_documento = request.args.get('numero_documento')
    status = request.args.get('status')
    fecha_inicio = request.args.get('fecha_inicio')
    fecha_fin = request.args.get('fecha_fin')
    show_stats = request.args.get('show_stats')
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)
    
    try:
        # Check if we have actual search parameters (not empty strings)
        has_search_params = any([
            transaction_type and transaction_type.strip(),
            entity_type and entity_type.strip(),
            numero_documento and numero_documento.strip(),
            status and status.strip(),
            fecha_inicio and fecha_inicio.strip(),
            fecha_fin and fecha_fin.strip()
        ])
        
        app.logger.info(f"Log request - has_search_params: {has_search_params}, show_stats: {show_stats}")
        
        if has_search_params or (not show_stats and any(request.args.keys())):
            # Search logs
            params = {}
            if transaction_type and transaction_type.strip() and transaction_type != 'Todos':
                params['transaction_type'] = transaction_type
            if entity_type and entity_type.strip() and entity_type != 'Todos':
                params['entity_type'] = entity_type
            if numero_documento and numero_documento.strip():
                params['numero_documento'] = numero_documento
            if status and status.strip() and status != 'Todos':
                # Map frontend status values to API values
                status_mapping = {
                    'success': 'SUCCESS',
                    'error': 'ERROR',
                    'not_found': 'NOT_FOUND'
                }
                params['status'] = status_mapping.get(status, status.upper())
            if fecha_inicio and fecha_inicio.strip():
                params['fecha_inicio'] = fecha_inicio
            if fecha_fin and fecha_fin.strip():
                params['fecha_fin'] = fecha_fin
            
            # Add pagination parameters
            params['page'] = page
            params['limit'] = limit
            
            app.logger.info(f"Making request to /api/logs/search with params: {params}")
            response = make_request('GET', '/api/logs/search', params=params)
            
            app.logger.info(f"Response status code: {response.status_code if response else 'No response'}")
            
            if response and response.status_code == 200:
                data = response.json()
                app.logger.info(f"Response data keys: {list(data.keys())}")
                logs = data.get('logs', [])
                pagination_info = data.get('pagination', {})
                app.logger.info(f"Number of logs retrieved: {len(logs)}")
                
                # Process logs to ensure data consistency
                for log in logs:
                    # Parse JSON fields that might be strings
                    for field in ['request_data', 'response_data']:
                        if log.get(field) and isinstance(log[field], str):
                            try:
                                log[field] = json.loads(log[field])
                            except (json.JSONDecodeError, ValueError):
                                # Keep as string if not valid JSON
                                pass
                    
                    # Set details field based on available data
                    if not log.get('details'):
                        if log.get('request_data'):
                            log['details'] = log['request_data']
                        elif log.get('response_data'):
                            log['details'] = log['response_data']
                        elif log.get('error_message'):
                            log['details'] = {'error': log['error_message']}
                            
                    # Ensure created_at is properly formatted
                    if log.get('created_at') and isinstance(log['created_at'], str):
                        # Normalize the datetime format if needed
                        pass  # Keep as is for now, template handles it
                    
                if logs:
                    flash(f'Se encontraron {pagination_info.get("total", len(logs))} registros', 'success')
                else:
                    flash('No se encontraron registros con los criterios especificados', 'info')
            else:
                flash('Error al buscar los logs', 'error')
                app.logger.error(f"Error searching logs: {response.status_code if response else 'No response'}")
        
        if show_stats:
            # Get statistics
            params = {}
            if fecha_inicio:
                params['fecha_inicio'] = fecha_inicio
            if fecha_fin:
                params['fecha_fin'] = fecha_fin
            
            # Add pagination parameters
            params['page'] = page
            params['limit'] = limit
            
            app.logger.info(f"Making request to /api/logs/stats with params: {params}")
            response = make_request('GET', '/api/logs/stats', params=params)
            
            if response and response.status_code == 200:
                api_stats = response.json()
                
                # Map API response to template expected structure
                stats = {
                    'total_logs': api_stats.get('total_transactions', 0),
                    'por_tipo': api_stats.get('by_transaction_type', {}),
                    'por_estado': {}
                }
                
                # Convert status keys to lowercase for template compatibility
                api_status = api_stats.get('by_status', {})
                for status_key, count in api_status.items():
                    if status_key == 'SUCCESS':
                        stats['por_estado']['success'] = count
                    elif status_key == 'ERROR':
                        stats['por_estado']['error'] = count
                    elif status_key == 'NOT_FOUND':
                        stats['por_estado']['not_found'] = count
                    else:
                        stats['por_estado'][status_key.lower()] = count
                        
            else:
                flash('Error al obtener las estadÃ­sticas', 'error')
                app.logger.error(f"Error getting stats: {response.status_code if response else 'No response'}")
    
    except Exception as e:
        app.logger.error(f"Error in consultar_logs: {str(e)}")
        flash('Error interno del sistema', 'error')
    
    app.logger.info(f"Final logs count: {len(logs)}, stats: {bool(stats)}")
    return render_template('consultar_logs.html', logs=logs, stats=stats, pagination=pagination_info, current_filters=request.args)

@app.route('/api/chart/<chart_type>')
@login_required
def get_chart_data(chart_type):
    """API endpoint to generate chart data for dashboard"""
    response = make_request('GET', '/api/consulta/stats')
    
    if not response or response.status_code != 200:
        return jsonify({'error': 'No data available'}), 404
    
    stats = response.json()
    
    if chart_type == 'gender':
        data = list(stats.get('por_genero', {}).items())
        fig = px.pie(
            values=[item[1] for item in data],
            names=[item[0] for item in data],
            title='DistribuciÃ³n por GÃ©nero'
        )
        return jsonify(fig.to_json())
    
    elif chart_type == 'document':
        data = list(stats.get('por_tipo_documento', {}).items())
        fig = px.bar(
            x=[item[0] for item in data],
            y=[item[1] for item in data],
            title='DistribuciÃ³n por Tipo de Documento'
        )
        return jsonify(fig.to_json())
    
    elif chart_type == 'age':
        data = list(stats.get('por_grupo_edad', {}).items())
        fig = px.bar(
            x=[item[0] for item in data],
            y=[item[1] for item in data],
            title='DistribuciÃ³n por Grupo de Edad'
        )
        return jsonify(fig.to_json())
    
    return jsonify({'error': 'Chart type not found'}), 404

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    return render_template('500.html'), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

