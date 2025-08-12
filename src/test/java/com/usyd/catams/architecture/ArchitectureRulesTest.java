package com.usyd.catams.architecture;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

public class ArchitectureRulesTest {

    private static JavaClasses classes;

    @BeforeAll
    static void setup() {
        classes = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages("com.usyd.catams");
    }

    @Test
    void controllers_should_depend_on_service_interfaces_not_implementations() {
        ArchRule rule = noClasses()
            .that().resideInAPackage("..controller..")
            .should().dependOnClassesThat().resideInAnyPackage(
                "..service.impl..", "..application.."
            );
        rule.check(classes);
    }

    @Test
    void web_layer_should_not_depend_on_security_impl_details() {
        ArchRule rule = noClasses()
            .that().resideInAPackage("..controller..")
            .should().dependOnClassesThat().resideInAnyPackage(
                "com.usyd.catams.security..", // project security utils only
                "org.springframework.security.core.context.." // direct context access
            )
            .because("Controllers should rely on AuthenticationFacade/policy abstractions, not security implementation details");
        rule.check(classes);
    }

    @Test
    void domain_should_not_depend_on_web_or_controller_packages() {
        ArchRule rule = noClasses()
            .that().resideInAPackage("..domain..")
            .should().dependOnClassesThat().resideInAnyPackage("..controller..", "..config..")
            .because("Domain must be free from web/config concerns");
        rule.check(classes);
    }
}