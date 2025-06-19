# Portugal Running CLI - Makefile
# Development automation and quality assurance commands

.PHONY: help install lint format black ruff-format typecheck test clean dev-setup all-checks

# Default target
help:
	@echo "Portugal Running CLI - Available Commands:"
	@echo ""
	@echo "Setup & Installation:"
	@echo "  install       Install dependencies with uv"
	@echo "  dev-setup     Complete development environment setup"
	@echo ""
	@echo "Code Quality:"
	@echo "  lint          Run ruff linter"
	@echo "  format        Format code with both ruff and black"
	@echo "  black         Format code with black only"
	@echo "  ruff-format   Format code with ruff only"
	@echo "  typecheck     Run mypy type checking"
	@echo "  all-checks    Run all quality checks (lint, format, typecheck)"
	@echo ""
	@echo "Testing:"
	@echo "  test          Run basic functionality tests"
	@echo "  test-scrape   Test scrape command with small dataset"
	@echo ""
	@echo "Maintenance:"
	@echo "  clean         Clean cache files and temporary data"
	@echo "  clean-cache   Clear all application caches"
	@echo ""

# Development setup
install:
	@echo "📦 Installing dependencies with uv..."
	uv sync

dev-setup: install
	@echo "🛠️  Setting up development environment..."
	@echo "✅ Development environment ready!"
	@echo "💡 Remember to set GOOGLE_MAPS_API_KEY environment variable if using geocoding"

# Code quality
lint:
	@echo "🔍 Running ruff linter..."
	uv run ruff check portugal-running-cli.py --fix

format: ruff-format black
	@echo "✅ Code formatting completed with both ruff and black!"

black:
	@echo "🎨 Formatting code with black..."
	uv run black portugal-running-cli.py --line-length 120 --target-version py39

ruff-format:
	@echo "🎨 Formatting code with ruff..."
	uv run ruff format portugal-running-cli.py

typecheck:
	@echo "🔍 Running mypy type checker..."
	uv run mypy portugal-running-cli.py --ignore-missing-imports --no-strict-optional

all-checks: lint format typecheck
	@echo "✅ All code quality checks completed!"

# Testing
test:
	@echo "🧪 Running basic functionality tests..."
	@echo "Testing CLI help..."
	python3 portugal-running-cli.py --help > /dev/null
	@echo "Testing subcommand help..."
	python3 portugal-running-cli.py scrape --help > /dev/null
	python3 portugal-running-cli.py cache --help > /dev/null
	@echo "Testing cache stats..."
	python3 portugal-running-cli.py cache stats
	@echo "✅ Basic tests passed!"

test-scrape:
	@echo "🧪 Testing scrape command with small dataset..."
	python3 portugal-running-cli.py scrape \
		--limit 3 \
		--pages 1 \
		--skip-geocoding \
		--skip-descriptions \
		--output test-output.json
	@echo "📊 Checking output..."
	@if [ -f test-output.json ]; then \
		echo "✅ Output file created successfully"; \
		echo "📈 Event count: $$(cat test-output.json | jq length)"; \
		rm test-output.json; \
	else \
		echo "❌ Output file not found"; \
		exit 1; \
	fi

# Maintenance
clean:
	@echo "🧹 Cleaning temporary files..."
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "test-*.json" -delete
	@echo "✅ Cleanup completed!"

clean-cache:
	@echo "🧹 Clearing application caches..."
	python3 portugal-running-cli.py cache clear
	@echo "✅ Cache cleanup completed!"

# Development workflow helpers
quick-check: lint typecheck
	@echo "⚡ Quick quality check completed!"

# CI/CD friendly target
ci: all-checks test
	@echo "🚀 CI checks completed successfully!"