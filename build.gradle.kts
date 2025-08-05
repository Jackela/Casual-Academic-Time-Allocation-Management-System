plugins {
    java
    id("org.springframework.boot") version "3.2.0"
    id("io.spring.dependency-management") version "1.1.4"
    id("org.openapi.generator") version "7.5.0" // Core: Add OpenAPI Generator plugin
    jacoco
    id("com.github.node-gradle.node") version "7.0.2" // 1. Introduce node-gradle plugin
}

group = "com.usyd"
version = "1.0.0"
description = "CATAMS"
java.sourceCompatibility = JavaVersion.VERSION_17

// Suppress deprecation warnings for intentional @Deprecated usage
tasks.withType<JavaCompile> {
    options.compilerArgs.addAll(listOf(
        "-Xlint:all",
        "-Xlint:-deprecation",  // Suppress deprecation warnings
        "-Xlint:-unchecked",    // Suppress unchecked warnings
        "-Xlint:-serial"        // Suppress serialization warnings
    ))
}

repositories {
    mavenCentral()
    maven { url = uri("https://packages.confluent.io/maven/") }
}

val javaParserVersion = "3.26.0" // Use latest version
val jacksonVersion = "2.15.3"

configurations {
    // Create a dedicated configuration to store dependencies for our generator tool
    create("contractGenerator")
}

dependencies {
    // Spring Boot Starters
    implementation(libs.org.springframework.boot.spring.boot.starter.web)
    implementation(libs.org.springframework.boot.spring.boot.starter.data.jpa)
    implementation(libs.org.springframework.boot.spring.boot.starter.security)
    implementation(libs.org.springframework.boot.spring.boot.starter.validation)
    implementation(libs.org.springframework.boot.spring.boot.starter.actuator)

    // Database
    runtimeOnly(libs.org.postgresql.postgresql)
    // E2E runtime Testcontainers (self-managed DB for e2e profile)
    implementation(libs.org.testcontainers.testcontainers)
    implementation(libs.org.testcontainers.postgresql)
    // Testcontainers JDBC driver to enable jdbc:tc:postgresql URL in e2e
    implementation("org.testcontainers:jdbc:1.19.1")
    // Embedded PostgreSQL for E2E testing
    implementation("io.zonky.test:embedded-postgres:2.0.4")
    

    // JWT
    implementation(libs.io.jsonwebtoken.jjwt.api)
    runtimeOnly(libs.io.jsonwebtoken.jjwt.impl)
    runtimeOnly(libs.io.jsonwebtoken.jjwt.jackson)

    // Development Tools
    developmentOnly(libs.org.springframework.boot.spring.boot.devtools)

    // Core: JSON Schema Validator for response contract testing
    testImplementation("com.networknt:json-schema-validator:1.4.0")
    // Core: YAML parser for schema extraction task
    testImplementation("org.yaml:snakeyaml:2.2")
    // Keep test Jackson managed by Spring Boot BOM (avoid explicit version overrides)

    // Add dependencies for our generator tool
    "contractGenerator"("com.github.javaparser:javaparser-core:$javaParserVersion")
    "contractGenerator"("com.fasterxml.jackson.core:jackson-databind:$jacksonVersion")

    // Add for compilation of ContractGenerator.java
    implementation("com.github.javaparser:javaparser-core:$javaParserVersion")
    implementation("com.fasterxml.jackson.core:jackson-databind:$jacksonVersion")

    // Monitoring and Metrics
    implementation(libs.io.micrometer.micrometer.core)
    
    // Testing
    testImplementation(libs.org.springframework.boot.spring.boot.starter.test)
    testImplementation(libs.org.springframework.security.spring.security.test)
    testImplementation(libs.org.testcontainers.junit.jupiter)
    testImplementation(libs.org.testcontainers.postgresql)
    testImplementation(libs.org.testcontainers.testcontainers)
    
    // Performance Testing
    testImplementation(libs.org.apache.httpcomponents.client5.httpclient5)
    testImplementation(libs.org.junit.platform.junit.platform.launcher)
    
    // OpenAPI Testing
    testImplementation(libs.com.atlassian.oai.swagger.request.validator.mockmvc)
    testImplementation(libs.io.swagger.parser.v3.swagger.parser)

    // Karate DSL for API Testing
    testImplementation("io.karatelabs:karate-junit5:1.5.1")
}

// 2. Configure node-gradle
node {
    version.set("20.11.1") // Specify Node.js version
    npmVersion.set("10.2.4") // Specify npm version
    download.set(true) // Auto download and install
}

// 3. Define a task to install Redocly CLI
tasks.register<com.github.gradle.node.npm.task.NpmTask>("installRedocly") {
    group = "Documentation"
    description = "Installs Redocly CLI locally using npm."
    // Install Redocly CLI to the project's local node_modules directory
    args.set(listOf("install", "@redocly/cli@latest"))
}

// 4. Define a task to run Redocly CLI bundle command
tasks.register<com.github.gradle.node.npm.task.NpxTask>("bundleOpenApiSpec") {
    group = "Documentation"
    description = "Bundles the distributed OpenAPI spec into a single file using Redocly CLI."
    
    // Ensure Redocly CLI is already installed
    dependsOn("installRedocly")

    // 'npx redocly bundle path/to/your/main.yaml -o build/docs/api/openapi.yaml'
    command.set("redocly")
    args.set(listOf(
        "bundle",
        "docs/openapi.yaml", // Your main entry YAML file
        "--output",
        "$buildDir/docs/api/openapi.yaml"
    ))
}

// Core: Configure the OpenAPI Generator task
openApiGenerate {
    generatorName.set("java")
    inputSpec.set("$projectDir/docs/openapi.yaml")
    outputDir.set("$buildDir/generated/openapi")
    apiPackage.set("com.usyd.catams.client.api")
    modelPackage.set("com.usyd.catams.client.model")
    configOptions.set(mapOf(
        "library" to "native",
        "useJakartaEe" to "true",
        "openApiNullable" to "false",
        "sourceFolder" to "src/main/java"
    ))
}

// Core: Task to extract schemas from OpenAPI spec into individual JSON files
tasks.register("extractOpenApiSchemas") {
    group = "OpenAPI"
    description = "Extracts component schemas from openapi.yaml into individual JSON files."

    doLast {
        val openApiFile = file("$projectDir/docs/openapi.yaml")
        val outputDir = file("$buildDir/resources/test/openapi/schemas")
        if (!outputDir.exists()) {
            outputDir.mkdirs()
        }

        val yaml = org.yaml.snakeyaml.Yaml()
        val openApiData = yaml.load<Map<String, Any>>(openApiFile.inputStream())
        val components = openApiData["components"] as? Map<String, Any>
        val schemas = components?.get("schemas") as? Map<String, Any>

        if (schemas != null) {
            val objectMapper = com.fasterxml.jackson.databind.ObjectMapper().enable(com.fasterxml.jackson.databind.SerializationFeature.INDENT_OUTPUT)
            schemas.forEach { (schemaName, schemaData) ->
                val schemaFile = file("$outputDir/$schemaName.json")
                schemaFile.writeText(objectMapper.writeValueAsString(schemaData))
                println("Extracted schema: $schemaName.json")
            }
        } else {
            println("No schemas found in components.")
        }
    }
}

// 2. Create a custom Gradle task to run ContractGenerator
tasks.register<JavaExec>("generateSemanticContract") {
    group = "Documentation"
    description = "Generates a machine-readable JSON file of the project's semantic contract."
    
    // Specify the classpath for our generator tool
    classpath = configurations.getByName("contractGenerator")
    
    // Specify the compiled output directory containing ContractGenerator.java
    // Assuming you place this utility class in a separate 'generator' source set, or compile it with the main code
    classpath += sourceSets.main.get().output
    
    // Specify the main class to run
    mainClass.set("com.usyd.catams.tools.ContractGenerator")
    
    // Pass arguments, such as source file directory and output file path
    args(
        "--source", file("src/main/java").absolutePath,
        "--output", file("$buildDir/docs/api/contract.json").absolutePath
    )
    
    // Ensure output directory exists
    doFirst {
        file("$buildDir/docs/api").mkdirs()
    }
}


tasks.withType<Test> {
    useJUnitPlatform()
    dependsOn("extractOpenApiSchemas") // Ensure schemas are extracted before tests run
    finalizedBy(tasks.jacocoTestReport)
}

jacoco {
    toolVersion = "0.8.10"
}

tasks.jacocoTestReport {
    dependsOn(tasks.test)
    reports {
        xml.required = true
        html.required = true
    }
}

tasks.withType<ProcessResources> {
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
}

sourceSets {
    main {
        java {
            // Core: Add generated sources to the main source set
            srcDir("$buildDir/generated/openapi/src/main/java")
        }
        resources {
            srcDirs("src/main/resources")
        }
    }
    test {
        resources {
            srcDirs("src/test/java", "src/test/resources", "docs")
            include("**/*.yaml", "**/*.yml", "**/*.md", "**/*.feature")
            exclude("**/*.java", "**/*.kt")
        }
    }
}
