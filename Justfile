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

build-static:
    npm run build:data
    NEXT_PUBLIC_BUILD_TIMESTAMP="$(date -Iseconds)" npm run build
    rm -rf cloudflare/public/
    mkdir -p cloudflare/public/
    cp -r out/* cloudflare/public/

build:
    #!/usr/bin/env bash
    set -euo pipefail
    image="cr.d464.sh/portugal-running-calendar"
    date_tag="$(date +%F)"
    datetime_tag="$(date +%F-%H%M%S)"
    export NEXT_PUBLIC_BUILD_TIMESTAMP="$(date -Iseconds)"

    npm run build
    docker build -f Containerfile \
        -t "${image}:latest" \
        -t "${image}:${date_tag}" \
        -t "${image}:${datetime_tag}" \
        .
    docker push "${image}:latest"
    docker push "${image}:${date_tag}"
    docker push "${image}:${datetime_tag}"

deploy: build-static
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
