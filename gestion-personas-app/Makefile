.PHONY: help build up down logs clean test init-db db-backup db-restore db-reset db-migrations db-status

# Use bash as shell
SHELL := /bin/bash

# Default target
help:
	@echo "Available commands:"
	@echo ""
	@echo "🏗️  BUILD COMMANDS:"
	@echo "  make build       - Build all Docker images for production"
	@echo "  make build-dev   - Build all Docker images for development"
	@echo ""
	@echo "🚀 START/STOP COMMANDS:"
	@echo "  make up          - Start all services (production mode)"
	@echo "  make dev         - Start all services in development mode with hot reload"
	@echo "  make down        - Stop all services (production)"
	@echo "  make down-dev    - Stop all services (development)"
	@echo ""
	@echo "📋 MONITORING COMMANDS:"
	@echo "  make logs        - Show logs from all services (production)"
	@echo "  make logs-dev    - Show logs from all services (development)"
	@echo ""
	@echo "🗄️  DATABASE COMMANDS:"
	@echo "  make db-backup   - Create manual backup of database"
	@echo "  make db-restore  - Restore database from latest backup"
	@echo "  make db-reset    - Reset database (delete all tables and restore)"
	@echo "  make db-migrations - List applied migrations"
	@echo "  make db-status   - Show database statistics"
	@echo ""
	@echo "🧪 TESTING COMMANDS:"
	@echo "  make test              - Run all tests (unit + integration + e2e)"
	@echo "  make test-build        - Build test environment"
	@echo "  make test-up           - Start test environment"
	@echo "  make test-down         - Stop test environment"
	@echo "  make test-unit         - Run unit tests only"
	@echo "  make test-integration  - Run integration tests only"
	@echo "  make test-e2e          - Run end-to-end tests (Playwright)"
	@echo "  make test-e2e-ui       - Run E2E tests with interactive UI"
	@echo "  make test-e2e-debug    - Run E2E tests in debug mode"
	@echo "  make test-e2e-headed   - Run E2E tests with visible browser"
	@echo "  make test-e2e-report   - Show E2E test report"
	@echo "  make test-e2e-suite    - Run specific E2E test suite (interactive)"
	@echo "  make test-frontend     - Run frontend tests"
	@echo "  make test-coverage     - Generate coverage report"
	@echo "  make test-watch        - Run tests in watch mode"
	@echo "  make test-clean        - Clean test artifacts and volumes"
	@echo "  make test-results      - Show test results summary"
	@echo "  make test-service      - Test specific service (interactive)"
	@echo "  make test-auth         - Test auth service"
	@echo "  make test-personas     - Test personas service"
	@echo "  make test-consulta     - Test consulta service"
	@echo "  make test-nlp-service  - Test nlp service"
	@echo "  make test-log          - Test log service"
	@echo "  make test-gateway      - Test gateway"
	@echo "  make test-registry     - Test service registry"
	@echo "  make test-frontend-dev - Test frontend (dev container)"
	@echo "  make test-performance  - Run performance tests (TC-PERF)"
	@echo ""
	@echo "🧹 MAINTENANCE COMMANDS:"
	@echo "  make clean       - Stop services and remove volumes"
	@echo "  make init-db     - Initialize database with sample data"
	@echo ""
	@echo "🤖 NLP/AI COMMANDS:"
	@echo "  make sync-embeddings - Synchronize embeddings with Gemini"
	@echo "  make test-nlp    - Test NLP functionality"
	@echo ""
	@echo "💡 For development, use: make dev"
	@echo "💡 For production, use: make up"

# Build all Docker images
build:
	docker-compose build

# Build development images
build-dev:
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml build

# Start all services (production)
up:
	docker-compose up -d
	@echo "Waiting for services to be ready..."
	@sleep 10
	@echo "Services are starting up. Access the application at http://localhost:8501"

# Start all services in development mode with hot reload
dev:
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
	@echo "Waiting for services to be ready..."
	@echo "Development services are starting up with hot reload enabled."
	@echo "Access the application at http://localhost:5000"
	@echo "API Gateway at http://localhost:8001"

# Stop all services
down:
	@echo "Creating automatic backup before stopping..."
	@docker exec personas_db bash /backups/backup.sh 2>/dev/null || true
	@echo "Stopping services..."
	docker-compose down
	@echo "Services stopped!"

# Stop development services
down-dev:
	@echo "Creating automatic backup before stopping..."
	@docker exec personas_db bash /backups/backup.sh 2>/dev/null || true
	@echo "Stopping development services..."
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
	@echo "Development services stopped!"

# Show logs
logs:
	docker-compose logs -f

# Show development logs
logs-dev:
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f

# Clean everything (including volumes)
clean:
	docker-compose down -v
	rm -rf uploads/

# ==========================================
# 🧪 TESTING COMMANDS
# ==========================================

# Build test environment
test-build:
	@echo "🏗️  Building test environment..."
	@if [ -f .env ]; then set -a; . .env; set +a; fi; docker-compose -f tests/config/docker-compose.test.yml build
	@echo "✅ Test environment built successfully!"

# Start test environment
test-up:
	@echo "🚀 Starting test environment..."
	@if [ -f .env ]; then set -a; . .env; set +a; fi; docker-compose -f tests/config/docker-compose.test.yml up -d postgres-test redis-test service-registry-test gateway-test
	@echo "⏳ Waiting for services to be ready..."
	@sleep 10
	@echo "✅ Test environment is ready!"

# Stop test environment
test-down:
	@echo "🛑 Stopping test environment..."
	@if [ -f .env ]; then set -a; . .env; set +a; fi; docker-compose -f tests/config/docker-compose.test.yml down
	@echo "✅ Test environment stopped!"

# Run ALL tests (unit + integration + frontend + e2e + performance)
test:
	@echo "🧪 =========================================="
	@echo "🧪 RUNNING ALL TESTS"
	@echo "🧪 =========================================="
	@echo ""
	@make test-unit
	@echo ""
	@make test-integration
	@echo ""
	@make test-frontend
	@echo ""
	@make test-e2e
	@echo ""
	@make test-performance
	@echo ""
	@echo "✅ All tests completed!"

# Run unit tests only
test-unit:
	@echo "🧪 =========================================="
	@echo "🧪 RUNNING UNIT TESTS"
	@echo "🧪 =========================================="
	@echo ""
	@echo "🔍 Testing Auth Service..."
	@docker exec auth_service_dev npm test -- --testPathPattern=unit || true
	@echo ""
	@echo "🔍 Testing Personas Service..."
	@docker exec personas_service_dev npm test -- --testPathPattern=unit || true
	@echo ""
	@echo "✅ Unit tests completed!"

# Run integration tests only
test-integration:
	@echo "🧪 =========================================="
	@echo "🧪 RUNNING INTEGRATION TESTS"
	@echo "🧪 =========================================="
	@echo ""
	@echo "🔍 Testing Auth Service Integration..."
	@docker exec auth_service_dev npm run test:integration || true
	@echo ""
	@echo "🔍 Testing Personas Service Integration..."
	@docker exec personas_service_dev npm run test:integration || true
	@echo ""
	@echo "🔍 Testing Consulta Service Integration..."
	@docker exec consulta_service_dev npm test || true
	@echo ""
	@echo "🔍 Testing Registry Service Integration..."
	@docker exec service_registry_dev npm run test:integration || true
	@echo ""
	@echo "✅ Integration tests completed!"

# Run E2E tests with Playwright
test-e2e:
	@echo "🧪 =========================================="
	@echo "🧪 RUNNING END-TO-END TESTS (Playwright)"
	@echo "🧪 =========================================="
	@echo ""
	@echo "🔍 Verificando que Docker Compose está corriendo..."
	@if [ -z "$$(docker compose ps --services --filter 'status=running' 2>/dev/null)" ]; then \
		echo "⚠️  ADVERTENCIA: Docker Compose no está corriendo. Iniciando..."; \
		docker compose up -d; \
		sleep 5; \
	fi
	@echo "✅ Docker Compose está corriendo"
	@echo ""
	@echo "🔍 Verificando que la app está disponible..."
	@timeout 30 bash -c 'until curl -sf http://localhost:5000 > /dev/null 2>&1; do sleep 2; done' && \
		echo "✅ App disponible en http://localhost:5000" || \
		(echo "❌ ERROR: App no responde en http://localhost:5000" && exit 1)
	@echo ""
	@cd tests/e2e && \
		if [ ! -d "node_modules" ]; then \
			echo "📦 Instalando dependencias..."; \
			npm install && npx playwright install chromium; \
		fi && \
		echo "🚀 Ejecutando tests E2E..." && \
		npx playwright test
	@echo ""
	@echo "✅ E2E tests completed!"
	@echo "📊 Ver reporte HTML: cd tests/e2e && npm run test:report"

# Run E2E tests with UI (interactive mode)
test-e2e-ui:
	@echo "🧪 Running E2E tests with UI..."
	@cd tests/e2e && \
		if [ ! -d "node_modules" ]; then \
			npm install && npx playwright install chromium; \
		fi && \
		npx playwright test --ui

# Run E2E tests in debug mode
test-e2e-debug:
	@echo "🧪 Running E2E tests in debug mode..."
	@cd tests/e2e && \
		if [ ! -d "node_modules" ]; then \
			npm install && npx playwright install chromium; \
		fi && \
		npx playwright test --debug

# Run E2E tests with visible browser
test-e2e-headed:
	@echo "🧪 Running E2E tests with visible browser..."
	@cd tests/e2e && \
		if [ ! -d "node_modules" ]; then \
			npm install && npx playwright install chromium; \
		fi && \
		npx playwright test --headed

# Show E2E test report
test-e2e-report:
	@echo "📊 Opening E2E test report..."
	@cd tests/e2e && npm run test:report

# Run specific E2E test suite
test-e2e-suite:
	@echo "🧪 Running specific E2E test suite..."
	@echo "Available suites:"
	@echo "  1) registro    - CU-001 Registrarse"
	@echo "  2) login       - CU-002 Login"
	@echo "  3) crear       - CU-006 Crear Persona"
	@echo "  4) consultar   - CU-007 Consultar Personas"
	@echo "  5) actualizar  - CU-008 Actualizar Persona"
	@echo "  6) eliminar    - CU-009 Eliminar Persona"
	@echo "  7) nlp         - CU-012 Consulta NLP"
	@echo "  8) journey     - CU-FULL Full Journey"
	@read -p "Enter suite name or number: " suite; \
	case "$$suite" in \
		1|registro) file="01-registro.spec.js" ;; \
		2|login) file="02-login.spec.js" ;; \
		3|crear) file="03-crear-persona.spec.js" ;; \
		4|consultar) file="04-consultar-personas.spec.js" ;; \
		5|actualizar) file="05-actualizar-persona.spec.js" ;; \
		6|eliminar) file="06-eliminar-persona.spec.js" ;; \
		7|nlp) file="07-consulta-nlp.spec.js" ;; \
		8|journey) file="08-full-journey.spec.js" ;; \
		*) echo "❌ Invalid option: $$suite"; exit 1 ;; \
	esac; \
	echo "🚀 Running $$file..."; \
	cd tests/e2e && \
		if [ ! -d "node_modules" ]; then \
			npm install && npx playwright install chromium; \
		fi && \
		npx playwright test "specs/$$file"

# Run frontend tests
test-frontend:
	@echo "🧪 =========================================="
	@echo "🧪 RUNNING FRONTEND TESTS"
	@echo "🧪 =========================================="
	@echo ""
	@echo "🔍 Testing Frontend (Flask + Jest)..."
	@docker exec flask_app_dev sh -c "pytest tests/test_routes.py -v || true" || true
	@docker exec flask_app_dev sh -c "cd /app && npm test || true" || true
	@echo ""
	@echo "✅ Frontend tests completed!"

# Generate coverage report
test-coverage:
	@echo "📊 Generating coverage report..."
	@if [ -f .env ]; then set -a; . .env; set +a; fi; docker-compose -f tests/config/docker-compose.test.yml run --rm test-runner-node npm run test:coverage
	@echo "📊 Coverage report available at: tests/results/coverage/index.html"
	@echo "📊 Open in browser with: open tests/results/coverage/index.html"

# Run tests in watch mode (for development)
test-watch:
	@echo "👀 Running tests in watch mode..."
	@echo "⚠️  Press Ctrl+C to stop"
	@if [ -f .env ]; then set -a; . .env; set +a; fi; docker-compose -f tests/config/docker-compose.test.yml run --rm test-runner-node npm run test:watch

# Clean test artifacts
test-clean:
	@echo "🧹 Cleaning test artifacts..."
	rm -rf tests/results/*
	@if [ -f .env ]; then set -a; . .env; set +a; fi; docker-compose -f tests/config/docker-compose.test.yml down -v
	@echo "✅ Test artifacts cleaned!"

# Show test results summary
test-results:
	@echo "📊 =========================================="
	@echo "📊 TEST RESULTS SUMMARY"
	@echo "📊 =========================================="
	@if [ -d "tests/results" ]; then \
		echo ""; \
		echo "📁 Available Reports:"; \
		find tests/results -name "*.html" -o -name "*.xml" -o -name "*.json" | head -20; \
		echo ""; \
		echo "📊 Main Report: tests/results/index.html"; \
		echo "📊 Python Coverage: tests/results/coverage-python/index.html"; \
		echo ""; \
	else \
		echo "❌ No test results found. Run 'make test' first."; \
	fi



# Test specific service (runs in dev container)
test-service:
	@echo "🧪 Testing specific service..."
	@echo "Available services: auth, personas, consulta, nlp, log, gateway, registry, frontend"
	@read -p "Enter service name: " service; \
	case "$$service" in \
		auth) make test-auth ;; \
		personas) make test-personas ;; \
		consulta) make test-consulta ;; \
		nlp) make test-nlp-service ;; \
		log) make test-log ;; \
		gateway) make test-gateway ;; \
		registry) make test-registry ;; \
		frontend) make test-frontend-dev ;; \
		*) echo "❌ Unknown service: $$service"; \
		   echo "Please choose from: auth, personas, consulta, nlp, log, gateway, registry, frontend"; \
		   exit 1 ;; \
	esac

# Test specific services directly
test-auth:
	@echo "🧪 Testing auth service..."
	@docker exec -it auth_service_dev npm test

test-personas:
	@echo "🧪 Testing personas service..."
	@docker exec -it personas_service_dev npm test

test-consulta:
	@echo "🧪 Testing consulta service..."
	@docker exec -it consulta_service_dev npm run test:integration

test-nlp-service:
	@echo "🧪 Testing nlp service..."
	@docker exec -it nlp_service_dev npm test

test-log:
	@echo "🧪 Testing log service..."
	@docker exec -it log_service_dev npm test

test-gateway:
	@echo "🧪 Testing gateway..."
	@docker exec -it api_gateway_dev npm test

test-registry:
	@echo "🧪 Testing service registry..."
	@docker exec -it service_registry_dev npm test

test-frontend-dev:
	@echo "🧪 Testing frontend..."
	@docker exec -it frontend_dev sh -c "pytest --cov -v || npm test"

# Run performance tests (TC-PERF)
test-performance:
	@echo "🧪 =========================================="
	@echo "🧪 RUNNING PERFORMANCE TESTS (TC-PERF)"
	@echo "🧪 =========================================="
	@echo ""
	@echo "🔍 Verificando que Docker Compose está corriendo..."
	@if [ -z "$$(docker compose ps --services --filter 'status=running' 2>/dev/null)" ]; then \
		echo "⚠️  ADVERTENCIA: Docker Compose no está corriendo. Iniciando..."; \
		docker compose up -d; \
		sleep 10; \
	fi
	@echo "✅ Docker Compose está corriendo"
	@echo ""
	@echo "🔍 Verificando que la API está disponible..."
	@timeout 30 bash -c 'until curl -sf http://localhost:8001/health > /dev/null 2>&1; do sleep 2; done' && \
		echo "✅ API disponible en http://localhost:8001" || \
		(echo "❌ ERROR: API no responde en http://localhost:8001" && exit 1)
	@echo ""
	@cd tests/performance && \
		if [ ! -d "node_modules" ]; then \
			echo "📦 Instalando dependencias..."; \
			npm install; \
		fi && \
		echo "🚀 Ejecutando tests de performance..." && \
		npm test
	@echo ""
	@echo "✅ Performance tests completed!"

# Initialize database with sample data
init-db:
	@echo "Initializing database..."
	# Wait for database to be ready
	@sleep 5
	# The init.sql script will run automatically when postgres starts

# Development commands
dev-gateway:
	cd gateway && npm install && npm run dev

dev-auth:
	cd services/auth && npm install && npm run dev

dev-personas:
	cd services/personas && npm install && npm run dev

dev-consulta:
	cd services/consulta && npm install && npm run dev

dev-nlp:
	cd services/nlp && npm install && npm run dev

dev-log:
	cd services/log && npm install && npm run dev

dev-frontend:
	cd frontend && pip install -r requirements.txt && python app.py


# Check service health
health:
	@echo "Checking service health..."
	@curl -s http://localhost:8001/health | jq .

# Sync embeddings for Gemini
sync-embeddings:
	@echo "Synchronizing embeddings with Gemini..."
	@curl -X POST http://gateway:8001/api/nlp/sync-embeddings

# Database management commands
db-backup:
	@echo "Creating database backup..."
	@docker exec personas_db bash /backups/backup.sh
	@echo "Backup created successfully!"

db-restore:
	@echo "Restoring database from backup..."
	@docker exec personas_db bash /backups/restore.sh
	@echo "Database restored successfully!"

db-reset:
	@echo "WARNING: This will delete all data and restore from backup!"
	@echo "Press Ctrl+C to cancel, or wait 5 seconds to continue..."
	@sleep 5
	@echo "Dropping all tables..."
	@docker exec personas_db psql -U admin -d personas_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
	@echo "Restoring from backup..."
	@docker exec personas_db bash /backups/restore.sh
	@echo "Database reset complete!"

db-migrations:
	@echo "Applied migrations:"
	@docker exec personas_db psql -U admin -d personas_db -c "CREATE TABLE IF NOT EXISTS schema_migrations (id SERIAL PRIMARY KEY, migration_name VARCHAR(255) UNIQUE NOT NULL, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);" > /dev/null 2>&1 || true
	@docker exec personas_db psql -U admin -d personas_db -c "SELECT migration_name, applied_at FROM schema_migrations ORDER BY applied_at;"

db-status:
	@echo "Database Statistics:"
	@echo ""
	@echo "Users:"
	@docker exec personas_db psql -U admin -d personas_db -c "SELECT COUNT(*) as total_users FROM users;"
	@echo ""
	@echo "Personas:"
	@docker exec personas_db psql -U admin -d personas_db -c "SELECT COUNT(*) as total_personas FROM personas;"
	@echo ""
	@echo "Tables:"
	@docker exec personas_db psql -U admin -d personas_db -c "SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"
	@echo ""
	@echo "Migrations:"
	@docker exec personas_db psql -U admin -d personas_db -c "CREATE TABLE IF NOT EXISTS schema_migrations (id SERIAL PRIMARY KEY, migration_name VARCHAR(255) UNIQUE NOT NULL, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);" > /dev/null 2>&1 || true
	@docker exec personas_db psql -U admin -d personas_db -c "SELECT COUNT(*) as applied_migrations FROM schema_migrations;"
