FROM eclipse-temurin:21-jdk AS build

ENV APP_HOME=/workspace
WORKDIR ${APP_HOME}

# Install Node.js (required for Gradle Exec task that runs contracts pipeline)
RUN apt-get update \
    && apt-get install -y curl ca-certificates gnupg unzip \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Copy Gradle wrapper and build configuration
COPY settings.gradle.kts build.gradle.kts gradle.properties ./

# Install Node dependencies required by contracts pipeline (quicktype-core)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --prefer-offline --fund=false

# Copy project sources needed for build
COPY src/ src/
COPY schema/ schema/
COPY tools/ tools/
COPY docs/ docs/
COPY frontend/ frontend/

# Install specific Gradle distribution (avoid relying on wrapper jar in context)
ENV GRADLE_VERSION=8.7 \
    GRADLE_HOME=/opt/gradle/gradle-8.7 \
    PATH=/opt/gradle/gradle-8.7/bin:$PATH
RUN set -eux; \
    curl -fsSL https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip -o /tmp/gradle.zip; \
    mkdir -p /opt/gradle; \
    unzip -q /tmp/gradle.zip -d /opt/gradle; \
    rm -f /tmp/gradle.zip

# Build Spring Boot fat jar using installed Gradle
RUN gradle --version && gradle --no-daemon clean bootJar

# Normalize jar path to a fixed location
RUN JAR_PATH=$(ls build/libs/*.jar | head -n 1) && cp "$JAR_PATH" app.jar

FROM eclipse-temurin:21-jre AS runtime

ENV APP_HOME=/opt/app \
    JAVA_OPTS=""
WORKDIR ${APP_HOME}

# Copy built jar from builder stage
COPY --from=build /workspace/app.jar app.jar

# Health and runtime configuration via env
ENV SERVER_PORT=8080 \
    JWT_SECRET="" \
    SPRING_PROFILES_ACTIVE=docker

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -Dserver.port=$SERVER_PORT -Dspring.security.jwt.secret=$JWT_SECRET -Dspring.profiles.active=$SPRING_PROFILES_ACTIVE -jar app.jar"]

