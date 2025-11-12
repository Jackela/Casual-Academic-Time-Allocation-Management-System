# Makefile for CATAMS Local CI Parity
# See openspec/changes/establish-local-ci-parity/ for design documentation

.PHONY: help fast ci-local ci clean install-hooks

# Default target - show help
help:
	@echo "Available make targets:"
	@echo ""
	@echo "  make help        Show this help message"
	@echo "  make fast        Quick validation (unit tests + lint only)"
	@echo "  make ci-local    Run all CI checks locally (recommended before push)"
	@echo "  make ci          Run CI in act container (most accurate GitHub Actions simulation)"
	@echo "  make clean       Clean build artifacts"
	@echo "  make install-hooks  Install optional pre-push git hook"
	@echo ""
	@echo "Recommended workflow:"
	@echo "  1. During development: make fast"
	@echo "  2. Before committing:  make ci-local"
	@echo "  3. Before pushing:     make ci (optional but recommended)"
	@echo "  4. Push only if all pass"

# Quick feedback loop - unit tests and lint only (< 2 minutes)
fast:
	@echo "========================================="
	@echo "Running FAST checks (unit tests + lint)"
	@echo "========================================="
	@echo ""
	@echo "[1/2] Backend unit tests..."
	./gradlew test --no-daemon
	@echo ""
	@echo "[2/2] Frontend lint..."
	cd frontend && npm run lint
	@echo ""
	@echo "========================================="
	@echo "✅ FAST checks passed!"
	@echo "========================================="

# Complete local CI - matches GitHub Actions (fail fast)
ci-local:
	@echo "========================================="
	@echo "Running COMPLETE CI checks locally"
	@echo "========================================="
	@echo ""
	@echo "[1/7] Clean build artifacts..."
	./gradlew clean
	@echo ""
	@echo "[2/7] Backend unit tests..."
	./gradlew test --no-daemon
	@echo ""
	@echo "[3/7] Backend integration tests..."
	./gradlew integrationTest --no-daemon
	@echo ""
	@echo "[4/7] Backend check (includes spotbugs, pmd, etc)..."
	./gradlew check --no-daemon
	@echo ""
	@echo "[5/7] Frontend lint..."
	cd frontend && npm run lint
	@echo ""
	@echo "[6/7] Frontend tests..."
	cd frontend && npm test
	@echo ""
	@echo "[7/7] Frontend build..."
	cd frontend && npm run build
	@echo ""
	@echo "========================================="
	@echo "✅ ALL CI checks passed locally!"
	@echo "You can now push with confidence."
	@echo "========================================="

# Run CI in act container (exact GitHub Actions simulation)
ci:
	@echo "========================================="
	@echo "Running CI in act container (GitHub Actions simulation)"
	@echo "========================================="
	@echo ""
	@if ! command -v act > /dev/null 2>&1; then \
		echo "❌ ERROR: 'act' is not installed"; \
		echo ""; \
		echo "Install act:"; \
		echo "  - macOS:   brew install act"; \
		echo "  - Linux:   See https://github.com/nektos/act#installation"; \
		echo "  - Windows: choco install act-cli"; \
		echo ""; \
		exit 1; \
	fi
	@if [ ! -f .actrc ]; then \
		echo "Creating .actrc configuration..."; \
		echo '-P ubuntu-latest=catthehacker/ubuntu:act-latest' > .actrc; \
	fi
	@echo "Running GitHub Actions workflow locally with act..."
	@echo ""
	act pull_request -j backend --env JWT_SECRET=test-secret
	@echo ""
	@echo "========================================="
	@echo "✅ Act simulation complete!"
	@echo "========================================="

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	./gradlew clean
	@if [ -d frontend/node_modules/.vite ]; then rm -rf frontend/node_modules/.vite; fi
	@if [ -d frontend/dist ]; then rm -rf frontend/dist; fi
	@echo "✅ Clean complete"

# Install optional pre-push hook
install-hooks:
	@echo "Installing pre-push hook..."
	@if [ ! -f tools/git/pre-push ]; then \
		echo "❌ ERROR: tools/git/pre-push not found"; \
		echo "Create it first with:"; \
		echo "  mkdir -p tools/git"; \
		echo "  # Create the pre-push script"; \
		exit 1; \
	fi
	@mkdir -p .git/hooks
	@cp tools/git/pre-push .git/hooks/pre-push
	@chmod +x .git/hooks/pre-push
	@echo "✅ Pre-push hook installed successfully!"
	@echo ""
	@echo "The hook will run 'make fast' before each push."
	@echo "To remove: rm .git/hooks/pre-push"
