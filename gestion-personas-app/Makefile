.PHONY: help build up down logs clean test init-db db-backup db-restore db-reset db-migrations db-status

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
	@echo "  make test-e2e          - Run end-to-end tests"
	@echo "  make test-frontend     - Run frontend tests"
	@echo "  make test-coverage     - Generate coverage report"
	@echo "  make test-watch        - Run tests in watch mode"
	@echo "  make test-clean        - Clean test artifacts and volumes"
	@echo "  make test-results      - Show test results summary"
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
	docker-compose -f tests/config/docker-compose.test.yml build
	@echo "✅ Test environment built successfully!"

# Start test environment
test-up:
	@echo "🚀 Starting test environment..."
	docker-compose -f tests/config/docker-compose.test.yml up -d postgres-test redis-test service-registry-test gateway-test
	@echo "⏳ Waiting for services to be ready..."
	@sleep 10
	@echo "✅ Test environment is ready!"

# Stop test environment
test-down:
	@echo "🛑 Stopping test environment..."
	docker-compose -f tests/config/docker-compose.test.yml down
	@echo "✅ Test environment stopped!"

# Run ALL tests (unit + integration + frontend)
test:
	@echo "🧪 =========================================="
	@echo "🧪 RUNNING ALL TESTS"
	@echo "🧪 =========================================="
	docker-compose -f tests/config/docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from test-runner-node test-runner-node test-runner-python
	@echo ""
	@echo "✅ All tests completed! Check tests/results/ for detailed reports"
	@echo "📊 Open tests/results/index.html for consolidated report"

# Run unit tests only
test-unit:
	@echo "🧪 Running unit tests..."
	docker-compose -f tests/config/docker-compose.test.yml run --rm test-runner-node npm run test:unit
	@echo "✅ Unit tests completed!"

# Run integration tests only
test-integration:
	@echo "🧪 Running integration tests..."
	docker-compose -f tests/config/docker-compose.test.yml run --rm test-runner-node npm run test:integration
	@echo "✅ Integration tests completed!"

# Run E2E tests
test-e2e:
	@echo "🧪 Running end-to-end tests..."
	docker-compose -f tests/config/docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from test-runner-e2e test-runner-e2e
	@echo "✅ E2E tests completed!"

# Run frontend tests
test-frontend:
	@echo "🧪 Running frontend tests..."
	docker-compose -f tests/config/docker-compose.test.yml run --rm test-runner-python
	@echo "✅ Frontend tests completed!"

# Generate coverage report
test-coverage:
	@echo "📊 Generating coverage report..."
	docker-compose -f tests/config/docker-compose.test.yml run --rm test-runner-node npm run test:coverage
	@echo "📊 Coverage report available at: tests/results/coverage/index.html"
	@echo "📊 Open in browser with: open tests/results/coverage/index.html"

# Run tests in watch mode (for development)
test-watch:
	@echo "👀 Running tests in watch mode..."
	@echo "⚠️  Press Ctrl+C to stop"
	docker-compose -f tests/config/docker-compose.test.yml run --rm test-runner-node npm run test:watch

# Clean test artifacts
test-clean:
	@echo "🧹 Cleaning test artifacts..."
	rm -rf tests/results/*
	docker-compose -f tests/config/docker-compose.test.yml down -v
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

# Quick test (only modified services)
test-quick:
	@echo "⚡ Running quick tests on modified files..."
	docker-compose -f docker-compose.test.yml run --rm test-runner-node npm run test -- --onlyChanged
	@echo "✅ Quick tests completed!"

# Test specific service
test-service:
	@echo "🧪 Testing specific service..."
	@read -p "Enter service name (auth/personas/consulta/nlp/log/gateway): " service; \
	docker-compose -f docker-compose.test.yml run --rm test-runner-node sh -c "cd /app/services/$$service && npm test"

# Legacy commands for backwards compatibility
test-auth:
	@echo "⚠️  Using legacy command. Please use 'make test-service' instead."
	@docker-compose -f docker-compose.test.yml run --rm test-runner-node sh -c "cd /app/services/auth && npm test"

test-personas:
	@echo "⚠️  Using legacy command. Please use 'make test-service' instead."
	@docker-compose -f docker-compose.test.yml run --rm test-runner-node sh -c "cd /app/services/personas && npm test"

test-all: test
	@echo "⚠️  'test-all' is deprecated. Use 'make test' instead."

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
	cd frontend && pip install -r requirements.txt && streamlit run app.py

# Production build
prod:
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Check service health
health:
	@echo "Checking service health..."
	@curl -s http://localhost:8001/health | jq .
	@curl -s http://localhost:3001/health | jq .
	@curl -s http://localhost:3002/health | jq .
	@curl -s http://localhost:3003/health | jq .
	@curl -s http://localhost:3004/health | jq .
	@curl -s http://localhost:3005/health | jq .

# Sync embeddings for Gemini
sync-embeddings:
	@echo "Synchronizing embeddings with Gemini..."
	@curl -X POST http://localhost:8001/api/nlp/sync-embeddings

# Test NLP query
test-nlp:
	@echo "Testing NLP query..."
	@curl -X POST http://localhost:8001/api/nlp/query \
		-H "Content-Type: application/json" \
		-d '{"pregunta": "¿Cuál es el empleado más joven registrado?"}' | jq .

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
