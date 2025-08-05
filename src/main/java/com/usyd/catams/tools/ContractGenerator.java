package com.usyd.catams.tools;

import com.github.javaparser.StaticJavaParser;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.body.ClassOrInterfaceDeclaration;
import com.github.javaparser.ast.body.ConstructorDeclaration;
import com.github.javaparser.ast.body.FieldDeclaration;
import com.github.javaparser.ast.body.MethodDeclaration;
import com.github.javaparser.ast.body.Parameter;
import com.github.javaparser.ast.comments.JavadocComment;
import com.github.javaparser.javadoc.Javadoc;
import com.github.javaparser.javadoc.JavadocBlockTag;
import com.github.javaparser.javadoc.description.JavadocDescription;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.github.javaparser.ParserConfiguration; // Import ParserConfiguration

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

public class ContractGenerator {

    public static void main(String[] args) throws IOException {
        // Set JavaParser language level to JAVA_21 (project uses Java 21 LTS)
        StaticJavaParser.getParserConfiguration().setLanguageLevel(ParserConfiguration.LanguageLevel.RAW);

        String sourcePath = null;
        String outputPath = null;

        for (int i = 0; i < args.length; i++) {
            if ("--source".equals(args[i]) && i + 1 < args.length) {
                sourcePath = args[++i];
            } else if ("--output".equals(args[i]) && i + 1 < args.length) {
                outputPath = args[++i];
            }
        }

        if (sourcePath == null || outputPath == null) {
            System.err.println("Usage: ContractGenerator --source <source_directory> --output <output_file>");
            return;
        }

        File sourceDirectory = new File(sourcePath);
        if (!sourceDirectory.isDirectory()) {
            System.err.println("Error: Source path is not a directory.");
            return;
        }

        List<Map<String, Object>> contracts = new ArrayList<>();
        try (Stream<Path> paths = Files.walk(Paths.get(sourcePath))) {
            paths.filter(Files::isRegularFile)
                    .filter(p -> p.toString().endsWith(".java"))
                    .forEach(p -> {
                        try {
                            CompilationUnit cu = StaticJavaParser.parse(p);
                            cu.findAll(ClassOrInterfaceDeclaration.class).forEach(classDecl -> {
                                Map<String, Object> classContract = new HashMap<>();
                                classContract.put("type", classDecl.isInterface() ? "interface" : "class");
                                classContract.put("name", classDecl.getNameAsString());
                                classDecl.getJavadocComment().ifPresent(javadoc ->
                                        classContract.put("javadoc", parseJavadoc(javadoc)));
                                classContract.put("annotations", classDecl.getAnnotations().stream()
                                        .map(a -> a.getNameAsString()).collect(ArrayList::new, ArrayList::add, ArrayList::addAll));

                                List<Map<String, Object>> fields = new ArrayList<>();
                                classDecl.findAll(FieldDeclaration.class).forEach(fieldDecl -> {
                                    Map<String, Object> fieldContract = new HashMap<>();
                                    fieldContract.put("name", fieldDecl.getVariables().get(0).getNameAsString());
                                    fieldContract.put("type", fieldDecl.getVariables().get(0).getTypeAsString());
                                    fieldContract.put("annotations", fieldDecl.getAnnotations().stream()
                                            .map(a -> a.getNameAsString()).collect(ArrayList::new, ArrayList::add, ArrayList::addAll));
                                    fieldDecl.getJavadocComment().ifPresent(javadoc ->
                                            fieldContract.put("javadoc", parseJavadoc(javadoc)));
                                    fields.add(fieldContract);
                                });
                                classContract.put("fields", fields);

                                List<Map<String, Object>> constructors = new ArrayList<>();
                                classDecl.findAll(ConstructorDeclaration.class).forEach(constructorDecl -> {
                                    Map<String, Object> constructorContract = new HashMap<>();
                                    constructorContract.put("name", constructorDecl.getNameAsString());
                                    constructorContract.put("signature", constructorDecl.getDeclarationAsString(true, true, true));
                                    constructorContract.put("annotations", constructorDecl.getAnnotations().stream()
                                            .map(a -> a.getNameAsString()).collect(ArrayList::new, ArrayList::add, ArrayList::addAll));
                                    constructorDecl.getJavadocComment().ifPresent(javadoc ->
                                            constructorContract.put("javadoc", parseJavadoc(javadoc)));
                                    List<Map<String, String>> parameters = new ArrayList<>();
                                    constructorDecl.getParameters().forEach(param -> {
                                        Map<String, String> paramMap = new HashMap<>();
                                        paramMap.put("name", param.getNameAsString());
                                        paramMap.put("type", param.getTypeAsString());
                                        parameters.add(paramMap);
                                    });
                                    constructorContract.put("parameters", parameters);
                                    constructors.add(constructorContract);
                                });
                                classContract.put("constructors", constructors);

                                List<Map<String, Object>> methods = new ArrayList<>();
                                classDecl.findAll(MethodDeclaration.class).forEach(methodDecl -> {
                                    Map<String, Object> methodContract = new HashMap<>();
                                    methodContract.put("name", methodDecl.getNameAsString());
                                    methodContract.put("signature", methodDecl.getDeclarationAsString(true, true, true));
                                    methodContract.put("returnType", methodDecl.getTypeAsString());
                                    methodContract.put("annotations", methodDecl.getAnnotations().stream()
                                            .map(a -> a.getNameAsString()).collect(ArrayList::new, ArrayList::add, ArrayList::addAll));
                                    methodDecl.getJavadocComment().ifPresent(javadoc ->
                                            methodContract.put("javadoc", parseJavadoc(javadoc)));
                                    List<Map<String, String>> parameters = new ArrayList<>();
                                    methodDecl.getParameters().forEach(param -> {
                                        Map<String, String> paramMap = new HashMap<>();
                                        paramMap.put("name", param.getNameAsString());
                                        paramMap.put("type", param.getTypeAsString());
                                        parameters.add(paramMap);
                                    });
                                    methodContract.put("parameters", parameters);
                                    methods.add(methodContract);
                                });
                                classContract.put("methods", methods);
                                contracts.add(classContract);
                            });
                        } catch (IOException e) {
                            System.err.println("Error parsing file " + p + ": " + e.getMessage());
                        }
                    });
        }

        ObjectMapper mapper = new ObjectMapper();
        mapper.enable(SerializationFeature.INDENT_OUTPUT);
        File outputFile = new File(outputPath);
        outputFile.getParentFile().mkdirs(); // Ensure parent directories exist
        try (FileWriter writer = new FileWriter(outputFile)) {
            mapper.writeValue(writer, contracts);
            System.out.println("Contract generated successfully at: " + outputPath);
        }
    }

    private static Map<String, Object> parseJavadoc(JavadocComment javadocComment) {
        Map<String, Object> javadocMap = new HashMap<>();
        Javadoc javadoc = javadocComment.parse();

        javadocMap.put("description", javadoc.getDescription().toText().trim()); // Use toText() for plain text

        Map<String, String> params = new HashMap<>();
        List<String> returns = new ArrayList<>();
        List<String> throwsList = new ArrayList<>();
        Map<String, List<String>> customTags = new HashMap<>();

        for (JavadocBlockTag blockTag : javadoc.getBlockTags()) {
            switch (blockTag.getType()) {
                case PARAM:
                    blockTag.getName().ifPresent(name -> params.put(name, blockTag.getContent().toText().trim()));
                    break;
                case RETURN:
                    returns.add(blockTag.getContent().toText().trim());
                    break;
                case THROWS:
                case EXCEPTION:
                    blockTag.getName().ifPresent(name -> throwsList.add(name + " " + blockTag.getContent().toText().trim()));
                    break;
                default:
                    // Handle custom tags
                    String tagName = blockTag.getTagName();
                    customTags.computeIfAbsent(tagName, k -> new ArrayList<>())
                            .add(blockTag.getContent().toText().trim());
                    break;
            }
        }
        if (!params.isEmpty()) javadocMap.put("params", params);
        if (!returns.isEmpty()) javadocMap.put("returns", returns);
        if (!throwsList.isEmpty()) javadocMap.put("throws", throwsList);
        if (!customTags.isEmpty()) javadocMap.put("customTags", customTags);

        return javadocMap;
    }
}
