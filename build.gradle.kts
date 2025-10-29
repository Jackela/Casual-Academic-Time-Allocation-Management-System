plugins {
    java
    id("org.springframework.boot") version "3.2.0"
    id("org.openapi.generator") version "7.7.0" // Core: Add OpenAPI Generator plugin (Gradle 9-ready)
    jacoco
    id("com.github.node-gradle.node") version "7.1.0" // 1. Introduce node-gradle plugin (Gradle 9 compat)
}

import org.springframework.boot.gradle.tasks.run.BootRun
import org.gradle.api.tasks.CacheableTask
import org.gradle.api.tasks.InputFile
import org.gradle.api.tasks.OutputDirectory
import org.gradle.api.tasks.PathSensitive
import org.gradle.api.tasks.PathSensitivity
import org.gradle.api.tasks.TaskAction
import org.gradle.api.file.RegularFileProperty
import org.gradle.api.file.DirectoryProperty
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.SerializationFeature



group = "com.usyd"
version = "1.0.0"
description = "CATAMS"
java.sourceCompatibility = JavaVersion.VERSION_21

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }
}

val schemaDirectory = layout.projectDirectory.dir("schema")
val contractsScript = layout.projectDirectory.file("tools/scripts/contracts-pipeline.cjs")
val contractsOutputDir = layout.buildDirectory.dir("generated-contracts")
val contractsLockFile = layout.projectDirectory.file("schema/contracts.lock")
val frontendContractsDir = layout.projectDirectory.dir("frontend/src/contracts/generated")

// Allow skipping contracts generation for faster feedback cycles
val skipContracts = providers.gradleProperty("skipContracts").map { it.equals("true", ignoreCase = true) }.orElse(false)

val generateContracts by tasks.registering(Exec::class) {
    group = "Contracts"
    description = "Generates Java and TypeScript contracts from JSON Schema sources."
    workingDir = layout.projectDirectory.asFile
    commandLine("node", contractsScript.asFile.absolutePath)
    environment(
        mapOf(
            "CONTRACTS_OUTPUT_DIR" to contractsOutputDir.get().asFile.absolutePath,
            "CONTRACTS_LOCK_FILE" to contractsLockFile.asFile.absolutePath,
        ),
    )
    inputs.files(fileTree(schemaDirectory) {
        include("*.schema.json")
    })
    outputs.dir(contractsOutputDir)
    outputs.dir(frontendContractsDir)
    outputs.file(contractsLockFile)
    onlyIf { !skipContracts.get() }
}

val verifyContracts by tasks.registering(Exec::class) {
    group = "Verification"
    description = "Verifies that schema fingerprints and generated TypeScript contracts are up-to-date."
    workingDir = layout.projectDirectory.asFile
    commandLine("node", contractsScript.asFile.absolutePath, "--verify")
    environment(
        mapOf(
            "CONTRACTS_OUTPUT_DIR" to contractsOutputDir.get().asFile.absolutePath,
            "CONTRACTS_LOCK_FILE" to contractsLockFile.asFile.absolutePath,
        ),
    )
    mustRunAfter(generateContracts)
    inputs.files(fileTree(schemaDirectory) {
        include("*.schema.json")
    })
    inputs.file(contractsLockFile)
    // Do not require frontend contracts directory to exist for verification; the script checks drift
    onlyIf { !skipContracts.get() }
}

tasks.check {
    dependsOn(verifyContracts)
}

tasks.withType<JavaCompile>().configureEach {
    dependsOn(generateContracts)
}

// Enforce modern API usage and fail on warnings to keep the codebase clean
tasks.withType<JavaCompile> {
    options.compilerArgs.addAll(listOf(
        "-Xlint:all"
    ))
    // Ensure target bytecode level is Java 21
    options.release.set(21)
}

// Improve test visibility in CI/terminal
tasks.withType<Test> {
    useJUnitPlatform()
    testLogging {
        events("passed", "skipped", "failed")
        showStandardStreams = true
        exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL
    }
    // Fail fast on first failure and keep tests responsive
    failFast = true
    // A conservative global timeout so hanging tests don't block CI/dev
    systemProperty("junit.jupiter.execution.timeout.default", "60s")
}

repositories {
    mavenCentral()
    maven { url = uri("https://packages.confluent.io/maven/") }
}

val javaParserVersion = "3.26.0" // Use latest version
val jacksonVersion = "2.15.3"
val antlrVersion = "4.10.1"

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
    // Flyway for database migrations in dev/docker environments (Flyway 10 modular DB support)
    implementation("org.flywaydb:flyway-core:10.17.0")
    implementation("org.flywaydb:flyway-database-postgresql:10.17.0")
    // E2E runtime Testcontainers (self-managed DB for e2e profile)
    implementation(libs.org.testcontainers.testcontainers)
    implementation(libs.org.testcontainers.postgresql)
    // Testcontainers JDBC driver to enable jdbc:tc:postgresql URL in e2e
    implementation("org.testcontainers:jdbc:1.19.1")
    // Removed Embedded PostgreSQL to enforce Testcontainers-only for E2E (fail fast)
    

    // JWT
    implementation(libs.io.jsonwebtoken.jjwt.api)
    runtimeOnly(libs.io.jsonwebtoken.jjwt.impl)
    runtimeOnly(libs.io.jsonwebtoken.jjwt.jackson)

    // Development Tools
    developmentOnly(libs.org.springframework.boot.spring.boot.devtools)

    // Core: JSON Schema Validator for response contract testing
    testImplementation("com.networknt:json-schema-validator:1.4.0")
    // Core: YAML parser for schema extraction task and reusable tooling
    implementation("org.yaml:snakeyaml:2.2")
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
    runtimeOnly("com.h2database:h2:2.2.224")
    testImplementation("com.h2database:h2:2.2.224")
    // ArchUnit for architecture rules
    testImplementation("com.tngtech.archunit:archunit-junit5:1.2.1")

    // Performance Testing
    testImplementation(libs.org.apache.httpcomponents.client5.httpclient5)
    testImplementation(libs.org.junit.platform.junit.platform.launcher)
    
    // OpenAPI Testing
    testImplementation(libs.com.atlassian.oai.swagger.request.validator.mockmvc)
    testImplementation(libs.io.swagger.parser.v3.swagger.parser)

    // Karate DSL for API Testing
    testImplementation("io.karatelabs:karate-junit5:1.5.1") {
        exclude(group = "org.antlr", module = "antlr4-runtime")
    }
    implementation("org.antlr:antlr4-runtime:$antlrVersion")
}

configurations.all {
    resolutionStrategy.eachDependency {
        if (requested.group == "org.antlr" && requested.name == "antlr4-runtime") {
            useVersion(antlrVersion)
            because("Align ANTLR runtime version with Hibernate-generated grammars to prevent tool/runtime mismatch")
        }
    }
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
    val bundledSpec = layout.buildDirectory.file("docs/api/openapi.yaml")
    args.set(listOf(
        "bundle",
        "docs/openapi.yaml", // Your main entry YAML file
        "--output",
        bundledSpec.get().asFile.absolutePath
    ))
}

// Core: Configure the OpenAPI Generator task
openApiGenerate {
    generatorName.set("java")
    inputSpec.set("$projectDir/docs/openapi.yaml")
    outputDir.set(layout.buildDirectory.dir("generated/openapi").get().asFile.absolutePath)
    apiPackage.set("com.usyd.catams.client.api")
    modelPackage.set("com.usyd.catams.client.model")
    configOptions.set(mapOf(
        "library" to "native",
        "useJakartaEe" to "true",
        "openApiNullable" to "false",
        "sourceFolder" to "src/main/java"
    ))
}

@CacheableTask
abstract class ExtractOpenApiSchemas : DefaultTask() {
    @get:InputFile
    @get:PathSensitive(PathSensitivity.RELATIVE)
    abstract val openApiFile: RegularFileProperty

    @get:OutputDirectory
    abstract val outputDirectory: DirectoryProperty

    @TaskAction
    fun extract() {
        val yaml = org.yaml.snakeyaml.Yaml()
        @Suppress("UNCHECKED_CAST")
        val openApiData = openApiFile.get().asFile.inputStream().use { input ->
            yaml.load<Map<String, Any?>>(input)
        } ?: emptyMap()

        val schemas = (openApiData["components"] as? Map<*, *>)?.get("schemas") as? Map<*, *> ?: emptyMap<Any?, Any?>()
        if (schemas.isEmpty()) {
            logger.info("No component schemas found in ${openApiFile.get().asFile}")
            return
        }

        val outputDir = outputDirectory.get().asFile.apply { mkdirs() }
        val objectMapper = ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT)

        schemas.forEach { (schemaName, schemaData) ->
            val name = schemaName?.toString() ?: return@forEach
            val schemaFile = outputDir.resolve("$name.json")
            schemaFile.writeText(objectMapper.writeValueAsString(schemaData))
            logger.info("Extracted OpenAPI schema: $name")
        }
    }
}

val extractOpenApiSchemas by tasks.register<ExtractOpenApiSchemas>("extractOpenApiSchemas") {
    group = "OpenAPI"
    description = "Extracts component schemas from openapi.yaml into individual JSON files."
    openApiFile.set(layout.projectDirectory.file("docs/openapi.yaml"))
    outputDirectory.set(layout.buildDirectory.dir("resources/test/openapi/schemas"))
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
    val sourceDir = layout.projectDirectory.dir("src/main/java")
    val contractOutput = layout.buildDirectory.file("docs/api/contract.json")
    args(
        "--source", sourceDir.asFile.absolutePath,
        "--output", contractOutput.get().asFile.absolutePath
    )
    
    // Ensure output directory exists
    doFirst {
        contractOutput.get().asFile.parentFile.mkdirs()
    }
}


tasks.withType<Test>().configureEach {
    dependsOn(extractOpenApiSchemas) // Ensure schemas are extracted before tests run
    finalizedBy(tasks.jacocoTestReport)
}

val integrationTest by tasks.registering(Test::class) {
    description = "Runs Spring integration tests with Testcontainers profile."
    group = "verification"
    testClassesDirs = sourceSets["test"].output.classesDirs
    classpath = sourceSets["test"].runtimeClasspath
    useJUnitPlatform()
    shouldRunAfter(tasks.test)
    include("**/integration/**", "**/*IntegrationTest.class", "**/*IT.class")
    systemProperty("spring.profiles.active", "integration-test")
}

// Ensure the unit test task excludes integration tests so we can iterate quickly
tasks.named<Test>("test") {
    // Exclude typical integration test patterns
    exclude("**/integration/**", "**/*IntegrationTest.class", "**/*IT.class")
}

tasks.check {
    dependsOn(integrationTest)
}

jacoco {
    toolVersion = "0.8.10"
}

tasks.jacocoTestReport {
    dependsOn(tasks.test)
    reports {
        xml.required.set(true)
        html.required.set(true)
    }

    // Exclude generated sources (OpenAPI client, semantic contracts) from coverage
    val excludes = listOf(
        "com/usyd/catams/client/**",      // OpenAPI generated
        "com/usyd/catams/contracts/**"    // Contract generator outputs (if packaged)
    )
    val javaMain = fileTree("${buildDir}/classes/java/main") { exclude(excludes) }
    val kotlinMain = fileTree("${buildDir}/classes/kotlin/main") { exclude(excludes) }
    classDirectories.setFrom(files(javaMain, kotlinMain))
}

// Conservative coverage verification to avoid flakiness; can be raised over time.
tasks.named<JacocoCoverageVerification>("jacocoTestCoverageVerification") {
    dependsOn(tasks.test)
    dependsOn(tasks.jacocoTestReport)
    executionData.setFrom(fileTree(layout.buildDirectory) { include("**/jacoco/test.exec", "**/jacoco/*.exec") })
    sourceDirectories.setFrom(files("src/main/java"))
    classDirectories.setFrom(tasks.jacocoTestReport.get().classDirectories)
    violationRules {
        rule {
            element = "BUNDLE"
            limit {
                counter = "LINE"
                value = "COVEREDRATIO"
                minimum = BigDecimal("0.50")
            }
        }
    }
}

tasks.check {
    dependsOn("jacocoTestCoverageVerification")
}

tasks.withType<ProcessResources> {
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
}

sourceSets {
    main {
        java {
            // Core: Add generated sources to the main source set
            srcDir(layout.buildDirectory.dir("generated/openapi/src/main/java"))
            srcDir(layout.buildDirectory.dir("generated-contracts/java"))
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

tasks.named<BootRun>("bootRun") {
    val activeProfiles = System.getenv("SPRING_PROFILES_ACTIVE") ?: ""
    val disableDevtools = System.getenv("DISABLE_DEVTOOLS") == "1" ||
        activeProfiles.split(',').map { it.trim().lowercase() }.any { it == "e2e" || it == "e2e-local" }
    systemProperty("spring.devtools.restart.enabled", "false")
    systemProperty("spring.devtools.livereload.enabled", "false")
    systemProperty("spring.devtools.add-properties", "false")
    doFirst {
        if (disableDevtools) {
            classpath = classpath.filter { !it.name.contains("spring-boot-devtools") }
        }
    }
}

// Clean-all task: removes all generated artifacts across backend and frontend
tasks.register("cleanAll") {
    group = "build"
    description = "Removes backend and frontend generated artifacts, reports and caches."
    notCompatibleWithConfigurationCache("Shells out to npm and deletes build directories")
    doLast {
        // Backend/build artifacts
        delete(
            file("build"),
            file("test-results"),
            // Contracts/OpenAPI generated
            file("build/generated-contracts"),
            file("build/generated/openapi")
        )

        // Frontend artifacts
        listOf(
            "frontend/dist",
            "frontend/coverage",
            "frontend/playwright-report",
            "frontend/playwright-screenshots",
            "frontend/test-results",
            "frontend/trace-inspect",
            "frontend/.vite",
            // Generated contracts synced into frontend
            "frontend/src/contracts/generated"
        ).forEach { path ->
            delete(file(path))
        }

        // Attempt to run frontend clean if package.json exists
        if (file("frontend/package.json").exists()) {
            try {
                exec {
                    workingDir = file("frontend")
                    // Use platform-specific npm command name
                    val npmCmd = if (System.getProperty("os.name").lowercase().contains("windows")) "npm.cmd" else "npm"
                    commandLine(npmCmd, "run", "clean")
                    isIgnoreExitValue = true
                }
            } catch (ignored: Exception) {
                logger.warn("npm not available on PATH; skipped frontend clean step")
            }
        }

        logger.lifecycle("Note: Project .gradle/ directory is not deleted by this task to avoid locking issues. Remove it manually if needed.")
    }
}








