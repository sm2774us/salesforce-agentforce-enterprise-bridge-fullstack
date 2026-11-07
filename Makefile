.PHONY: install lint test demo bench live serve docker ui-install ui-build ui-dev ui-test ui-e2e ui
install:; pip install -e ".[dev]"
lint:; ruff check src tests && ruff format --check src tests
test:; pytest
demo:; bridge demo
bench:; bridge bench -n 2000
live:; bridge demo --live
serve:; bridge serve
docker:; docker build -t agentforce-bridge .
FRONTEND_STAMP := frontend/node_modules/.package-lock.json
$(FRONTEND_STAMP): frontend/package-lock.json frontend/package.json
	cd frontend && npm ci --no-audit --no-fund
ui-install: $(FRONTEND_STAMP)
ui-build: ui-install
	cd frontend && npm run build
ui-dev: ui-install
	cd frontend && npm run dev
ui-test: ui-install
	cd frontend && npm test
ui-e2e: ui-install
	cd frontend && npm run e2e
ui: ui-build
	bridge serve --demo
