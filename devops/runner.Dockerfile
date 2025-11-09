FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y \
    curl git unzip ca-certificates build-essential \
    openjdk-21-jdk \
    nodejs npm \
    docker.io docker-compose-plugin \
  && rm -rf /var/lib/apt/lists/*

# Optional: modern package managers
RUN npm -g i pnpm@9 yarn@1 && corepack enable || true

WORKDIR /workspace

