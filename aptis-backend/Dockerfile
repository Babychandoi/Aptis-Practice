# ---------------------------------------------------------------------
# Stage 1: build
# ---------------------------------------------------------------------
FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /build

# Copy settings + pom trước để tầng tải dependency được cache riêng:
# sửa code không phải tải lại toàn bộ dependency.
COPY .mvn/settings.xml .mvn/settings.xml
COPY pom.xml .
RUN mvn -B -s .mvn/settings.xml dependency:go-offline -DskipTests

COPY src ./src
RUN mvn -B -s .mvn/settings.xml clean package -DskipTests

# ---------------------------------------------------------------------
# Stage 2: runtime
# ---------------------------------------------------------------------
FROM eclipse-temurin:17-jre-alpine

# Chạy bằng user không phải root
RUN addgroup -S aptis && adduser -S aptis -G aptis

WORKDIR /app

# curl cho healthcheck; tzdata để log đúng giờ khi cần
RUN apk add --no-cache curl tzdata

COPY --from=build /build/target/*.jar app.jar
RUN chown -R aptis:aptis /app

USER aptis

EXPOSE 8080

# MaxRAMPercentage để JVM tôn trọng memory limit của container
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+UseG1GC -Duser.timezone=UTC"

# 127.0.0.1 thay vì localhost để không phụ thuộc thứ tự resolve IPv4/IPv6
HEALTHCHECK --interval=15s --timeout=5s --start-period=90s --retries=5 \
    CMD curl -fsS http://127.0.0.1:8080/actuator/health/readiness || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
