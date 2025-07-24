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
    rm -rf cloudflare/public/
    mkdir -p cloudflare/public/
    cp -r out/* cloudflare/public/

deploy: build
    cd cloudflare && npm run deploy

ci:
    # required env vars
    # CLOUDFLARE_ACCOUNT_ID
    # CLOUDFLARE_API_TOKEN
    npm install
    cd cloudflare && npm install
    cd portugal-running-data && git fetch --all && git switch main
    git add portugal-running-data
    git commit -m "updated portugal-running-data submodule" || true
    git push
    just deploy
