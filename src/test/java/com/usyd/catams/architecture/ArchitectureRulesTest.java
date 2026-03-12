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
    void controllers_should_not_depend_on_repositories() {
        ArchRule rule = noClasses()
            .that().haveSimpleName("ApprovalController")
            .or().haveSimpleName("TimesheetController")
            .should().dependOnClassesThat().resideInAnyPackage("..repository..")
            .because("Refactored approval/timesheet controllers must stay at protocol-adapter boundary and delegate data access");
        rule.check(classes);
    }

    @Test
    void timesheet_controller_should_not_embed_calculation_or_domain_validation_dependencies() {
        ArchRule rule = noClasses()
            .that().haveSimpleName("TimesheetController")
            .should().dependOnClassesThat().haveFullyQualifiedName("com.usyd.catams.service.Schedule1Calculator")
            .orShould().dependOnClassesThat().haveFullyQualifiedName("com.usyd.catams.domain.service.TimesheetValidationService")
            .because("TimesheetController must delegate Schedule 1 pricing and domain validation orchestration to application/service layer use cases");
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

    @Test
    void domain_should_not_depend_on_application_layer() {
        ArchRule rule = noClasses()
            .that().resideInAPackage("com.usyd.catams.domain..")
            .should().dependOnClassesThat().resideInAnyPackage("com.usyd.catams.application..")
            .because("Domain rules/models must not depend on application orchestration classes");
        rule.check(classes);
    }
}
