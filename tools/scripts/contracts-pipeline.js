#!/usr/bin/env node

/**
 * Contract pipeline entrypoint.
 *
 * Modes:
 *  - generate (default): produce Java + TypeScript contracts and update the fingerprint lock file.
 *  - verify (--verify): fail if the fingerprint or generated TypeScript files drift from schema definitions.
 *
 * Environment overrides:
 *  - CONTRACTS_OUTPUT_DIR: directory for generated artifacts (defaults to build/generated-contracts).
 *  - CONTRACTS_LOCK_FILE: path to the fingerprint file (defaults to schema/contracts.lock).
 */

const path = require("path");
const fs = require("fs/promises");
const crypto = require("crypto");
const { quicktype, InputData, JSONSchemaInput, JSONSchemaStore } = require("quicktype-core");

const repoRoot = path.resolve(__dirname, "..", "..");
const schemaDir = path.join(repoRoot, "schema");
const frontendContractsDir = path.join(repoRoot, "frontend", "src", "contracts", "generated");
const outputRoot = process.env.CONTRACTS_OUTPUT_DIR || path.join(repoRoot, "build", "generated-contracts");
const javaOutputDir = path.join(outputRoot, "java");
const tsOutputDir = path.join(outputRoot, "typescript");
const lockFilePath = process.env.CONTRACTS_LOCK_FILE || path.join(schemaDir, "contracts.lock");

const args = process.argv.slice(2);
const mode = args.includes("--verify") ? "verify" : "generate";

const HASH_ALGO = "sha256";

const toPascalCase = (value) =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/\.schema$/i, "")
    .replace(/(?:^|\s)(\w)/g, (_, c) => c.toUpperCase())
    .replace(/\s+/g, "");

const toKebabCase = (value) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();

const readJsonFile = async (filePath) => {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
};

const writeJsonFile = async (filePath, data) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
};

const listSchemaFiles = async () => {
  const entries = await fs.readdir(schemaDir);
  return entries.filter((name) => name.endsWith(".schema.json")).sort();
};

const sha256File = async (filePath) => {
  const buffer = await fs.readFile(filePath);
  return crypto.createHash(HASH_ALGO).update(buffer).digest("hex");
};

const quicktypeFromSchema = async ({ typeName, schemaFile, schemaContents, language, options = {} }) => {
  const store = new JSONSchemaStore();
  const schemaInput = new JSONSchemaInput(store);
  for (const [fileName, schemaText] of schemaContents.entries()) {
    await schemaInput.addSource({
      name: fileName,
      schema: schemaText,
    });
  }

  const inputData = new InputData();
  inputData.addInput(schemaInput);

  const result = await quicktype({
    inputData,
    lang: language,
    rendererOptions: {
      "top-level": typeName,
      ...options,
    },
  });

  return result.lines.join("\n");
};

const buildArtifacts = async () => {
  const schemaFiles = await listSchemaFiles();
  const artifacts = [];
  const schemaContents = new Map();

  for (const schemaFile of schemaFiles) {
    const schemaPath = path.join(schemaDir, schemaFile);
    schemaContents.set(schemaFile, await fs.readFile(schemaPath, "utf8"));
  }

  for (const schemaFile of schemaFiles) {
    const schemaPath = path.join(schemaDir, schemaFile);
    const baseName = schemaFile.replace(/\.schema\.json$/i, "");
    const typeName = toPascalCase(baseName);
    const tsFileStem = toKebabCase(typeName);

    const tsContent = await quicktypeFromSchema({
      typeName,
      schemaFile,
      schemaContents,
      language: "typescript",
      options: {
        "just-types": "true",
        "explicit-unions": "false",
      },
    });

    const javaContent = await quicktypeFromSchema({
      typeName,
      schemaFile,
      schemaContents,
      language: "java",
      options: {
        package: "com.usyd.catams.contracts",
        "just-types": "true",
        "use-double": "false",
      },
    });

    artifacts.push({
      schemaFile,
      schemaPath,
      typeName,
      tsFileStem,
      tsContent,
      javaContent,
    });
  }

  return artifacts;
};

const generatedJavaClasses = new Set();

const writeArtifacts = async (artifacts) => {
  await fs.rm(javaOutputDir, { recursive: true, force: true });
  await fs.rm(tsOutputDir, { recursive: true, force: true });
  await fs.rm(frontendContractsDir, { recursive: true, force: true });

  for (const artifact of artifacts) {
    const tsOutputPath = path.join(tsOutputDir, `${artifact.tsFileStem}.ts`);
    const frontendTsPath = path.join(frontendContractsDir, `${artifact.tsFileStem}.ts`);

    const javaPattern = /\/\/\s+([A-Za-z0-9_]+)\.java\s*\n([\s\S]*?)(?=(\/\/\s+[A-Za-z0-9_]+\.java\s*\n)|$)/g;
    let javaMatch = javaPattern.exec(artifact.javaContent);
    let matchedJavaBlock = false;

    while (javaMatch !== null) {
      matchedJavaBlock = true;
      const className = javaMatch[1];
      const body = javaMatch[2].trimStart().trimEnd();
      if (!body || generatedJavaClasses.has(className)) {
        javaMatch = javaPattern.exec(artifact.javaContent);
        continue;
      }

      generatedJavaClasses.add(className);
      const javaFilePath = path.join(
        javaOutputDir,
        "com",
        "usyd",
        "catams",
        "contracts",
        `${className}.java`,
      );
      await fs.mkdir(path.dirname(javaFilePath), { recursive: true });
      await fs.writeFile(javaFilePath, `${body}\n`, "utf8");

      javaMatch = javaPattern.exec(artifact.javaContent);
    }

    if (!matchedJavaBlock) {
      const className = artifact.typeName;
      if (!generatedJavaClasses.has(className)) {
        const sanitized = artifact.javaContent.replace(/^\/\/.*\n/gm, "").trim();
        if (sanitized.length > 0) {
          generatedJavaClasses.add(className);
          const javaFilePath = path.join(
            javaOutputDir,
            "com",
            "usyd",
            "catams",
            "contracts",
            `${className}.java`,
          );
          await fs.mkdir(path.dirname(javaFilePath), { recursive: true });
          await fs.writeFile(javaFilePath, `${sanitized}\n`, "utf8");
        }
      }
    }

    await fs.mkdir(path.dirname(tsOutputPath), { recursive: true });
    await fs.writeFile(tsOutputPath, `${artifact.tsContent}\n`, "utf8");

    await fs.mkdir(path.dirname(frontendTsPath), { recursive: true });
    await fs.writeFile(frontendTsPath, `${artifact.tsContent}\n`, "utf8");
  }

  const exportLines = artifacts.map(
    (artifact) => `export type { ${artifact.typeName} } from "./${artifact.tsFileStem}";`,
  );
  exportLines.push("");

  await fs.mkdir(tsOutputDir, { recursive: true });
  await fs.writeFile(path.join(tsOutputDir, "index.ts"), exportLines.join("\n"), "utf8");

  await fs.mkdir(frontendContractsDir, { recursive: true });
  await fs.writeFile(path.join(frontendContractsDir, "index.ts"), exportLines.join("\n"), "utf8");
};

const computeFingerprint = async (artifacts) => {
  const fingerprint = {};
  for (const artifact of artifacts) {
    fingerprint[artifact.schemaFile] = await sha256File(artifact.schemaPath);
  }
  return fingerprint;
};

const verifyLockFile = (fingerprint, existingLock) => {
  if (!existingLock) {
    throw new Error(
      `Missing contracts lock file at ${lockFilePath}. Run "./gradlew generateContracts" and commit the updated lock.`,
    );
  }
  const expected = existingLock.schemas || {};
  const fingerprintEntries = Object.entries(fingerprint);
  const expectedEntries = Object.entries(expected);

  if (fingerprintEntries.length !== expectedEntries.length) {
    throw new Error("Schema fingerprint mismatch: count differs from lock file.");
  }

  for (const [schemaFile, hash] of fingerprintEntries) {
    if (expected[schemaFile] !== hash) {
      throw new Error(
        `Schema fingerprint mismatch for ${schemaFile}. Expected ${expected[schemaFile]}, found ${hash}.`,
      );
    }
  }
};

const verifyTypeScriptArtifacts = async (artifacts) => {
  for (const artifact of artifacts) {
    const frontendTsPath = path.join(frontendContractsDir, `${artifact.tsFileStem}.ts`);
    try {
      const existing = await fs.readFile(frontendTsPath, "utf8");
      if (existing.trim() !== artifact.tsContent.trim()) {
        throw new Error(
          `TypeScript contract drift detected for ${artifact.tsFileStem}.ts. Run "./gradlew generateContracts".`,
        );
      }
    } catch (error) {
      if (error.code === "ENOENT") {
        throw new Error(
          `Missing generated TypeScript contract ${path.relative(repoRoot, frontendTsPath)}.`,
        );
      }
      throw error;
    }
  }

  const expectedIndexPath = path.join(frontendContractsDir, "index.ts");
  try {
    const existingIndex = await fs.readFile(expectedIndexPath, "utf8");
    const expectedLines = artifacts.map(
      (artifact) => `export type { ${artifact.typeName} } from "./${artifact.tsFileStem}";`,
    );
    expectedLines.push("");
    const expectedContent = expectedLines.join("\n");
    if (existingIndex.trim() !== expectedContent.trim()) {
      throw new Error(
        `TypeScript contract index drift detected at ${path.relative(repoRoot, expectedIndexPath)}.`,
      );
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(
        `Missing TypeScript contract index file ${path.relative(repoRoot, expectedIndexPath)}.`,
      );
    }
    throw error;
  }
};

const writeLockFile = async (fingerprint) => {
  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    schemas: fingerprint,
  };
  await writeJsonFile(lockFilePath, payload);
};

const main = async () => {
  const artifacts = await buildArtifacts();
  const fingerprint = await computeFingerprint(artifacts);

  if (mode === "verify") {
    const existingLock = await readJsonFile(lockFilePath);
    verifyLockFile(fingerprint, existingLock);
    await verifyTypeScriptArtifacts(artifacts);
    return;
  }

  await writeArtifacts(artifacts);
  await writeLockFile(fingerprint);
};

main()
  .then(() => {
    if (mode === "verify") {
      console.log("[contracts] Verification passed.");
    } else {
      console.log("[contracts] Contracts generated successfully.");
    }
  })
  .catch((error) => {
    console.error("[contracts] Pipeline failed:", error.message);
    if (process.env.DEBUG_CONTRACTS === "true") {
      console.error(error);
    }
    process.exitCode = 1;
  });
