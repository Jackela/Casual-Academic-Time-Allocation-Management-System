package com.usyd.catams.testing;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.networknt.schema.JsonSchema;
import com.networknt.schema.JsonSchemaFactory;
import com.networknt.schema.SpecVersion;
import com.networknt.schema.ValidationMessage;

import java.io.InputStream;
import java.util.Set;
import java.util.stream.Collectors;

public final class SchemaValidator {

    private static final String SCHEMAS_ROOT_PATH = "/openapi/schemas/";
    private static final JsonSchemaFactory factory = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V7);
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private SchemaValidator() {
        // Utility class
    }

    public static void validate(String schemaName, String jsonPayload) {
        try {
            JsonNode jsonNode = MAPPER.readTree(jsonPayload);
            JsonSchema schema = getSchema(schemaName);
            Set<ValidationMessage> errors = schema.validate(jsonNode);

            if (!errors.isEmpty()) {
                String errorDetails = errors.stream()
                        .map(ValidationMessage::getMessage)
                        .collect(Collectors.joining("\n"));
                throw new SchemaValidationException("Schema validation failed for " + schemaName + ":\n" + errorDetails);
            }
        } catch (Exception e) {
            throw new SchemaValidationException("Failed to process schema validation for " + schemaName, e);
        }
    }

    private static JsonSchema getSchema(String schemaName) {
        String schemaPath = SCHEMAS_ROOT_PATH + schemaName;
        try (InputStream schemaStream = SchemaValidator.class.getResourceAsStream(schemaPath)) {
            if (schemaStream == null) {
                throw new IllegalArgumentException("Schema file not found: " + schemaPath);
            }
            JsonNode root = MAPPER.readTree(schemaStream);
            // Always attempt to resolve nested $ref within the node tree relative to schemas root
            JsonNode resolvedRoot = resolveRefs(root, "/openapi/schemas/", root);
            // If the extracted schema is a $ref placeholder, resolve it manually against classpath
            if (resolvedRoot.has("$ref") && resolvedRoot.get("$ref").isTextual()) {
                String ref = resolvedRoot.get("$ref").asText();
                String[] parts = ref.split("#", 2);
                String refPath = parts[0];
                String fragment = parts.length > 1 ? parts[1] : null; // like "/AuthResult"

                // Normalize leading "./" to classpath absolute path
                if (refPath.startsWith("./")) {
                    refPath = "/" + refPath.substring(2);
                } else if (!refPath.startsWith("/")) {
                    refPath = "/" + refPath;
                }

                try (InputStream refStream = SchemaValidator.class.getResourceAsStream(refPath)) {
                    if (refStream == null) {
                        throw new IllegalArgumentException("Referenced schema not found: " + refPath);
                    }
                    // authentication.yaml is YAML; load and extract the fragment
                    org.yaml.snakeyaml.Yaml yaml = new org.yaml.snakeyaml.Yaml();
                    Object yamlObj = yaml.load(refStream);
                    JsonNode yamlNode = MAPPER.valueToTree(yamlObj);
                    // resolve nested refs within the referenced yaml as well
                    yamlNode = resolveRefs(yamlNode, refPath.substring(0, refPath.lastIndexOf('/') + 1), yamlNode);

                    if (fragment != null && fragment.startsWith("/")) {
                        String[] tokens = fragment.substring(1).split("/");
                        JsonNode current = yamlNode;
                        for (String token : tokens) {
                            if (current == null) break;
                            current = current.get(token);
                        }
                        if (current == null) {
                            throw new IllegalArgumentException("Fragment not found in referenced schema: " + ref);
                        }
                        current = resolveRefs(current, refPath.substring(0, refPath.lastIndexOf('/') + 1), yamlNode);
                        return factory.getSchema(current);
                    } else {
                        return factory.getSchema(yamlNode);
                    }
                }
            }

            return factory.getSchema(resolvedRoot);
        } catch (Exception e) {
            throw new RuntimeException("Failed to load schema: " + schemaPath, e);
        }
    }

    private static JsonNode resolveRefs(JsonNode node, String baseDir, JsonNode documentRoot) {
        if (node == null) return null;
        if (node.isObject()) {
            com.fasterxml.jackson.databind.node.ObjectNode obj = (com.fasterxml.jackson.databind.node.ObjectNode) node;
            // Normalize OpenAPI 'nullable: true' to JSON Schema type union [type, 'null']
            if (obj.has("nullable") && obj.get("nullable").isBoolean() && obj.get("nullable").asBoolean()) {
                if (obj.has("type") && obj.get("type").isTextual()) {
                    String t = obj.get("type").asText();
                    com.fasterxml.jackson.databind.node.ArrayNode union = MAPPER.createArrayNode();
                    union.add(t);
                    union.add("null");
                    obj.set("type", union);
                    obj.remove("nullable");
                }
            }
            if (obj.has("$ref") && obj.get("$ref").isTextual()) {
                String ref = obj.get("$ref").asText();
                String[] parts = ref.split("#", 2);
                String refPath = parts[0];
                String fragment = parts.length > 1 ? parts[1] : null;
                // Resolve relative to current baseDir
                if (refPath.startsWith("./")) {
                    refPath = baseDir + refPath.substring(2);
                } else if (!refPath.startsWith("/")) {
                    // allow empty refPath meaning same document
                    refPath = refPath.isEmpty() ? "" : baseDir + refPath;
                }
                if (refPath.isEmpty()) {
                    // Fragment-only ref within the same document
                    if (fragment != null && fragment.startsWith("/")) {
                        String[] tokens = fragment.substring(1).split("/");
                        JsonNode current = documentRoot;
                        for (String token : tokens) {
                            if (current == null) break;
                            current = current.get(token);
                        }
                        return current != null ? current : node;
                    }
                    return node;
                } else {
                    try (InputStream refStream = SchemaValidator.class.getResourceAsStream(refPath)) {
                        if (refStream == null) return node; // leave as-is
                        org.yaml.snakeyaml.Yaml yaml = new org.yaml.snakeyaml.Yaml();
                        Object yamlObj = yaml.load(refStream);
                        JsonNode yamlNode = MAPPER.valueToTree(yamlObj);
                        yamlNode = resolveRefs(yamlNode, refPath.substring(0, refPath.lastIndexOf('/') + 1), yamlNode);
                        if (fragment != null && fragment.startsWith("/")) {
                            String[] tokens = fragment.substring(1).split("/");
                            JsonNode current = yamlNode;
                            for (String token : tokens) {
                                if (current == null) break;
                                current = current.get(token);
                            }
                            return current != null ? current : node;
                        }
                        return yamlNode;
                    } catch (Exception ex) {
                        return node;
                    }
                }
            } else {
                java.util.Iterator<java.util.Map.Entry<String, JsonNode>> it = obj.fields();
                java.util.List<String> keys = new java.util.ArrayList<>();
                while (it.hasNext()) { keys.add(it.next().getKey()); }
                for (String k : keys) {
                    obj.set(k, resolveRefs(obj.get(k), baseDir, documentRoot));
                }
                return obj;
            }
        } else if (node.isArray()) {
            com.fasterxml.jackson.databind.node.ArrayNode arr = (com.fasterxml.jackson.databind.node.ArrayNode) node;
            for (int i = 0; i < arr.size(); i++) {
                arr.set(i, resolveRefs(arr.get(i), baseDir, documentRoot));
            }
            return arr;
        }
        return node;
    }

    public static class SchemaValidationException extends RuntimeException {
        private static final long serialVersionUID = 1L;
        public SchemaValidationException(String message) {
            super(message);
        }

        public SchemaValidationException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
