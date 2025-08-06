import streamlit as st
import requests
import pandas as pd
from datetime import datetime, date
import json
import os
from dotenv import load_dotenv
import plotly.express as px
import plotly.graph_objects as go
from PIL import Image
import io
import base64

# Load environment variables
load_dotenv()

# API Configuration
API_BASE_URL = os.getenv('API_GATEWAY_URL', 'http://localhost:8000')

# Page configuration
st.set_page_config(
    page_title="Sistema de Gestión de Personas",
    page_icon="👥",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for better styling
st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        color: #1f77b4;
        text-align: center;
        margin-bottom: 2rem;
    }
    .stButton>button {
        width: 100%;
        background-color: #1f77b4;
        color: white;
    }
    .success-message {
        padding: 1rem;
        background-color: #d4edda;
        border: 1px solid #c3e6cb;
        border-radius: 0.25rem;
        color: #155724;
    }
    .error-message {
        padding: 1rem;
        background-color: #f8d7da;
        border: 1px solid #f5c6cb;
        border-radius: 0.25rem;
        color: #721c24;
    }
</style>
""", unsafe_allow_html=True)

# Session state initialization
if 'authenticated' not in st.session_state:
    st.session_state.authenticated = False
if 'token' not in st.session_state:
    st.session_state.token = None
if 'user' not in st.session_state:
    st.session_state.user = None

# Helper functions
def make_request(method, endpoint, data=None, files=None, params=None):
    """Make authenticated API request"""
    headers = {}
    if st.session_state.token:
        headers['Authorization'] = f'Bearer {st.session_state.token}'
    
    url = f"{API_BASE_URL}{endpoint}"
    
    try:
        if method == 'GET':
            response = requests.get(url, headers=headers, params=params)
        elif method == 'POST':
            if files:
                response = requests.post(url, headers=headers, data=data, files=files)
            else:
                headers['Content-Type'] = 'application/json'
                response = requests.post(url, headers=headers, json=data)
        elif method == 'PUT':
            if files:
                response = requests.put(url, headers=headers, data=data, files=files)
            else:
                headers['Content-Type'] = 'application/json'
                response = requests.put(url, headers=headers, json=data)
        elif method == 'DELETE':
            response = requests.delete(url, headers=headers)
        
        return response
    except requests.exceptions.ConnectionError:
        st.error("Error de conexión con el servidor. Por favor, verifica que el backend esté ejecutándose.")
        return None

def login_page():
    """Login page"""
    st.markdown('<h1 class="main-header">Sistema de Gestión de Personas</h1>', unsafe_allow_html=True)
    
    col1, col2, col3 = st.columns([1, 2, 1])
    
    with col2:
        st.subheader("Iniciar Sesión")
        
        login_method = st.radio("Método de autenticación", ["Local", "Microsoft Entra ID"])
        
        if login_method == "Local":
            username = st.text_input("Usuario")
            password = st.text_input("Contraseña", type="password")
            
            col_login, col_register = st.columns(2)
            
            with col_login:
                if st.button("Iniciar Sesión", type="primary"):
                    if username and password:
                        response = make_request('POST', '/api/auth/login', {
                            'username': username,
                            'password': password
                        })
                        
                        if response and response.status_code == 200:
                            data = response.json()
                            st.session_state.authenticated = True
                            st.session_state.token = data['token']
                            st.session_state.user = data['user']
                            st.rerun()
                        else:
                            st.error("Credenciales inválidas")
                    else:
                        st.warning("Por favor, completa todos los campos")
            
            with col_register:
                if st.button("Registrarse"):
                    st.session_state.show_register = True
                    st.rerun()
        
        else:  # Microsoft Entra ID
            if st.button("Iniciar sesión con Microsoft", type="primary"):
                # Redirect to Microsoft login
                st.markdown(f'<meta http-equiv="refresh" content="0; url={API_BASE_URL}/api/auth/login/microsoft">', unsafe_allow_html=True)

def main_app():
    """Main application after authentication"""
    # Sidebar
    with st.sidebar:
        st.image("https://via.placeholder.com/150", caption="Logo")
        st.title("Menú Principal")
        
        menu_option = st.radio(
            "Selecciona una opción:",
            ["🏠 Inicio",
             "➕ Crear Personas", 
             "✏️ Modificar Datos Personales",
             "🔍 Consultar Datos Personales",
             "🤖 Consulta en Lenguaje Natural",
             "🗑️ Borrar Personas",
             "📊 Consultar Log",
             "🚪 Cerrar Sesión"]
        )
        
        st.divider()
        st.caption(f"Usuario: {st.session_state.user.get('username', 'N/A')}")
    
    # Main content
    if menu_option == "🏠 Inicio":
        show_dashboard()
    elif menu_option == "➕ Crear Personas":
        create_person()
    elif menu_option == "✏️ Modificar Datos Personales":
        modify_person()
    elif menu_option == "🔍 Consultar Datos Personales":
        query_person()
    elif menu_option == "🤖 Consulta en Lenguaje Natural":
        natural_language_query()
    elif menu_option == "🗑️ Borrar Personas":
        delete_person()
    elif menu_option == "📊 Consultar Log":
        query_logs()
    elif menu_option == "🚪 Cerrar Sesión":
        logout()

def show_dashboard():
    """Show dashboard with statistics"""
    st.title("Dashboard - Sistema de Gestión de Personas")
    
    # Get statistics
    response = make_request('GET', '/api/consulta/stats')
    
    if response and response.status_code == 200:
        stats = response.json()
        
        # Key metrics
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("Total Personas", stats['total_personas'])
        
        with col2:
            st.metric("Edad Promedio", f"{stats['estadisticas_edad']['promedio']} años")
        
        with col3:
            st.metric("Edad Mínima", f"{stats['estadisticas_edad']['minima']} años")
        
        with col4:
            st.metric("Edad Máxima", f"{stats['estadisticas_edad']['maxima']} años")
        
        # Charts
        col1, col2 = st.columns(2)
        
        with col1:
            # Gender distribution
            gender_data = pd.DataFrame(
                list(stats['por_genero'].items()),
                columns=['Género', 'Cantidad']
            )
            fig = px.pie(gender_data, values='Cantidad', names='Género', 
                        title='Distribución por Género')
            st.plotly_chart(fig, use_container_width=True)
        
        with col2:
            # Document type distribution
            doc_data = pd.DataFrame(
                list(stats['por_tipo_documento'].items()),
                columns=['Tipo Documento', 'Cantidad']
            )
            fig = px.bar(doc_data, x='Tipo Documento', y='Cantidad',
                        title='Distribución por Tipo de Documento')
            st.plotly_chart(fig, use_container_width=True)
        
        # Age group distribution
        if stats.get('por_grupo_edad'):
            age_data = pd.DataFrame(
                list(stats['por_grupo_edad'].items()),
                columns=['Grupo Edad', 'Cantidad']
            )
            fig = px.bar(age_data, x='Grupo Edad', y='Cantidad',
                        title='Distribución por Grupo de Edad')
            st.plotly_chart(fig, use_container_width=True)
        
        # Youngest person
        if stats.get('persona_mas_joven'):
            st.subheader("Persona más joven registrada")
            p = stats['persona_mas_joven']
            st.info(f"{p['primer_nombre']} {p['apellidos']} - {p['edad']} años")

def create_person():
    """Create new person form"""
    st.title("Crear Nueva Persona")
    
    with st.form("create_person_form"):
        col1, col2 = st.columns(2)
        
        with col1:
            numero_documento = st.text_input("Número de Documento*", max_chars=10)
            tipo_documento = st.selectbox("Tipo de Documento*", 
                                        ["Tarjeta de identidad", "Cédula"])
            primer_nombre = st.text_input("Primer Nombre*", max_chars=30)
            segundo_nombre = st.text_input("Segundo Nombre", max_chars=30)
            apellidos = st.text_input("Apellidos*", max_chars=60)
        
        with col2:
            fecha_nacimiento = st.date_input("Fecha de Nacimiento*", 
                                            min_value=date(1900, 1, 1),
                                            max_value=date.today())
            genero = st.selectbox("Género*", 
                                ["Masculino", "Femenino", "No binario", "Prefiero no reportar"])
            correo_electronico = st.text_input("Correo Electrónico*")
            celular = st.text_input("Celular*", max_chars=10)
            foto = st.file_uploader("Foto (máx. 2MB)", type=['jpg', 'jpeg', 'png', 'gif'])
        
        submitted = st.form_submit_button("Crear Persona", type="primary")
        
        if submitted:
            # Validate required fields
            if all([numero_documento, tipo_documento, primer_nombre, apellidos,
                   fecha_nacimiento, genero, correo_electronico, celular]):
                
                # Prepare data
                data = {
                    'numero_documento': numero_documento,
                    'tipo_documento': tipo_documento,
                    'primer_nombre': primer_nombre,
                    'segundo_nombre': segundo_nombre or None,
                    'apellidos': apellidos,
                    'fecha_nacimiento': fecha_nacimiento.isoformat(),
                    'genero': genero,
                    'correo_electronico': correo_electronico,
                    'celular': celular
                }
                
                files = None
                if foto:
                    if foto.size > 2 * 1024 * 1024:  # 2MB
                        st.error("La foto no puede superar los 2MB")
                        return
                    files = {'foto': (foto.name, foto, foto.type)}
                
                # Make request
                response = make_request('POST', '/api/personas', data=data, files=files)
                
                if response:
                    if response.status_code == 201:
                        st.success("✅ Persona creada exitosamente")
                        st.balloons()
                    elif response.status_code == 400:
                        error_data = response.json()
                        st.error(f"Error de validación: {error_data.get('error', 'Error desconocido')}")
                    elif response.status_code == 409:
                        st.error("Ya existe una persona con ese número de documento")
                    else:
                        st.error("Error al crear la persona")
            else:
                st.warning("Por favor, completa todos los campos obligatorios (*)")

def modify_person():
    """Modify existing person"""
    st.title("Modificar Datos Personales")
    
    numero_documento = st.text_input("Ingrese el número de documento de la persona a modificar:")
    
    if st.button("Buscar"):
        if numero_documento:
            response = make_request('GET', f'/api/personas/{numero_documento}')
            
            if response and response.status_code == 200:
                persona = response.json()
                st.session_state.persona_to_modify = persona
            elif response and response.status_code == 404:
                st.error("Persona no encontrada")
            else:
                st.error("Error al buscar la persona")
    
    if 'persona_to_modify' in st.session_state:
        persona = st.session_state.persona_to_modify
        
        st.subheader(f"Modificando: {persona['primer_nombre']} {persona['apellidos']}")
        
        with st.form("modify_person_form"):
            col1, col2 = st.columns(2)
            
            with col1:
                tipo_documento = st.selectbox("Tipo de Documento*", 
                                            ["Tarjeta de identidad", "Cédula"],
                                            index=0 if persona['tipo_documento'] == "Tarjeta de identidad" else 1)
                primer_nombre = st.text_input("Primer Nombre*", value=persona['primer_nombre'], max_chars=30)
                segundo_nombre = st.text_input("Segundo Nombre", value=persona.get('segundo_nombre', ''), max_chars=30)
                apellidos = st.text_input("Apellidos*", value=persona['apellidos'], max_chars=60)
            
            with col2:
                fecha_nacimiento = st.date_input("Fecha de Nacimiento*", 
                                               value=datetime.fromisoformat(persona['fecha_nacimiento'].split('T')[0]).date())
                genero = st.selectbox("Género*", 
                                    ["Masculino", "Femenino", "No binario", "Prefiero no reportar"],
                                    index=["Masculino", "Femenino", "No binario", "Prefiero no reportar"].index(persona['genero']))
                correo_electronico = st.text_input("Correo Electrónico*", value=persona['correo_electronico'])
                celular = st.text_input("Celular*", value=persona['celular'], max_chars=10)
                foto = st.file_uploader("Nueva Foto (máx. 2MB)", type=['jpg', 'jpeg', 'png', 'gif'])
            
            submitted = st.form_submit_button("Actualizar Persona", type="primary")
            
            if submitted:
                # Prepare data
                data = {
                    'tipo_documento': tipo_documento,
                    'primer_nombre': primer_nombre,
                    'segundo_nombre': segundo_nombre or None,
                    'apellidos': apellidos,
                    'fecha_nacimiento': fecha_nacimiento.isoformat(),
                    'genero': genero,
                    'correo_electronico': correo_electronico,
                    'celular': celular
                }
                
                files = None
                if foto:
                    if foto.size > 2 * 1024 * 1024:  # 2MB
                        st.error("La foto no puede superar los 2MB")
                        return
                    files = {'foto': (foto.name, foto, foto.type)}
                
                # Make request
                response = make_request('PUT', f'/api/personas/{persona["numero_documento"]}', 
                                      data=data, files=files)
                
                if response:
                    if response.status_code == 200:
                        st.success("✅ Persona actualizada exitosamente")
                        del st.session_state.persona_to_modify
                    elif response.status_code == 400:
                        error_data = response.json()
                        st.error(f"Error de validación: {error_data.get('error', 'Error desconocido')}")
                    else:
                        st.error("Error al actualizar la persona")

def query_person():
    """Query person data"""
    st.title("Consultar Datos Personales")
    
    tab1, tab2 = st.tabs(["Búsqueda Individual", "Búsqueda Avanzada"])
    
    with tab1:
        numero_documento = st.text_input("Número de Documento:")
        
        if st.button("Buscar", key="search_individual"):
            if numero_documento:
                response = make_request('GET', f'/api/consulta/persona/{numero_documento}')
                
                if response and response.status_code == 200:
                    persona = response.json()
                    display_person_card(persona)
                elif response and response.status_code == 404:
                    st.error("Persona no encontrada")
                else:
                    st.error("Error al buscar la persona")
    
    with tab2:
        st.subheader("Filtros de Búsqueda")
        
        col1, col2 = st.columns(2)
        
        with col1:
            tipo_documento = st.selectbox("Tipo de Documento", 
                                        ["Todos", "Tarjeta de identidad", "Cédula"])
            genero = st.selectbox("Género", 
                                ["Todos", "Masculino", "Femenino", "No binario", "Prefiero no reportar"])
        
        with col2:
            edad_min = st.number_input("Edad Mínima", min_value=0, max_value=150, value=0)
            edad_max = st.number_input("Edad Máxima", min_value=0, max_value=150, value=150)
        
        if st.button("Buscar", key="search_advanced"):
            params = {}
            if tipo_documento != "Todos":
                params['tipo_documento'] = tipo_documento
            if genero != "Todos":
                params['genero'] = genero
            if edad_min > 0:
                params['edad_min'] = edad_min
            if edad_max < 150:
                params['edad_max'] = edad_max
            
            response = make_request('GET', '/api/consulta/search', params=params)
            
            if response and response.status_code == 200:
                data = response.json()
                personas = data['personas']
                
                if personas:
                    st.success(f"Se encontraron {len(personas)} personas")
                    
                    # Display results in a table
                    df = pd.DataFrame(personas)
                    df = df[['numero_documento', 'primer_nombre', 'apellidos', 
                           'edad', 'genero', 'correo_electronico']]
                    
                    st.dataframe(df, use_container_width=True)
                else:
                    st.info("No se encontraron personas con los criterios especificados")

def display_person_card(persona):
    """Display person information in a card format"""
    with st.container():
        col1, col2 = st.columns([1, 3])
        
        with col1:
            if persona.get('foto_url'):
                st.image(persona['foto_url'], width=150)
            else:
                st.image("https://via.placeholder.com/150", width=150)
        
        with col2:
            st.subheader(f"{persona['primer_nombre']} {persona.get('segundo_nombre', '')} {persona['apellidos']}")
            
            col_info1, col_info2 = st.columns(2)
            
            with col_info1:
                st.write(f"**Documento:** {persona['tipo_documento']} {persona['numero_documento']}")
                st.write(f"**Fecha de Nacimiento:** {persona['fecha_nacimiento'].split('T')[0]}")
                st.write(f"**Edad:** {persona.get('edad', 'N/A')} años")
                st.write(f"**Género:** {persona['genero']}")
            
            with col_info2:
                st.write(f"**Email:** {persona['correo_electronico']}")
                st.write(f"**Celular:** {persona['celular']}")
                if persona.get('_cache'):
                    st.caption(f"⚡ Respuesta desde caché ({persona.get('_responseTime', 0)}ms)")

def natural_language_query():
    """Natural language query interface"""
    st.title("Consulta en Lenguaje Natural")
    st.markdown("Utiliza inteligencia artificial para hacer preguntas sobre las personas registradas")
    
    # Example queries
    with st.expander("Ejemplos de preguntas"):
        st.markdown("""
        - ¿Cuál es el empleado más joven que se ha registrado?
        - ¿Cuántas personas de género femenino hay en el sistema?
        - Muéstrame las estadísticas generales del sistema
        - ¿Quién es la persona más vieja registrada?
        - ¿Cuántas personas hay con cédula?
        """)
    
    pregunta = st.text_area("Escribe tu pregunta:", height=100)
    
    if st.button("Enviar Pregunta", type="primary"):
        if pregunta:
            with st.spinner("Procesando tu pregunta..."):
                response = make_request('POST', '/api/nlp/query', {'pregunta': pregunta})
                
                if response and response.status_code == 200:
                    result = response.json()
                    
                    # Display answer
                    st.success(result['respuesta'])
                    
                    # Display data if available
                    if result.get('datos'):
                        st.subheader("Datos encontrados:")
                        
                        if isinstance(result['datos'], dict):
                            # Single person
                            if 'primer_nombre' in result['datos']:
                                display_person_card(result['datos'])
                            else:
                                # Statistics or other data
                                st.json(result['datos'])
                        elif isinstance(result['datos'], list):
                            # Multiple persons
                            for persona in result['datos']:
                                display_person_card(persona)
                                st.divider()
                    
                    # Show metadata
                    with st.expander("Detalles técnicos"):
                        st.json(result.get('metadata', {}))
                else:
                    st.error("Error al procesar la pregunta. Verifica que el servicio de NLP esté configurado correctamente.")
        else:
            st.warning("Por favor, escribe una pregunta")

def delete_person():
    """Delete person interface"""
    st.title("Borrar Persona")
    st.warning("⚠️ Esta acción no se puede deshacer")
    
    numero_documento = st.text_input("Número de Documento de la persona a eliminar:")
    
    col1, col2 = st.columns([3, 1])
    
    with col1:
        if st.button("Buscar Persona"):
            if numero_documento:
                response = make_request('GET', f'/api/personas/{numero_documento}')
                
                if response and response.status_code == 200:
                    persona = response.json()
                    st.session_state.persona_to_delete = persona
                elif response and response.status_code == 404:
                    st.error("Persona no encontrada")
                else:
                    st.error("Error al buscar la persona")
    
    if 'persona_to_delete' in st.session_state:
        persona = st.session_state.persona_to_delete
        
        st.divider()
        st.subheader("Persona a eliminar:")
        display_person_card(persona)
        
        st.divider()
        
        confirm = st.checkbox("Confirmo que deseo eliminar esta persona permanentemente")
        
        if st.button("🗑️ Eliminar Persona", type="primary", disabled=not confirm):
            response = make_request('DELETE', f'/api/personas/{persona["numero_documento"]}')
            
            if response and response.status_code == 200:
                st.success("✅ Persona eliminada exitosamente")
                del st.session_state.persona_to_delete
            else:
                st.error("Error al eliminar la persona")

def query_logs():
    """Query transaction logs"""
    st.title("Consultar Log de Transacciones")
    
    tab1, tab2 = st.tabs(["Búsqueda de Logs", "Estadísticas"])
    
    with tab1:
        st.subheader("Filtros de Búsqueda")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            transaction_type = st.selectbox("Tipo de Transacción", 
                                          ["Todos", "CREATE", "UPDATE", "DELETE", "QUERY", "NLP_QUERY"])
            entity_type = st.selectbox("Tipo de Entidad",
                                     ["Todos", "PERSONA", "USER", "NLP_QUERY"])
        
        with col2:
            numero_documento = st.text_input("Número de Documento")
            status = st.selectbox("Estado", ["Todos", "SUCCESS", "ERROR", "NOT_FOUND"])
        
        with col3:
            fecha_inicio = st.date_input("Fecha Inicio")
            fecha_fin = st.date_input("Fecha Fin")
        
        if st.button("Buscar Logs"):
            params = {}
            if transaction_type != "Todos":
                params['transaction_type'] = transaction_type
            if entity_type != "Todos":
                params['entity_type'] = entity_type
            if numero_documento:
                params['numero_documento'] = numero_documento
            if status != "Todos":
                params['status'] = status
            if fecha_inicio:
                params['fecha_inicio'] = fecha_inicio.isoformat()
            if fecha_fin:
                params['fecha_fin'] = fecha_fin.isoformat()
            
            response = make_request('GET', '/api/logs/search', params=params)
            
            if response and response.status_code == 200:
                data = response.json()
                logs = data['logs']
                
                if logs:
                    st.success(f"Se encontraron {data['pagination']['total']} registros")
                    
                    # Convert to DataFrame for better display
                    df = pd.DataFrame(logs)
                    df['created_at'] = pd.to_datetime(df['created_at']).dt.strftime('%Y-%m-%d %H:%M:%S')
                    
                    # Select columns to display
                    columns = ['created_at', 'transaction_type', 'entity_type', 
                             'numero_documento', 'status', 'user_id']
                    df_display = df[columns].fillna('-')
                    
                    st.dataframe(df_display, use_container_width=True)
                    
                    # Pagination info
                    st.caption(f"Página {data['pagination']['page']} de {data['pagination']['totalPages']}")
                else:
                    st.info("No se encontraron registros con los criterios especificados")
    
    with tab2:
        st.subheader("Estadísticas de Logs")
        
        col1, col2 = st.columns(2)
        
        with col1:
            fecha_inicio_stats = st.date_input("Fecha Inicio", key="stats_start")
        with col2:
            fecha_fin_stats = st.date_input("Fecha Fin", key="stats_end")
        
        if st.button("Generar Estadísticas"):
            params = {}
            if fecha_inicio_stats:
                params['fecha_inicio'] = fecha_inicio_stats.isoformat()
            if fecha_fin_stats:
                params['fecha_fin'] = fecha_fin_stats.isoformat()
            
            response = make_request('GET', '/api/logs/stats', params=params)
            
            if response and response.status_code == 200:
                stats = response.json()
                
                # Display metrics
                col1, col2, col3 = st.columns(3)
                
                with col1:
                    st.metric("Total Transacciones", stats['total_transactions'])
                
                with col2:
                    st.metric("Tasa de Error", f"{stats['error_rate']}%")
                
                with col3:
                    successful = stats['by_status'].get('SUCCESS', 0)
                    st.metric("Transacciones Exitosas", successful)
                
                # Charts
                st.divider()
                
                # Transaction types chart
                if stats['by_transaction_type']:
                    type_data = pd.DataFrame(
                        list(stats['by_transaction_type'].items()),
                        columns=['Tipo', 'Cantidad']
                    )
                    fig = px.bar(type_data, x='Tipo', y='Cantidad',
                                title='Transacciones por Tipo')
                    st.plotly_chart(fig, use_container_width=True)
                
                # Status distribution
                if stats['by_status']:
                    status_data = pd.DataFrame(
                        list(stats['by_status'].items()),
                        columns=['Estado', 'Cantidad']
                    )
                    fig = px.pie(status_data, values='Cantidad', names='Estado',
                                title='Distribución por Estado',
                                color_discrete_map={'SUCCESS': 'green', 'ERROR': 'red', 'NOT_FOUND': 'orange'})
                    st.plotly_chart(fig, use_container_width=True)
                
                # Most active users
                if stats['most_active_users']:
                    st.subheader("Usuarios Más Activos")
                    users_df = pd.DataFrame(stats['most_active_users'])
                    st.dataframe(users_df, use_container_width=True)

def logout():
    """Logout function"""
    st.session_state.authenticated = False
    st.session_state.token = None
    st.session_state.user = None
    st.rerun()

# Main app logic
if not st.session_state.authenticated:
    login_page()
else:
    main_app()