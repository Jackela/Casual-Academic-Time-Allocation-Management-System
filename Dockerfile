FROM eclipse-temurin:21-jre AS runtime

ENV APP_HOME=/opt/app \
    JAVA_OPTS=""
WORKDIR ${APP_HOME}

# Copy built jar from build context (expect user to run ./gradlew bootJar before docker build)
ARG JAR_PATH=build/libs/catams-1.0.0.jar
COPY ${JAR_PATH} app.jar

# Health and runtime configuration via env
ENV SERVER_PORT=8080 \
    JWT_SECRET="" \
    SPRING_PROFILES_ACTIVE=dev

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -Dserver.port=$SERVER_PORT -Dspring.security.jwt.secret=$JWT_SECRET -Dspring.profiles.active=$SPRING_PROFILES_ACTIVE -jar app.jar"]

