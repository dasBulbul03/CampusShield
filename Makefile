# CampusShield - developer entry points
#
# Run `make` (or `make help`) to list targets. Anything that needs the
# virtualenv will tell you to run `make setup` rather than failing cryptically.

SHELL         := /bin/bash
.DEFAULT_GOAL := help

BACKEND       := backend
FRONTEND      := frontend
VENV          := $(BACKEND)/venv
PY            := $(CURDIR)/$(VENV)/bin/python
PIP           := $(CURDIR)/$(VENV)/bin/pip
COMPOSE       := docker compose

BACKEND_URL   := http://localhost:8000
FRONTEND_URL  := http://localhost:8080

OK  := \033[32m
WRN := \033[33m
ERR := \033[31m
DIM := \033[2m
OFF := \033[0m

.PHONY: help setup env install install-backend install-frontend \
        dev-backend dev-frontend lint build test cov migrate \
        up down build-docker logs ps destroy scan health ci doctor clean

## ---------------------------------------------------------------------------
## Setup
## ---------------------------------------------------------------------------

help: ## List all targets
	@printf "CampusShield\n\n"
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'
	@printf "\n$(DIM)Default ports: backend $(BACKEND_URL) · frontend $(FRONTEND_URL)$(OFF)\n"

setup: env install ## One-time setup: .env files + all dependencies
	@printf "\n$(OK)Ready. Try: make dev-backend  (and make dev-frontend in another terminal)$(OFF)\n"

env: ## Create .env files from the examples (existing files are never overwritten)
	@for f in .env backend/.env frontend/.env; do \
		src="$$f.example"; \
		if [ -f "$$f" ]; then \
			printf "$(DIM)  skip   %s (already exists)$(OFF)\n" "$$f"; \
		elif [ -f "$$src" ]; then \
			cp "$$src" "$$f"; \
			printf "$(OK)  create %s$(OFF)\n" "$$f"; \
		fi; \
	done
	@printf "$(WRN)  NOTE: GEMINI_API_KEY is left empty on purpose. See README#gemini-api-key-optional$(OFF)\n"

install: install-backend install-frontend ## Install backend + frontend dependencies

install-backend: $(VENV)/bin/python ## Install backend Python dependencies
	@printf "$(OK)==> backend: pip install$(OFF)\n"
	$(PIP) install --quiet --upgrade pip
	$(PIP) install --quiet -r $(BACKEND)/requirements.txt -r $(BACKEND)/requirements-dev.txt

install-frontend: ## Install frontend npm dependencies
	@printf "$(OK)==> frontend: npm ci$(OFF)\n"
	cd $(FRONTEND) && npm ci

$(VENV)/bin/python:
	@printf "$(OK)==> Creating virtualenv at $(VENV)$(OFF)\n"
	python3 -m venv $(VENV)

require-venv:
	@test -x $(PY) || { \
		printf "$(ERR)No virtualenv at $(VENV).$(OFF)\n"; \
		printf "Run: make setup\n"; \
		exit 1; \
	}

## ---------------------------------------------------------------------------
## Backend
## ---------------------------------------------------------------------------

dev-backend: require-venv ## Run the FastAPI server with hot reload
	@printf "$(OK)==> uvicorn --reload on $(BACKEND_URL)$(OFF)\n"
	cd $(BACKEND) && $(PY) -m uvicorn app.main:app --reload --port 8000

test-backend: require-venv ## Run the backend test suite
	@printf "$(OK)==> pytest$(OFF)\n"
	cd $(BACKEND) && $(PY) -m pytest

cov: require-venv ## Run backend tests with coverage
	@printf "$(OK)==> pytest --cov$(OFF)\n"
	cd $(BACKEND) && $(PY) -m pytest --cov=app --cov-report=term-missing

migrate: require-venv ## Apply Alembic migrations, then seed departments and demo users
	@printf "$(OK)==> alembic upgrade head + seed$(OFF)\n"
	cd $(BACKEND) && $(PY) -m alembic upgrade head && $(PY) -m app.db.init_db

## ---------------------------------------------------------------------------
## Frontend
## ---------------------------------------------------------------------------

dev-frontend: ## Run the Vite dev server
	@printf "$(OK)==> vite on $(FRONTEND_URL)$(OFF)\n"
	cd $(FRONTEND) && npm run dev

lint: ## Run ESLint
	@printf "$(OK)==> eslint$(OFF)\n"
	cd $(FRONTEND) && npm run lint

build: ## Production frontend build
	@printf "$(OK)==> vite build$(OFF)\n"
	cd $(FRONTEND) && npm run build

## ---------------------------------------------------------------------------
## Docker
## ---------------------------------------------------------------------------

up: ## Build and start the full stack in the background
	@printf "$(OK)==> docker compose up --build -d$(OFF)\n"
	$(COMPOSE) up --build -d
	@printf "\nFrontend $(FRONTEND_URL) · API $(BACKEND_URL) · docs $(BACKEND_URL)/docs\n"

down: ## Stop the stack (data is kept)
	$(COMPOSE) down

build-docker: ## Build images without starting anything
	$(COMPOSE) build

logs: ## Tail backend + frontend logs
	$(COMPOSE) logs -f --tail=100

ps: ## Show container status
	$(COMPOSE) ps

destroy: ## Stop the stack AND delete the database volume (DATA LOSS)
ifeq ($(CONFIRM),yes)
	$(COMPOSE) down -v --remove-orphans
else
	$(error Destructive: this deletes the Postgres volume and all local data. Re-run as: make destroy CONFIRM=yes)
endif

## ---------------------------------------------------------------------------
## Quality
## ---------------------------------------------------------------------------

test: test-backend lint build ## Backend tests + frontend lint + production build

ci: test ## Approximate what GitHub Actions runs locally
	@printf "$(OK)Local CI checks passed$(OFF)\n"

scan: ## Trivy scan of the backend image, failing on CRITICAL
	@printf "$(OK)==> building image for scan$(OFF)\n"
	docker build --quiet -t campusshield-backend:local $(BACKEND) >/dev/null
	@printf "$(OK)==> trivy (fails on CRITICAL)$(OFF)\n"
	docker run --rm \
		-v /var/run/docker.sock:/var/run/docker.sock \
		-v $(HOME)/.trivy:/root/.cache/aquasecurity \
		ghcr.io/aquasecurity/trivy:latest image \
		--severity CRITICAL --ignore-unfixed --exit-code 1 --scanners vuln \
		campusshield-backend:local

health: ## Probe local liveness and readiness endpoints
	@printf "liveness  (/health)       : "
	@curl -fsS $(BACKEND_URL)/health && echo || printf "$(ERR)unreachable$(OFF)\n"
	@printf "readiness (/health/ready) : "
	@curl -fsS $(BACKEND_URL)/health/ready && echo || printf "$(ERR)unreachable$(OFF)\n"

## ---------------------------------------------------------------------------
## Housekeeping
## ---------------------------------------------------------------------------

clean: ## Remove Python and Vite build caches (keeps venv and node_modules)
	find $(BACKEND) -type d -name __pycache__ -prune -exec rm -rf {} + 2>/dev/null || true
	rm -rf $(BACKEND)/.pytest_cache $(BACKEND)/.coverage $(FRONTEND)/dist
	@printf "$(OK)Caches removed$(OFF)\n"

doctor: ## Report what is installed and what is missing
	@printf "make          : $(shell make --version | head -1)\n"
	@printf "python3       : $$(python3 --version 2>&1)\n"
	@printf "backend venv  : $$(test -x $(PY) && $(PY) --version 2>&1 || echo 'missing (make setup)')\n"
	@printf "node / npm    : $$(node --version 2>&1)/$$(npm --version 2>&1)\n"
	@printf "docker        : $$(docker version --format '{{.Server.Version}}' 2>/dev/null || echo 'missing')\n"
	@printf "compose       : $$(docker compose version --short 2>/dev/null || echo 'missing')\n"
	@printf ".env          : $$(test -f .env && echo present || echo 'missing (make env)')\n"
	@printf "backend/.env  : $$(test -f backend/.env && echo present || echo 'missing (make env)')\n"
