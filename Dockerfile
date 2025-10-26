## Multi-stage build for Spring Boot (Gradle) app

FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace

# Install Node.js (required for contract generation task)
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && node --version \
    && npm --version \
    && rm -rf /var/lib/apt/lists/*

# Copy Gradle wrapper and project files
COPY gradlew gradlew
COPY gradle gradle
COPY build.gradle.kts settings.gradle.kts ./
# Copy repo-level package manifests and install Node deps used by generators
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY src src
COPY schema schema
COPY tools tools

# Ensure wrapper is executable
RUN chmod +x gradlew

# Build fat jar without running tests (E2E will validate).
# Generate contracts to satisfy compile inputs inside container.
RUN ./gradlew --no-daemon clean generateContracts bootJar -x test

FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app

# Copy artifact
COPY --from=build /workspace/build/libs/*.jar /app/app.jar

# Expose both common ports (8080 for docker profile, 8084 for e2e-local)
EXPOSE 8080 8084

# Default profile can be overridden via SPRING_PROFILES_ACTIVE
ENV SPRING_PROFILES_ACTIVE=docker

ENTRYPOINT ["java","-jar","/app/app.jar"]
