FROM eclipse-temurin:17-jdk

WORKDIR /app

COPY backend /app

RUN apt-get update && apt-get install -y maven

RUN mvn clean package -DskipTests

CMD ["java", "-jar", "target/erp-accounting-1.0.0.jar"]
