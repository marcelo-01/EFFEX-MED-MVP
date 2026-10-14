# Imagem única: o Spring Boot serve a API, o WebSocket e o frontend React já compilado.

# 1) Build do frontend (React + Vite)
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# 2) Build do backend (o pom inclui ../frontend/dist como recursos estáticos)
FROM maven:3.9-eclipse-temurin-21 AS backend
WORKDIR /app/backend
COPY backend/pom.xml ./
RUN mvn -q -B dependency:go-offline
COPY backend/src ./src
COPY --from=frontend /app/frontend/dist /app/frontend/dist
RUN mvn -q -B -DskipTests package

# 3) Runtime
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=backend /app/backend/target/effex-med-api-*.jar app.jar
VOLUME /app/data
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
