package com.usyd.catams.karate;

import com.intuit.karate.Results;
import com.intuit.karate.Runner;
import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.Assumptions.*;
import org.junit.jupiter.api.Test;

class KarateTestRunner {

    @Test
    void testParallel() {
        String envBase = System.getenv("KARATE_BASE_URL");
        String sysBase = System.getProperty("karate.baseUrl");
        // Skip when no external backend base URL configured
        assumeTrue(envBase != null || sysBase != null, "KARATE_BASE_URL or -Dkarate.baseUrl not set; skipping Karate tests");
        String baseUrl = sysBase != null ? sysBase : envBase;
        Results results = Runner.path("classpath:com/usyd/catams/karate/features")
                .configDir("classpath:com/usyd/catams/karate")
                .systemProperty("baseUrl", baseUrl)
                .tags("~@ignore")
                .parallel(1);
        assertEquals(0, results.getFailCount(), results.getErrorMessages());
    }
}


