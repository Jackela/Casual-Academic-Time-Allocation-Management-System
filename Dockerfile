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

# Build fat jar without running tests (E2E will validate)
# Skip Node-dependent contract generation during container build; E2E validates at runtime
RUN ./gradlew --no-daemon clean bootJar -x test -x generateContracts -x verifyContracts

FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app

# Copy artifact
COPY --from=build /workspace/build/libs/*.jar /app/app.jar

# Expose both common ports (8080 for docker profile, 8084 for e2e-local)
EXPOSE 8080 8084

# Default profile can be overridden via SPRING_PROFILES_ACTIVE
ENV SPRING_PROFILES_ACTIVE=docker

ENTRYPOINT ["java","-jar","/app/app.jar"]
