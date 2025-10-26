## Multi-stage build for Spring Boot (Gradle) app

FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace

# Copy Gradle wrapper and project files
COPY gradlew gradlew
COPY gradle gradle
COPY build.gradle.kts settings.gradle.kts ./
COPY src src
COPY schema schema
COPY tools tools

# Ensure wrapper is executable
RUN chmod +x gradlew

# Install Node.js (required for contract generation task)
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | tee /etc/apt/keyrings/nodesource.gpg > /dev/null \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends nodejs \
    && node --version \
    && npm --version \
    && rm -rf /var/lib/apt/lists/*

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
