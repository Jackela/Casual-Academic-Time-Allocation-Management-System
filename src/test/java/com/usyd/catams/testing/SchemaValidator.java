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
            return factory.getSchema(schemaStream);
        } catch (Exception e) {
            throw new RuntimeException("Failed to load schema: " + schemaPath, e);
        }
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
