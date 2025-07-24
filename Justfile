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
    npm run build:data
    npm run build
    cp -r out/* cloudflare/public/

deploy: build
    cd cloudflare && npm run deploy
