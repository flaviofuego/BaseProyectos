.PHONY: help build up down logs clean test init-db

# Default target
help:
	@echo "Available commands:"
	@echo ""
	@echo "🏗️  BUILD COMMANDS:"
	@echo "  make build       - Build all Docker images for production"
	@echo "  make build-dev   - Build all Docker images for development"
	@echo ""
	@echo "🚀 START/STOP COMMANDS:"
	@echo "  make up          - Start all services (production mode with React frontend)"
	@echo "  make dev         - Start all services in development mode with hot reload"
	@echo "  make legacy      - Start with Flask frontend (legacy mode)"
	@echo "  make down        - Stop all services (production)"
	@echo "  make down-dev    - Stop all services (development)"
	@echo ""
	@echo "📋 MONITORING COMMANDS:"
	@echo "  make logs        - Show logs from all services (production)"
	@echo "  make logs-dev    - Show logs from all services (development)"
	@echo ""
	@echo "🧹 MAINTENANCE COMMANDS:"
	@echo "  make clean       - Stop services and remove volumes"
	@echo "  make test        - Run tests"
	@echo "  make init-db     - Initialize database with sample data"
	@echo ""
	@echo "🤖 NLP/AI COMMANDS:"
	@echo "  make sync-embeddings - Synchronize embeddings with Gemini"
	@echo "  make test-nlp    - Test NLP functionality"
	@echo ""
	@echo "💡 For development (React): make dev"
	@echo "💡 For production (React): make up"
	@echo "💡 For legacy Flask: make legacy"

# Build all Docker images
build:
	docker-compose build

# Build development images
build-dev:
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml build

# Start all services (production with React frontend)
up:
	docker-compose up -d
	@echo "Waiting for services to be ready..."
	@sleep 10
	@echo "Services are starting up. Access the React application at http://localhost"

# Start all services in development mode with hot reload (React)
dev:
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
	@echo "Waiting for services to be ready..."
	@echo "Development services are starting up with hot reload enabled."
	@echo "Access the React application at http://localhost:5173"
	@echo "API Gateway at http://localhost:8001"

# Start with Flask frontend (legacy mode)
legacy:
	@echo "Starting services with Flask frontend (legacy mode)..."
	@sed -i 's/# frontend:/frontend:/' docker-compose.yml
	@sed -i 's/frontend-react:/#frontend-react:/' docker-compose.yml
	docker-compose up -d
	@echo "Access the Flask application at http://localhost:5000"
	@echo "To switch back to React, run 'make up'"

# Stop all services
down:
	docker-compose down

# Stop development services
down-dev:
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml down

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

# Run tests
test:
	@echo "Running tests..."
	# Add test commands here

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

dev-frontend-react:
	cd frontend-react && npm install && npm run dev

dev-frontend-flask:
	cd frontend && pip install -r requirements.txt && python app.py

# Production build
prod:
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Check service health
health:
	@echo "Checking service health..."
	@curl -s http://localhost:8000/health | jq .
	@curl -s http://localhost:3001/health | jq .
	@curl -s http://localhost:3002/health | jq .
	@curl -s http://localhost:3003/health | jq .
	@curl -s http://localhost:3004/health | jq .
	@curl -s http://localhost:3005/health | jq .

# Sync embeddings for Gemini
sync-embeddings:
	@echo "Synchronizing embeddings with Gemini..."
	@curl -X POST http://localhost:8000/api/nlp/sync-embeddings

# Test NLP query
test-nlp:
	@echo "Testing NLP query..."
	@curl -X POST http://localhost:8000/api/nlp/query \
		-H "Content-Type: application/json" \
		-d '{"pregunta": "¿Cuál es el empleado más joven registrado?"}' | jq .
