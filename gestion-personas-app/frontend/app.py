from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify, send_file
import requests
import pandas as pd
from datetime import datetime, date
import json
import os
import io
from dotenv import load_dotenv
import markdown
import bleach

load_dotenv(dotenv_path='../.env')
load_dotenv() 

app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'dev-secret-key-change-in-production')

if os.getenv('API_GATEWAY_URL'):
    print(f"INFO: Using API_GATEWAY_URL: {os.getenv('API_GATEWAY_URL')}")
else:
    print("INFO: Using default API_GATEWAY_URL: http://localhost:8001")

BROWSER_API_BASE_URL = 'http://localhost:8001'
API_BASE_URL = os.getenv('API_GATEWAY_URL', 'http://localhost:8001')

def get_browser_api_url():
    return BROWSER_API_BASE_URL

def build_image_url(foto_url):
    if foto_url and foto_url.startswith('/uploads/'):
        return f"{BROWSER_API_BASE_URL}{foto_url}"
    return foto_url

def invalidate_stats_cache():
    try:
        make_request('POST', '/api/consulta/cache/invalidate-stats', timeout_seconds=2.0)
        print("Stats cache invalidated successfully")
    except Exception as e:
        print(f"Failed to invalidate stats cache: {e}")

@app.context_processor
def inject_datetime_tools():
    return {
        'date': date,
        'datetime': datetime,
        'build_image_url': build_image_url
    }

app.jinja_env.globals.update(date=date, datetime=datetime)

DEFAULT_HTTP_TIMEOUT_SECONDS = float(os.getenv('HTTP_TIMEOUT_SECONDS', '6'))

def make_request(method, endpoint, data=None, files=None, params=None, timeout_seconds: float = DEFAULT_HTTP_TIMEOUT_SECONDS):
    headers = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
    }
    if session.get('token'):
        headers['Authorization'] = f'Bearer {session["token"]}'

    url = f"{API_BASE_URL}{endpoint}"
    
    app.logger.info(f"DEBUG: Making {method} request to {url}")
    if data and not files:
        app.logger.info(f"DEBUG: Request data: {data}")

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
            app.logger.info(f"DEBUG: Unsupported method: {method}")
            return None

        app.logger.info(f"DEBUG: Response status: {response.status_code}")
        if response.status_code >= 400:
            app.logger.info(f"DEBUG: Response error content: {response.text}")
        else:
            app.logger.info(f"DEBUG: Response success")
        
        # Manejar expiración de token
        if response.status_code == 401:
            app.logger.warning("DEBUG: Token expired or invalid - clearing session")
            session.clear()
        
        return response
    except requests.exceptions.ConnectionError as e:
        app.logger.error(f"DEBUG: Connection error: {e}")
        return None
    except requests.exceptions.Timeout as e:
        app.logger.error(f"DEBUG: Timeout error: {e}")
        return None
    except requests.exceptions.ReadTimeout as e:
        app.logger.error(f"DEBUG: Read timeout error: {e}")
        return None
    except Exception as e:
        app.logger.error(f"DEBUG: Unexpected error: {e}")
        return None

def login_required(f):
    def decorated_function(*args, **kwargs):
        if not session.get('authenticated'):
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

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
        
        if login_method == 'local':
            username = request.form.get('username')
            password = request.form.get('password')
            
            app.logger.info(f"DEBUG: Local login - username: {username}")
            
            if username and password:
                response = make_request('POST', '/api/auth/login', {
                    'username': username,
                    'password': password
                })
                
                app.logger.info(f"DEBUG: Returned from make_request - response type: {type(response)}, value: {response}")
                app.logger.info(f"DEBUG: Auth service response - status: {response.status_code if response is not None else 'None'}")
                
                if response is not None and response.status_code == 200:
                    try:
                        data = response.json()
                        app.logger.info(f"DEBUG: Login successful - user: {data.get('user', {}).get('username')}")
                        session['authenticated'] = True
                        session['token'] = data['token']
                        session['user'] = data['user']
                        flash('Inicio de sesión exitoso', 'success')
                        return redirect(url_for('dashboard'))
                    except Exception as e:
                        app.logger.error(f"Error processing login response: {e}")
                        flash('Error al procesar respuesta. Intenta nuevamente.', 'error')
                else:
                    app.logger.info(f"DEBUG: Login failed - status: {response.status_code if response is not None else 'None'}")
                    if response is not None:
                        if response.status_code == 400:
                            try:
                                error_data = response.json()
                                error_message = error_data.get('error', 'Error de validación en los datos proporcionados')
                                flash(error_message, 'error')
                            except:
                                flash('Error de validación. Verifica los datos.', 'error')
                        elif response.status_code == 429:
                            try:
                                error_data = response.json()
                                retry_after = error_data.get('retryAfter', '15 minutos')
                                session['rate_limit_login'] = {
                                    'blocked_until': datetime.now().timestamp() + (15 * 60),
                                    'retry_after': retry_after,
                                    'message': error_data.get('message', 'Demasiados intentos de inicio de sesión')
                                }
                                flash(f'{error_data.get("message", "Demasiados intentos de inicio de sesión")}', 'warning')
                            except Exception as e:
                                app.logger.error(f"Error processing rate limit response: {e}")
                                flash('Demasiados intentos. Espera antes de reintentar.', 'warning')
                        elif response.status_code == 401:
                            try:
                                error_data = response.json()
                                error_msg = error_data.get('error', error_data.get('message', ''))
                                if 'password' in error_msg.lower() or 'contraseña' in error_msg.lower():
                                    flash('Contraseña incorrecta.', 'error')
                                elif 'user' in error_msg.lower() or 'usuario' in error_msg.lower():
                                    flash('Usuario no encontrado.', 'error')
                                else:
                                    flash('Credenciales inválidas.', 'error')
                            except:
                                flash('Credenciales inválidas.', 'error')
                        elif response.status_code == 500:
                            flash('Error del servidor. Intenta en unos momentos.', 'error')
                        else:
                            try:
                                error_data = response.json()
                                flash(f'Error: {error_data.get("message", error_data.get("error", "Error desconocido"))}', 'error')
                            except:
                                flash('Error inesperado. Intenta nuevamente.', 'error')
                    else:
                        flash('Error de conexión. Verifica tu red.', 'error')
            else:
                flash('Completa todos los campos', 'warning')
        
        elif login_method == 'microsoft':
            return redirect(f'{get_browser_api_url()}/api/auth/login/microsoft')
        
        elif login_method == 'auth0':
            return redirect(url_for('auth0_login'))
    
    return render_template('login.html')

@app.route('/quick-login')
def quick_login():
    dev_user_id = 1 
    session['authenticated'] = True
    session['token'] = 'temp-dev-user-token'
    session['user'] = {'id': dev_user_id, 'username': 'admin', 'role': 'admin'}
    flash('Login rápido activado (usuario: admin)', 'success')
    return redirect(url_for('dashboard'))

@app.route('/register', methods=['GET', 'POST'])
def register():
    from_login_page = request.args.get('from_login') == 'true' or request.referrer and '/login' in request.referrer
    
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        if password != confirm_password:
            flash('Las contraseñas no coinciden', 'error')
            if from_login_page:
                return redirect(url_for('login', mode='register', error='passwords_mismatch'))
            return render_template('register.html')
        
        if username and email and password:
            response = make_request('POST', '/api/auth/register', {
                'username': username,
                'email': email,
                'password': password
            })
            
            if response is not None and response.status_code == 201:
                data = response.json()
                session['authenticated'] = True
                session['token'] = data['token']
                session['user'] = data['user']
                flash('Registro exitoso', 'success')
                return redirect(url_for('dashboard'))
            elif response is not None and response.status_code == 400:
                try:
                    error_data = response.json()
                    error_message = error_data.get('error', 'Error de validación en los datos proporcionados')
                    flash(error_message, 'error')
                    if from_login_page:
                        return redirect(url_for('login', mode='register', error='validation_error'))
                except:
                    flash('Error de validación. Verifica que los datos sean correctos.', 'error')
                    if from_login_page:
                        return redirect(url_for('login', mode='register', error='validation_error'))
            elif response is not None and response.status_code == 429:
                try:
                    error_data = response.json()
                    retry_after = error_data.get('retryAfter', '1 hora')
                    session['rate_limit_register'] = {
                        'blocked_until': datetime.now().timestamp() + (60 * 60),  
                        'retry_after': retry_after,
                        'message': error_data.get('message', 'Demasiados intentos de registro')
                    }
                    flash(f'{error_data.get("message", "Demasiados intentos de registro")}', 'warning')
                    if from_login_page:
                        return redirect(url_for('login', mode='register', error='rate_limit'))
                except Exception as e:
                    app.logger.error(f"Error processing rate limit response: {e}")
                    flash('Demasiados intentos de registro. Por favor, espera antes de intentar nuevamente.', 'warning')
                    if from_login_page:
                        return redirect(url_for('login', mode='register', error='rate_limit'))
            elif response is not None and response.status_code == 409:
                flash('Usuario o email ya existe', 'error')
                if from_login_page:
                    return redirect(url_for('login', mode='register', error='user_exists'))
            elif response is None:
                flash('No se pudo conectar con el servidor. Verifica tu conexión e intenta nuevamente.', 'error')
                if from_login_page:
                    return redirect(url_for('login', mode='register', error='connection_error'))
            else:
                try:
                    error_data = response.json()
                    error_message = error_data.get('error', 'Error del servidor')
                    flash(f'Error: {error_message}', 'error')
                    if from_login_page:
                        return redirect(url_for('login', mode='register', error='server_error'))
                except:
                    flash(f'Error del servidor (código {response.status_code})', 'error')
                    if from_login_page:
                        return redirect(url_for('login', mode='register', error='server_error'))
        else:
            flash('Por favor, completa todos los campos', 'warning')
            if from_login_page:
                return redirect(url_for('login', mode='register', error='incomplete_fields'))
    
    if from_login_page:
        return redirect(url_for('login', mode='register'))
    
    return render_template('register.html')

@app.route('/logout')
@login_required
def logout():
    make_request('POST', '/api/auth/logout')
    
    return render_template('logout_cleanup.html')

@app.route('/logout/complete')
def logout_complete():
    session.clear()
    flash('Sesión cerrada', 'success')
    return redirect(url_for('login'))

@app.route('/configurar-cuenta')
@login_required
def configurar_cuenta():
    return render_template('configurar_cuenta.html', user=session.get('user'))

@app.route('/api/auth/cambiar-email', methods=['POST'])
@login_required
def cambiar_email():
    try:
        data = request.get_json()
        
        data['user_id'] = session.get('user', {}).get('id')
        
        response = make_request('POST', '/api/auth/cambiar-email', data=data)
        
        if response is not None and response.status_code == 200:
            if 'user' in session:
                session['user']['email'] = data['nuevo_email']
                session.modified = True
            return jsonify(response.json()), 200
        else:
            error_data = response.json() if response is not None else {'message': 'Error de conexión'}
            return jsonify(error_data), response.status_code if response is not None else 500
            
    except Exception as e:
        print(f"Error al cambiar correo electrónico: {str(e)}")
        return jsonify({'message': 'Error interno del servidor'}), 500

@app.route('/api/auth/cambiar-password', methods=['POST'])
@login_required
def cambiar_password():
    try:
        data = request.get_json()
        
        data['user_id'] = session.get('user', {}).get('id')
        
        response = make_request('POST', '/api/auth/cambiar-password', data=data)
        
        if response is not None and response.status_code == 200:
            return jsonify(response.json()), 200
        else:
            error_data = response.json() if response is not None else {'message': 'Error de conexión'}
            return jsonify(error_data), response.status_code if response is not None else 500
            
    except Exception as e:
        print(f"Error al cambiar contraseña: {str(e)}")
        return jsonify({'message': 'Error interno del servidor'}), 500

@app.route('/api/auth/preferences/consulta-service', methods=['GET', 'PUT'])
@login_required
def consulta_service_preferences():
    try:
        if request.method == 'GET':
            response = make_request('GET', '/api/auth/preferences')
            
            if response is not None and response.status_code == 200:
                return jsonify(response.json()), 200
            else:
                return jsonify({
                    'success': True,
                    'preferences': {
                        'consulta_service_enabled': True
                    }
                }), 200
        
        elif request.method == 'PUT':
            data = request.get_json()
            
            response = make_request('PUT', '/api/auth/preferences/consulta-service', data=data)
            
            if response is not None and response.status_code == 200:
                # Actualizar la sesión con el nuevo estado
                response_data = response.json()
                if 'user' not in session:
                    session['user'] = {}
                session['user']['consulta_service_enabled'] = data.get('enabled', True)
                session.modified = True
                
                return jsonify(response_data), 200
            else:
                error_data = response.json() if response is not None else {'message': 'Error de conexión'}
                return jsonify(error_data), response.status_code if response is not None else 500
    
    except Exception as e:
        print(f"Error en preferencias de servicio de consulta: {str(e)}")
        return jsonify({'message': 'Error interno del servidor'}), 500

@app.route('/dashboard')
@login_required
def dashboard():
    response = make_request('GET', '/api/consulta/stats')

    stats = {}
    if response is not None and response.status_code == 200:
        stats = response.json()
    else:
        if response is None:
            flash('El servicio de estadisticas esta lento o no disponible. Mostrando el panel sin datos.', 'info')
    
    return render_template('dashboard.html', stats=stats, user=session.get('user'))

@app.route('/reportes')
@login_required
def reportes():
    response = make_request('GET', '/api/consulta/stats')

    stats = None
    if response is not None and response.status_code == 200:
        stats_data = response.json()
        # Solo pasar stats si realmente tiene datos
        if stats_data and stats_data.get('total_personas', 0) > 0:
            stats = stats_data
        else:
            flash('No hay personas registradas en el sistema todavía.', 'info')
    elif response is not None and response.status_code == 401:
        # Token expirado - redirigir al login
        flash('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 'warning')
        return redirect(url_for('login'))
    else:
        if response is None:
            flash('El servicio de estadísticas está lento o no disponible. Por favor, intenta de nuevo en unos momentos.', 'warning')
        else:
            flash('Error al cargar las estadísticas. Por favor, recarga la página.', 'error')
    
    return render_template('reportes.html', stats=stats, user=session.get('user'))

@app.route('/api/dashboard/stats')
@login_required
def dashboard_stats_api():
    try:
        response = make_request('GET', '/api/consulta/dashboard/stats', timeout_seconds=3.0)
        
        if response is not None and response.status_code == 200:
            stats_data = response.json()
            stats_data['_frontend_timestamp'] = datetime.now().isoformat()
            return jsonify(stats_data)
        else:
            error_msg = f"Backend error: {response.status_code if response is not None else 'No response'}"
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
    try:
        invalidate_stats_cache()
        
        response = make_request('GET', '/api/consulta/dashboard/stats', timeout_seconds=3.0)
        
        if response is not None and response.status_code == 200:
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
        is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
        
        required_fields = ['numero_documento', 'tipo_documento', 'primer_nombre', 
                          'apellidos', 'fecha_nacimiento', 'genero', 
                          'correo_electronico', 'celular']
        
        data = {}
        for field in required_fields:
            value = request.form.get(field)
            if not value:
                error_msg = f'El campo {field.replace("_", " ").title()} es requerido'
                if is_ajax:
                    return jsonify({'error': error_msg}), 400
                flash(error_msg, 'error')
                return render_template('crear_persona.html', today_iso=today_iso())
            data[field] = value
        
        data['segundo_nombre'] = request.form.get('segundo_nombre') or None
        
        files = None
        if 'foto' in request.files:
            foto = request.files['foto']
            if foto.filename and foto.filename != '':
                if len(foto.read()) > 2 * 1024 * 1024:
                    error_msg = 'La foto no puede superar los 2MB'
                    if is_ajax:
                        return jsonify({'error': error_msg}), 400
                    flash(error_msg, 'error')
                    return render_template('crear_persona.html', today_iso=today_iso())
                foto.seek(0)  
                files = {'foto': (foto.filename, foto, foto.content_type)}
        
        print(f"DEBUG: About to make request to create persona with doc: {data.get('numero_documento')}")
        response = make_request('POST', '/api/personas', data=data, files=files)
        print(f"DEBUG: Received response object: {response}")
        
        if response is not None:
            print(f"DEBUG: crear_persona response status: {response.status_code}")
            try:
                response_text = response.text
                print(f"DEBUG: Response content: {response_text}")
            except:
                print("DEBUG: Could not read response text")
                
            if response.status_code == 201:
                invalidate_stats_cache()
                success_msg = 'Persona creada exitosamente'
                if is_ajax:
                    return jsonify({'message': success_msg}), 201
                flash(success_msg, 'success')
                return redirect(url_for('dashboard'))
            elif response.status_code == 400:
                try:
                    error_data = response.json()
                    error_message = error_data.get('error', 'Error de validación desconocido')
                    print(f"DEBUG: 400 error response: {error_data}")
                    if 'details' in error_data:
                        details = error_data['details']
                        if isinstance(details, dict):
                            detail_messages = []
                            for field, messages in details.items():
                                if isinstance(messages, list):
                                    detail_messages.extend([f"{field}: {msg}" for msg in messages])
                                else:
                                    detail_messages.append(f"{field}: {messages}")
                            error_data['details'] = '; '.join(detail_messages)
                    
                    if is_ajax:
                        return jsonify(error_data), 400
                    flash(f'Error de validación: {error_message}', 'error')
                except Exception as e:
                    print(f"DEBUG: Error parsing 400 response: {e}")
                    error_msg = 'Error de validación: Datos inválidos'
                    if is_ajax:
                        return jsonify({'error': 'Error de validación: Datos inválidos'}), 400
                    flash(error_msg, 'error')
            elif response.status_code == 409:
                try:
                    error_data = response.json()
                    error_message = error_data.get('error', 'Ya existe una persona con ese número de documento')
                    print(f"DEBUG: 409 error response parsed successfully: {error_data}")
                    
                    if is_ajax:
                        print(f"DEBUG: Returning 409 JSON response for AJAX")
                        return jsonify(error_data), 409
                    flash(f'{error_message}. Por favor, verifique el número ingresado.', 'error')
                except Exception as e:
                    print(f"DEBUG: Error parsing 409 response: {e}")
                    print(f"DEBUG: Raw response text: {response.text}")
                    error_data = {'error': 'Ya existe una persona con ese número de documento'}
                    if is_ajax:
                        print(f"DEBUG: Returning fallback 409 JSON response for AJAX")
                        return jsonify(error_data), 409
                    flash('Ya existe una persona con ese número de documento. Por favor, verifique el número ingresado.', 'error')
            elif response.status_code == 422:
                try:
                    error_data = response.json()
                    error_message = error_data.get('error', 'Error de procesamiento')
                    print(f"DEBUG: 422 error response: {error_data}")
                    
                    if is_ajax:
                        return jsonify(error_data), 422
                    flash(f'Error de procesamiento: {error_message}', 'error')
                except Exception as e:
                    print(f"DEBUG: Error parsing 422 response: {e}")
                    error_data = {'error': 'Error de procesamiento: Los datos no pudieron ser procesados'}
                    if is_ajax:
                        return jsonify(error_data), 422
                    flash('Error de procesamiento: Los datos no pudieron ser procesados', 'error')
            elif response.status_code == 500:
                try:
                    error_data = response.json()
                    error_message = error_data.get('error', 'Error interno del servidor')
                    print(f"DEBUG: 500 error response: {error_data}")
                    
                    if is_ajax:
                        return jsonify(error_data), 500
                    flash(f'Error interno del servidor: {error_message}. Por favor, intente nuevamente más tarde.', 'error')
                except Exception as e:
                    print(f"DEBUG: Error parsing 500 response: {e}")
                    error_data = {'error': 'Error interno del servidor'}
                    if is_ajax:
                        return jsonify(error_data), 500
                    flash('Error interno del servidor. Por favor, intente nuevamente más tarde.', 'error')
            else:
                try:
                    error_data = response.json()
                    error_message = error_data.get('error', f'Error desconocido (Código: {response.status_code})')
                    print(f"DEBUG: {response.status_code} error response: {error_data}")
                    
                    if is_ajax:
                        return jsonify(error_data), response.status_code
                    flash(f'{error_message}', 'error')
                except Exception as e:
                    print(f"DEBUG: Error parsing {response.status_code} response: {e}")
                    error_data = {'error': f'Error al crear la persona (Código: {response.status_code})'}
                    if is_ajax:
                        return jsonify(error_data), response.status_code
                    flash(f'Error al crear la persona (Código: {response.status_code})', 'error')
        else:
            print("DEBUG: Response is None - connection/timeout error occurred")
            error_msg = 'Error de conexión: No se pudo contactar con el servidor. Verifique su conexión y que los servicios estén ejecutándose.'
            if is_ajax:
                return jsonify({'error': 'Error de conexión: No se pudo contactar con el servidor. Verifique su conexión y que los servicios estén ejecutándose.'}), 503
            flash(error_msg, 'error')
    
    return render_template('crear_persona.html', today_iso=today_iso())

@app.route('/personas/bulk-upload', methods=['GET', 'POST'])
@login_required
def bulk_upload_personas():
    
    if request.method == 'GET':
        return render_template('bulk_upload.html')
    
    try:
        if 'csv_file' not in request.files:
            flash('No se seleccionó ningún archivo', 'error')
            return render_template('bulk_upload.html')
        
        csv_file = request.files['csv_file']
        
        if csv_file.filename == '':
            flash('No se seleccionó ningún archivo', 'error')
            return render_template('bulk_upload.html')
        
        if not csv_file.filename.endswith('.csv'):
            flash('El archivo debe ser un CSV (.csv)', 'error')
            return render_template('bulk_upload.html')
        
        files = {'csv_file': (csv_file.filename, csv_file.stream, csv_file.content_type)}
        
        print(f"DEBUG: Uploading CSV file: {csv_file.filename}")
        response = make_request('POST', '/api/personas/bulk-upload', files=files)
        
        if response is not None:
            if response.status_code == 200:
                try:
                    response_data = response.json()
                    print(f"DEBUG: Bulk upload response: {response_data}")
                    
                    results = response_data.get('results', {})
                    print(f"DEBUG: Extracted results: {results}")
                    
                    total = results.get('total', 0)
                    created = results.get('created', 0)
                    validation_errors = results.get('validation_errors', [])
                    duplicates = results.get('duplicates', [])
                    failed = results.get('failed', [])
                    
                    print(f"DEBUG: Stats - total:{total}, created:{created}, errors:{len(validation_errors)}, dups:{len(duplicates)}, failed:{len(failed)}")
                    
                    if created > 0:
                        flash(f'Se crearon {created} de {total} personas exitosamente', 'success')
                    
                    total_errors = len(validation_errors) + len(duplicates) + len(failed)
                    if total_errors > 0:
                        flash(f'No se pudieron procesar {total_errors} registros. Ver detalles abajo.', 'warning')
                    
                    print(f"DEBUG: Rendering template with results: {results}")
                    return render_template('bulk_upload.html', 
                                         results=results,
                                         show_results=True)
                
                except Exception as e:
                    print(f"DEBUG: Error parsing 200 response: {e}")
                    flash('Error al procesar la respuesta del servidor', 'error')
                    return render_template('bulk_upload.html')
            
            elif response.status_code == 400:
                # Validation error
                try:
                    error_data = response.json()
                    error_message = error_data.get('error', 'Datos inválidos')
                    print(f"DEBUG: 400 error response: {error_data}")
                    flash(f'{error_message}', 'error')
                except Exception as e:
                    print(f"DEBUG: Error parsing 400 response: {e}")
                    flash('Error de validación en el archivo CSV', 'error')
            
            elif response.status_code == 500:
                try:
                    error_data = response.json()
                    error_message = error_data.get('error', 'Error interno del servidor')
                    print(f"DEBUG: 500 error response: {error_data}")
                    flash(f'Error interno del servidor: {error_message}', 'error')
                except Exception as e:
                    print(f"DEBUG: Error parsing 500 response: {e}")
                    flash('Error interno del servidor', 'error')
            
            else:
                # Other error
                try:
                    error_data = response.json()
                    error_message = error_data.get('error', f'Error desconocido (Código: {response.status_code})')
                    print(f"DEBUG: {response.status_code} error response: {error_data}")
                    flash(f'{error_message}', 'error')
                except Exception as e:
                    print(f"DEBUG: Error parsing {response.status_code} response: {e}")
                    flash(f'Error al procesar el archivo (Código: {response.status_code})', 'error')
        
        else:
            # Connection error
            print("DEBUG: Response is None - connection/timeout error occurred")
            flash('Error de conexión: No se pudo contactar con el servidor', 'error')
    
    except Exception as e:
        print(f"DEBUG: Exception in bulk_upload_personas: {e}")
        flash('Error al procesar el archivo CSV', 'error')
    
    return render_template('bulk_upload.html')

@app.route('/personas/check/<numero_documento>', methods=['GET'])
@login_required
def check_persona_exists(numero_documento):
    try:
        response = make_request('GET', f'/api/personas/{numero_documento}')
        if response is not None:
            if response.status_code == 200:
                return jsonify({'exists': True, 'message': 'Persona encontrada'}), 200
            elif response.status_code == 404:
                return jsonify({'exists': False, 'message': 'Documento disponible'}), 404
            else:
                return jsonify({'error': 'Error verificando documento'}), 500
        else:
            return jsonify({'error': 'Error de conexión'}), 503
    except Exception as e:
        print(f"DEBUG: Error checking persona: {e}")
        return jsonify({'error': 'Error interno'}), 500

@app.route('/personas/modificar', methods=['GET', 'POST'])
@login_required
def modificar_persona():
    persona = None
    def today_iso():
        return date.today().isoformat()
    
    if request.method == 'GET':
        force_clean = request.args.get('clean') == 'true'
        numero_documento = request.args.get('numero_documento')
        app.logger.info(f"DEBUG: GET request - force_clean: {force_clean}, numero_documento: {numero_documento}")
        
        if numero_documento and not force_clean:
            response = make_request('GET', f'/api/personas/{numero_documento}')
            
            if response is not None and response.status_code == 200:
                persona = response.json()
                session['persona_to_modify'] = persona
            elif response is not None and response.status_code == 404:
                flash(f'No se encontró una persona con el documento: {numero_documento}', 'error')
            elif response is not None:
                flash(f'Error al buscar la persona (Código: {response.status_code})', 'error')
            else:
                flash('Error de conexión: No se pudo contactar con el servidor. Verifique su conexión.', 'error')
        elif 'persona_to_modify' in session and not force_clean:
            persona = session['persona_to_modify']
    
    elif request.method == 'POST':
        action = request.form.get('action')
        app.logger.info(f"DEBUG: POST action received: {action}")
        
        if action == 'limpiar_busqueda':
            app.logger.info("DEBUG: Limpiando bÃºsqueda y redirigiendo")
            session.pop('persona_to_modify', None)
            flash('BÃºsqueda reiniciada', 'info')
            return redirect(url_for('modificar_persona', clean='true'))
        
        elif action == 'buscar':
            numero_documento = request.form.get('numero_documento')
            if numero_documento:
                response = make_request('GET', f'/api/personas/{numero_documento}')
                
                if response is not None and response.status_code == 200:
                    persona = response.json()
                    session['persona_to_modify'] = persona
                    flash(f'Persona encontrada: {persona.get("primer_nombre", "")} {persona.get("apellidos", "")}', 'success')
                elif response is not None and response.status_code == 404:
                    flash(f'No se encontró una persona con el documento: {numero_documento}', 'error')
                elif response is not None and response.status_code == 400:
                    flash('Número de documento inválido. Verifique el formato.', 'error')
                elif response is not None and response.status_code == 500:
                    flash('Error interno del servidor. Intente nuevamente más tarde.', 'error')
                elif response is not None:
                    flash(f'Error al buscar la persona (Código: {response.status_code})', 'error')
                else:
                    flash('Error de conexión: No se pudo contactar con el servidor. Verifique su conexión.', 'error')
            else:
                flash('Debe ingresar un número de documento para buscar', 'error')
        
        elif action == 'modificar':
            persona = session.get('persona_to_modify')
            if not persona:
                flash('No hay persona seleccionada para modificar', 'error')
                return render_template('modificar_persona.html', today_iso=today_iso())
            
            data = {}
            updateable_fields = ['tipo_documento', 'primer_nombre', 'segundo_nombre', 
                               'apellidos', 'fecha_nacimiento', 'genero', 
                               'correo_electronico', 'celular']
            
            for field in updateable_fields:
                value = request.form.get(field)
                if value:
                    data[field] = value
            
            files = None
            if 'foto' in request.files:
                foto = request.files['foto']
                if foto.filename and foto.filename != '':
                    if len(foto.read()) > 2 * 1024 * 1024:
                        flash('La foto no puede superar los 2MB', 'error')
                        return render_template('modificar_persona.html', persona=persona, today_iso=today_iso())
                    foto.seek(0)
                    files = {'foto': (foto.filename, foto, foto.content_type)}
            
            response = make_request('PUT', f'/api/personas/{persona["numero_documento"]}', 
                                  data=data, files=files)
            
            if response is not None:
                if response.status_code == 200:
                    invalidate_stats_cache()
                    flash('Persona actualizada exitosamente', 'success')
                    session.pop('persona_to_modify', None)
                    
                    numero_documento = persona.get('numero_documento') if persona else None
                    if numero_documento:
                        return redirect(url_for('consultar_personas', numero_documento=numero_documento))
                    else:
                        return redirect(url_for('dashboard'))
                elif response.status_code == 400:
                    try:
                        error_data = response.json()
                        error_message = error_data.get('error', 'Error de validación desconocido')
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
                        flash(f'Error de validación: {error_message}', 'error')
                    except:
                        flash('Error de validación: Datos inválidos', 'error')
                elif response.status_code == 404:
                    flash('La persona que intenta modificar no existe o fue eliminada.', 'error')
                    session.pop('persona_to_modify', None)  # Limpiar sesión
                elif response.status_code == 409:
                    flash('Conflicto: Los datos ingresados entran en conflicto con otra persona existente.', 'error')
                elif response.status_code == 422:
                    try:
                        error_data = response.json()
                        error_message = error_data.get('error', 'Error de procesamiento')
                        flash(f'Error de procesamiento: {error_message}', 'error')
                    except:
                        flash('Error de procesamiento: Los datos no pudieron ser procesados', 'error')
                elif response.status_code == 500:
                    flash('Error interno del servidor. Por favor, intente nuevamente más tarde.', 'error')
                else:
                    flash(f'Error al actualizar la persona (Código: {response.status_code})', 'error')
            else:
                flash('Error de conexión: No se pudo contactar con el servidor. Verifique su conexión.', 'error')
    
    if not persona and 'persona_to_modify' in session:
        persona = session['persona_to_modify']
    
    return render_template('modificar_persona.html', persona=persona, today_iso=today_iso())

@app.route('/personas/consultar')
@login_required
def consultar_personas():
    personas = []
    
    numero_documento = request.args.get('numero_documento')
    tipo_documento = request.args.get('tipo_documento')
    genero = request.args.get('genero')
    edad_min = request.args.get('edad_min')
    edad_max = request.args.get('edad_max')
    
    if numero_documento:
        response = make_request('GET', f'/api/consulta/persona/{numero_documento}')
        
        if response is not None and response.status_code == 200:
            personas = [response.json()]
        elif response is not None and response.status_code == 401:
            flash('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 'warning')
            return redirect(url_for('login'))
        elif response is not None and response.status_code == 403:
            try:
                error_data = response.json()
                flash(error_data.get('message', 'El servicio de consulta está deshabilitado. Puedes habilitarlo desde la configuración de tu cuenta.'), 'warning')
            except:
                flash('El servicio de consulta está deshabilitado. Puedes habilitarlo desde la configuración de tu cuenta.', 'warning')
        elif response is not None and response.status_code == 404:
            flash('Persona no encontrada', 'error')
        elif response is not None:
            flash(f'Error al buscar la persona (Código: {response.status_code})', 'error')
        else:
            flash('Error de conexión: No se pudo contactar con el servidor', 'error')
    
    elif any([tipo_documento, genero, edad_min, edad_max]):
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
        
        is_show_all = (
            (not tipo_documento or tipo_documento == '' or tipo_documento == 'Todos') and
            (not genero or genero == '' or genero == 'Todos') and
            (edad_min == '0' or not edad_min or edad_min == '') and
            (edad_max == '120' or not edad_max or edad_max == '')
        )
        
        app.logger.info(f"DEBUG: is_show_all check - tipo_documento='{tipo_documento}', genero='{genero}', edad_min='{edad_min}', edad_max='{edad_max}', result={is_show_all}")
        
        if is_show_all:
            params['limit'] = 50  
            app.logger.info("DEBUG: Using limit=50 for show all query")
        else:
            params['limit'] = 20 
            app.logger.info("DEBUG: Using limit=20 for filtered query")
        
        app.logger.info(f"DEBUG: Enviando solicitud a /api/consulta/search con params: {params}")
        response = make_request('GET', '/api/consulta/search', params=params)
        app.logger.info(f"DEBUG: Respuesta recibida - status: {response.status_code if response is not None else 'None'}")
        
        if response is not None and response.status_code == 200:
            data = response.json()
            personas = data.get('personas', [])
            pagination = data.get('pagination', {})
            app.logger.info(f"DEBUG: Personas encontradas: {len(personas)}")
            if personas:
                total_results = pagination.get('total', len(personas))
                flash(f'Se encontraron {total_results} personas (mostrando {len(personas)})', 'success')
            else:
                flash('No se encontraron personas con los criterios especificados', 'info')
        elif response is not None and response.status_code == 401:
            flash('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 'warning')
            return redirect(url_for('login'))
        elif response is not None and response.status_code == 403:
            try:
                error_data = response.json()
                flash(error_data.get('message', 'El servicio de consulta está deshabilitado. Puedes habilitarlo desde la configuración de tu cuenta.'), 'warning')
            except:
                flash('El servicio de consulta está deshabilitado. Puedes habilitarlo desde la configuración de tu cuenta.', 'warning')
    
    return render_template('consultar_personas.html', personas=personas)

@app.route('/personas/exportar')
@login_required
def exportar_personas():
    
    formato = request.args.get('formato', 'csv')  # csv or excel
    
    numero_documento = request.args.get('numero_documento')
    tipo_documento = request.args.get('tipo_documento')
    genero = request.args.get('genero')
    edad_min = request.args.get('edad_min')
    edad_max = request.args.get('edad_max')
    
    personas = []
    
    try:
        if numero_documento:
            response = make_request('GET', f'/api/consulta/persona/{numero_documento}')
            
            if response is not None and response.status_code == 200:
                personas = [response.json()]
        
        elif any([tipo_documento, genero, edad_min, edad_max]):
            params = {}
            if tipo_documento and tipo_documento != 'Todos':
                params['tipo_documento'] = tipo_documento
            if genero and genero != 'Todos':
                params['genero'] = genero
            if edad_min:
                params['edad_min'] = edad_min
            if edad_max:
                params['edad_max'] = edad_max
            
            params['limit'] = 1000
            
            response = make_request('GET', '/api/consulta/search', params=params)
            
            if response is not None and response.status_code == 200:
                data = response.json()
                personas = data.get('personas', [])
        
        if not personas:
            flash('No hay datos para exportar', 'warning')
            return redirect(url_for('consultar_personas'))
        
        df_data = []
        for persona in personas:
            df_data.append({
                'numero_documento': persona.get('numero_documento', ''),
                'tipo_documento': persona.get('tipo_documento', ''),
                'primer_nombre': persona.get('primer_nombre', ''),
                'segundo_nombre': persona.get('segundo_nombre', ''),
                'apellidos': persona.get('apellidos', ''),
                'fecha_nacimiento': persona.get('fecha_nacimiento', '').split('T')[0] if persona.get('fecha_nacimiento') else '',
                'genero': persona.get('genero', ''),
                'correo_electronico': persona.get('correo_electronico', ''),
                'celular': persona.get('celular', '')
            })
        
        df = pd.DataFrame(df_data)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        if formato == 'excel':
            filename = f'personas_export_{timestamp}.xlsx'
            output = io.BytesIO()
            
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, index=False, sheet_name='Personas')
                
                worksheet = writer.sheets['Personas']
                for idx, col in enumerate(df.columns):
                    max_length = max(
                        df[col].astype(str).map(len).max(),
                        len(col)
                    )
                    worksheet.column_dimensions[chr(65 + idx)].width = min(max_length + 2, 50)
            
            output.seek(0)
            
            return send_file(
                output,
                mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                as_attachment=True,
                download_name=filename
            )
        
        else:
            filename = f'personas_export_{timestamp}.csv'
            output = io.StringIO()
            
            df.to_csv(output, index=False, encoding='utf-8-sig')
            
            csv_bytes = io.BytesIO()
            csv_bytes.write(b'\xef\xbb\xbf')  # UTF-8 BOM
            csv_bytes.write(output.getvalue().encode('utf-8'))
            csv_bytes.seek(0)
            
            return send_file(
                csv_bytes,
                mimetype='text/csv',
                as_attachment=True,
                download_name=filename
            )
    
    except Exception as e:
        print(f"DEBUG: Error in export: {e}")
        flash('Error al exportar los datos', 'error')
        return redirect(url_for('consultar_personas'))

@app.route('/personas/nlp', methods=['GET', 'POST'])
@login_required
def consulta_nlp():
    resultado = None
    
    if request.method == 'POST':
        resultado = None
        pregunta = request.form.get('pregunta')
        
        if pregunta:
            try:
                response = make_request('POST', '/api/nlp/query', {'query': pregunta}, timeout_seconds=90.0)
                
                if response is not None and response.status_code == 200:
                    data = response.json()
                    
                    if data.get('success'):
                        markdown_text = data['data']['markdown']
                        
                        md = markdown.Markdown(extensions=[
                            'extra',        # Tablas, listas, etc.
                            'nl2br',        # Saltos de línea automáticos
                            'sane_lists',   # Listas mejoradas
                            'tables',       # Soporte de tablas
                            'fenced_code'   # Bloques de código
                        ])
                        
                        html_content = md.convert(markdown_text)
                        
                        allowed_tags = [
                            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                            'p', 'br', 'strong', 'em', 'u', 'a',
                            'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
                            'table', 'thead', 'tbody', 'tr', 'th', 'td',
                            'hr', 'span', 'div'
                        ]
                        
                        allowed_attributes = {
                            'a': ['href', 'title'],
                            'table': ['class'],
                            'th': ['align'],
                            'td': ['align']
                        }
                        
                        safe_html = bleach.clean(
                            html_content,
                            tags=allowed_tags,
                            attributes=allowed_attributes,
                            strip=True
                        )
                        
                        # Solo mostramos la respuesta de la IA, sin raw_results
                        resultado = {
                            'pregunta': pregunta,
                            'markdown_raw': markdown_text,  # Markdown original (por si se necesita)
                            'html': safe_html,  # HTML pre-renderizado y sanitizado
                            'datos': None,  # No mostramos datos crudos, solo la respuesta de la IA
                            'sql': data['data'].get('sql'),  # SQL generado (opcional)
                            'metadata': data.get('metadata', {}),  # Metadata adicional
                            'respuesta': safe_html  # HTML para compatibilidad
                        }
                        
                        # Mensaje personalizado basado en resultados
                        results_count = data['metadata'].get('results_count', 0)
                        intent = data['metadata'].get('intent', 'GENERAL')
                        processing_time = data['metadata'].get('processing_time_ms', 0)
                        
                        flash(f'Consulta procesada en {processing_time}ms', 'success')
                        
                        print(f"NLP Query processed - Intent: {intent}, Results: {results_count}, Time: {processing_time}ms")
                    else:
                        error_msg = data.get('error', 'Error desconocido')
                        flash(f'Error: {error_msg}', 'error')
                        print(f"NLP Query error: {error_msg}")
                        
                elif response is not None:
                    flash(f'Error del servicio (código {response.status_code})', 'error')
                else:
                    flash('Error de conexión con el servicio', 'error')
                    
            except Exception as e:
                print(f"Exception in consulta_nlp: {str(e)}")
                flash(f'Error inesperado: {str(e)}', 'error')
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
                
                if response is not None and response.status_code == 200:
                    persona = response.json()
                    session['persona_to_delete'] = persona
                elif response is not None and response.status_code == 404:
                    flash('No se encontró una persona con el documento: {numero_documento}', 'error')
                elif response is not None:
                    flash(f'Error al buscar la persona (Código: {response.status_code})', 'error')
                else:
                    flash('Error de conexión: No se pudo contactar con el servidor', 'error')
        
        elif action == 'eliminar':
            persona = session.get('persona_to_delete')
            if persona and request.form.get('confirm') == 'true':
                response = make_request('DELETE', f'/api/personas/{persona["numero_documento"]}')
                
                if response is not None and response.status_code == 200:
                    invalidate_stats_cache()
                    flash('Persona eliminada exitosamente', 'success')
                    session.pop('persona_to_delete', None)
                    return redirect(url_for('dashboard'))
                elif response is not None:
                    flash(f'Error al eliminar la persona (Código: {response.status_code})', 'error')
                else:
                    flash('Error de conexión: No se pudo contactar con el servidor', 'error')
            else:
                flash('Debe confirmar la eliminaciÃ³n', 'warning')
    else:
        session.pop('persona_to_delete', None)
    
    if 'persona_to_delete' in session:
        persona = session['persona_to_delete']
    
    return render_template('borrar_persona.html', persona=persona)

@app.route('/logs-test')
def consultar_logs_test():
    logs = []
    stats = {}
    
    session['token'] = 'temp-admin-token'
    
    try:
        transaction_type = request.args.get('transaction_type')
        entity_type = request.args.get('entity_type')
        numero_documento = request.args.get('numero_documento')
        status = request.args.get('status')
        fecha_inicio = request.args.get('fecha_inicio')
        fecha_fin = request.args.get('fecha_fin')
        show_stats = request.args.get('show_stats')
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 20, type=int)
        
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
            params = {}
            if transaction_type and transaction_type.strip() and transaction_type != 'Todos':
                params['transaction_type'] = transaction_type
            if entity_type and entity_type.strip() and entity_type != 'Todos':
                params['entity_type'] = entity_type
            if numero_documento and numero_documento.strip():
                params['numero_documento'] = numero_documento
            if status and status.strip() and status != 'Todos':
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
            
            params['page'] = page
            params['limit'] = limit
            
            app.logger.info(f"Making request to /api/logs/search with params: {params}")
            response = make_request('GET', '/api/logs/search', params=params)
            
            app.logger.info(f"Response status code: {response.status_code if response is not None else 'No response'}")
            
            if response is not None and response.status_code == 200:
                data = response.json()
                app.logger.info(f"Response data keys: {list(data.keys())}")
                logs = data.get('logs', [])
                app.logger.info(f"Number of logs retrieved: {len(logs)}")
                
                for log in logs:
                    for field in ['request_data', 'response_data']:
                        if log.get(field) and isinstance(log[field], str):
                            try:
                                log[field] = json.loads(log[field])
                            except (json.JSONDecodeError, ValueError):
                                pass
                    
                    if not log.get('details'):
                        if log.get('request_data'):
                            log['details'] = log['request_data']
                        elif log.get('response_data'):
                            log['details'] = log['response_data']
                        elif log.get('error_message'):
                            log['details'] = {'error': log['error_message']}
                            
                    if log.get('created_at') and isinstance(log['created_at'], str):
                        pass 
                    
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
            params = {}
            if transaction_type and transaction_type.strip() and transaction_type != 'Todos':
                params['transaction_type'] = transaction_type
            if entity_type and entity_type.strip() and entity_type != 'Todos':
                params['entity_type'] = entity_type.upper()
            if numero_documento and numero_documento.strip():
                params['numero_documento'] = numero_documento
            if status and status.strip() and status != 'Todos':
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
            
            params['page'] = page
            params['limit'] = limit
            
            app.logger.info(f"Making request to /api/logs/search with params: {params}")
            response = make_request('GET', '/api/logs/search', params=params)
            
            app.logger.info(f"Response status code: {response.status_code if response is not None else 'No response'}")
            
            if response is not None and response.status_code == 200:
                data = response.json()
                app.logger.info(f"Response data keys: {list(data.keys())}")
                logs = data.get('logs', [])
                pagination_info = data.get('pagination', {})
                app.logger.info(f"Number of logs retrieved: {len(logs)}")
                
                for log in logs:
                    for field in ['request_data', 'response_data']:
                        if log.get(field) and isinstance(log[field], str):
                            try:
                                log[field] = json.loads(log[field])
                            except (json.JSONDecodeError, ValueError):
                                pass
                    
                    if not log.get('details'):
                        if log.get('request_data'):
                            log['details'] = log['request_data']
                        elif log.get('response_data'):
                            log['details'] = log['response_data']
                        elif log.get('error_message'):
                            log['details'] = {'error': log['error_message']}
                            
                    if log.get('created_at') and isinstance(log['created_at'], str):
                        pass  
                    
                if logs:
                    pass
                else:
                    pass
            else:
                app.logger.error(f"Error searching logs: {response.status_code if response is not None else 'No response'}")
        
        if show_stats:
            params = {}
            if fecha_inicio:
                params['fecha_inicio'] = fecha_inicio
            if fecha_fin:
                params['fecha_fin'] = fecha_fin
            
            params['page'] = page
            params['limit'] = limit
            
            app.logger.info(f"Making request to /api/logs/stats with params: {params}")
            response = make_request('GET', '/api/logs/stats', params=params)
            
            if response is not None and response.status_code == 200:
                api_stats = response.json()
                
                stats = {
                    'total_logs': api_stats.get('total_transactions', 0),
                    'por_tipo': api_stats.get('by_transaction_type', {}),
                    'por_estado': {}
                }
                
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
                app.logger.error(f"Error getting stats: {response.status_code if response is not None else 'No response'}")
    
    except Exception as e:
        app.logger.error(f"Error in consultar_logs: {str(e)}")
    
    app.logger.info(f"Final logs count: {len(logs)}, stats: {bool(stats)}")
    return render_template('consultar_logs.html', logs=logs, stats=stats, pagination=pagination_info, current_filters=request.args)

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    return render_template('500.html'), 500

@app.route('/auth0/login')
def auth0_login():
    return redirect(f'{get_browser_api_url()}/api/auth/login/auth0')

@app.route('/auth/callback')
def auth_callback():
    token = request.args.get('token')
    
    if not token:
        flash('Error: No se recibió token de autenticación', 'error')
        return redirect(url_for('login'))
    
    try:
        original_token = session.get('token')
        session['token'] = token
        response = make_request('GET', '/api/auth/verify')
        if original_token:
            session['token'] = original_token
        else:
            session.pop('token', None)
        
        if response is not None and response.status_code == 200:
            user_data = response.json()
            session['authenticated'] = True
            session['token'] = token
            session['user'] = user_data['user']
            flash('Inicio de sesión exitoso con Auth0', 'success')
            return redirect(url_for('dashboard'))
        else:
            flash('Error: Token de autenticación inválido', 'error')
            return redirect(url_for('login'))
            
    except Exception as e:
        app.logger.error(f"Error verifying Auth0 token: {e}")
        flash('Error verificando la autenticación', 'error')
        return redirect(url_for('login'))

@app.route('/logout/auth0')
def auth0_logout():
    return render_template('logout_cleanup.html', auth0_logout=True)

@app.route('/api/rate-limit-status')
def rate_limit_status():
    current_time = datetime.now().timestamp()
    status = {
        'login': {
            'blocked': False,
            'seconds_remaining': 0,
            'message': None
        },
        'register': {
            'blocked': False,
            'seconds_remaining': 0,
            'message': None
        }
    }
    
    if 'rate_limit_login' in session:
        rate_limit = session['rate_limit_login']
        blocked_until = rate_limit.get('blocked_until', 0)
        
        if current_time < blocked_until:
            status['login']['blocked'] = True
            status['login']['seconds_remaining'] = int(blocked_until - current_time)
            status['login']['message'] = rate_limit.get('message', 'Bloqueado por intentos excesivos')
            status['login']['retry_after'] = rate_limit.get('retry_after', '15 minutos')
        else:
            session.pop('rate_limit_login', None)
    
    if 'rate_limit_register' in session:
        rate_limit = session['rate_limit_register']
        blocked_until = rate_limit.get('blocked_until', 0)
        
        if current_time < blocked_until:
            status['register']['blocked'] = True
            status['register']['seconds_remaining'] = int(blocked_until - current_time)
            status['register']['message'] = rate_limit.get('message', 'Bloqueado por intentos excesivos')
            status['register']['retry_after'] = rate_limit.get('retry_after', '1 hora')
        else:
            session.pop('rate_limit_register', None)
    
    return jsonify(status)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True) 
