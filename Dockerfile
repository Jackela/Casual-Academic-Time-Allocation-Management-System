FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app

# Runtime-only image.
# The jar is built on host by CI/pre-push gates before docker-compose starts.
COPY build/libs/*.jar /app/app.jar

# Expose both common ports (8080 for docker profile, 8084 for e2e-local)
EXPOSE 8080 8084

# Default profile can be overridden via SPRING_PROFILES_ACTIVE
ENV SPRING_PROFILES_ACTIVE=docker

ENTRYPOINT ["java","-jar","/app/app.jar"]
