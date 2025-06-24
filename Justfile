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
    npm run prebuild
    npm run build
    cp -r public/ .next/standalone
    cp -r .next/static .next/standalone/.next

scrape:
    cd scraper && uv run python portugal-running-cli.py scrape
    cp scraper/portugal-running-events.json public/events.json

scrape-and-deploy:
    cd scraper && uv run python portugal-running-cli.py scrape
    cp scraper/portugal-running-events.json public/events.json
    just build
    sudo systemctl restart portugal-run-server.service
