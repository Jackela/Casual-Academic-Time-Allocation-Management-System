
package com.usyd.catams.features;

import com.intuit.karate.junit5.Karate;
import static org.junit.jupiter.api.Assumptions.*;

class AuthenticationRunner {

    @Karate.Test
    Karate testAuthentication() {
        String envBase = System.getenv("KARATE_BASE_URL");
        String sysBase = System.getProperty("karate.baseUrl");
        assumeTrue(envBase != null || sysBase != null, "KARATE_BASE_URL or -Dkarate.baseUrl not set; skipping Karate auth feature tests");
        String baseUrl = sysBase != null ? sysBase : envBase;
        return Karate.run("authentication")
                .systemProperty("baseUrl", baseUrl)
                .relativeTo(getClass());
    }

}

