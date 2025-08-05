package com.usyd.catams.performance;

import org.junit.platform.engine.discovery.DiscoverySelectors;
import org.junit.platform.launcher.Launcher;
import org.junit.platform.launcher.LauncherDiscoveryRequest;
import org.junit.platform.launcher.core.LauncherDiscoveryRequestBuilder;
import org.junit.platform.launcher.core.LauncherFactory;
import org.junit.platform.launcher.listeners.SummaryGeneratingListener;
import org.junit.platform.launcher.listeners.TestExecutionSummary;

import java.io.FileWriter;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Performance benchmark runner for automated performance testing.
 * 
 * Can be used in CI/CD pipelines to:
 * - Run performance tests automatically
 * - Generate performance reports
 * - Track performance regressions over time
 * - Set up performance baselines
 */
public class PerformanceBenchmarkRunner {

    public static void main(String[] args) {
        System.out.println("CATAMS Performance Benchmark Runner");
        System.out.println("====================================");
        System.out.println("Starting performance tests at: " + LocalDateTime.now());
        System.out.println();

        // Configure test discovery
        LauncherDiscoveryRequest request = LauncherDiscoveryRequestBuilder.request()
            .selectors(DiscoverySelectors.selectPackage("com.usyd.catams.performance"))
            .build();

        // Set up test execution
        Launcher launcher = LauncherFactory.create();
        SummaryGeneratingListener listener = new SummaryGeneratingListener();
        launcher.registerTestExecutionListeners(listener);

        // Execute performance tests
        launcher.execute(request);

        // Generate summary report
        TestExecutionSummary summary = listener.getSummary();
        generatePerformanceReport(summary);

        // Exit with appropriate code
        if (summary.getTestsFailedCount() > 0) {
            System.exit(1);
        } else {
            System.exit(0);
        }
    }

    private static void generatePerformanceReport(TestExecutionSummary summary) {
        System.out.println("\n" + "=".repeat(60));
        System.out.println("PERFORMANCE BENCHMARK SUMMARY");
        System.out.println("=".repeat(60));
        
        System.out.printf("Tests Run: %d%n", summary.getTestsStartedCount());
        System.out.printf("Tests Passed: %d%n", summary.getTestsSucceededCount());
        System.out.printf("Tests Failed: %d%n", summary.getTestsFailedCount());
        System.out.printf("Tests Skipped: %d%n", summary.getTestsSkippedCount());
        System.out.printf("Execution Time: Available in detailed report%n");
        
        System.out.println("=".repeat(60));
        
        if (summary.getTestsFailedCount() > 0) {
            System.out.println("FAILED TESTS:");
            summary.getFailures().forEach(failure -> {
                System.out.printf("- %s: %s%n", 
                    failure.getTestIdentifier().getDisplayName(),
                    failure.getException().getMessage());
            });
            System.out.println("=".repeat(60));
        }
        
        // Write report to file
        try {
            writeReportFile(summary);
        } catch (IOException e) {
            System.err.println("Failed to write performance report file: " + e.getMessage());
        }
        
        System.out.println("Performance benchmark completed at: " + LocalDateTime.now());
    }

    private static void writeReportFile(TestExecutionSummary summary) throws IOException {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss"));
        String filename = "target/performance-report-" + timestamp + ".txt";
        
        try (FileWriter writer = new FileWriter(filename)) {
            writer.write("CATAMS Performance Benchmark Report\n");
            writer.write("===================================\n");
            writer.write("Generated: " + LocalDateTime.now() + "\n\n");
            
            writer.write("Summary:\n");
            writer.write("--------\n");
            writer.write("Tests Run: " + summary.getTestsStartedCount() + "\n");
            writer.write("Tests Passed: " + summary.getTestsSucceededCount() + "\n");
            writer.write("Tests Failed: " + summary.getTestsFailedCount() + "\n");
            writer.write("Tests Skipped: " + summary.getTestsSkippedCount() + "\n");
            writer.write("Total Execution Time: Measured per test\n\n");
            
            if (summary.getTestsFailedCount() > 0) {
                writer.write("Failed Tests:\n");
                writer.write("-------------\n");
                summary.getFailures().forEach(failure -> {
                    try {
                        writer.write("- " + failure.getTestIdentifier().getDisplayName() + 
                                   ": " + failure.getException().getMessage() + "\n");
                    } catch (IOException e) {
                        // Ignore write errors in failure reporting
                    }
                });
                writer.write("\n");
            }
            
            writer.write("Performance Thresholds:\n");
            writer.write("-----------------------\n");
            writer.write("Authentication: 500ms\n");
            writer.write("CRUD Operations: 200ms\n");
            writer.write("List Operations: 300ms\n");
            writer.write("Search Operations: 400ms\n\n");
            
            writer.write("Notes:\n");
            writer.write("------\n");
            writer.write("- Performance tests use TestContainers with PostgreSQL\n");
            writer.write("- Tests include warmup phase for JVM optimization\n");
            writer.write("- Concurrent users: configurable (default 10)\n");
            writer.write("- Success rate threshold: 95%\n");
            writer.write("- P95 response time threshold: 2x average threshold\n");
        }
        
        System.out.println("Performance report written to: " + filename);
    }
}
