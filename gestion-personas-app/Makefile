.PHONY: help build up down logs clean test init-db

# Default target
help:
	@echo "Available commands:"
	@echo "  make build    - Build all Docker images"
	@echo "  make up       - Start all services"
	@echo "  make down     - Stop all services"
	@echo "  make logs     - Show logs from all services"
	@echo "  make clean    - Stop services and remove volumes"
	@echo "  make test     - Run tests"
	@echo "  make init-db  - Initialize database with sample data"
	@echo "  make sync-embeddings - Synchronize embeddings with Gemini"
	@echo "  make test-nlp - Test NLP functionality"

# Build all Docker images
build:
	docker-compose build

# Start all services
up:
	docker-compose up -d
	@echo "Waiting for services to be ready..."
	@sleep 10
	@echo "Services are starting up. Access the application at http://localhost:8501"

# Stop all services
down:
	docker-compose down

# Show logs
logs:
	docker-compose logs -f

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

dev-frontend:
	cd frontend && pip install -r requirements.txt && streamlit run app.py

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
