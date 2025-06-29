default:
    just --list

stop:
    demon stop dev

dev:
    demon stop dev
    demon run dev npm run dev

logs:
    demon cat dev

tail:
    demon tail -f dev

lint:
    npm run lint

serve:
    cd .next && PORT=3000 node standalone/server.js

build:
    npm run build
    cp -r public/ .next/standalone
    cp -r .next/static .next/standalone/.next

scrape:
    cd scraper && uv run python portugal-running-cli.py scrape
    rm -rf public/events && cp -r scraper/events public/
    mkdir -p public/media && cp -r scraper/media/* public/media/ 2>/dev/null || true

