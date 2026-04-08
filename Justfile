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

build-image:
    #!/usr/bin/env bash
    set -euo pipefail
    image="cr.d464.sh/portugal-running-calendar"
    date_tag="$(date +%F)"
    datetime_tag="$(date +%F-%H%M%S)"
    
    docker build -f Containerfile \
        -t "${image}:latest" \
        -t "${image}:${date_tag}" \
        -t "${image}:${datetime_tag}" \
        .
    docker push "${image}:latest"
    docker push "${image}:${date_tag}"
    docker push "${image}:${datetime_tag}"

update-data:
    cd portugal-running-data && git pull
    git add portugal-running-data
    git commit -m "updated portugal-running-data submodule" || true

build: update-data build-static build-image
    git push

ci: build
    podman run -itd --restart=always -p 42157:80 --pull=always --name portugal-running-calendar --replace cr.d464.sh/portugal-running-calendar:latest
