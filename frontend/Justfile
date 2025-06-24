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

build:
    npm run build

start:
    node .next/standalone/server.js

start-daemon:
    demon stop prod
    demon run prod node .next/standalone/server.js

stop-prod:
    demon stop prod
