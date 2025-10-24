package com.usyd.catams.config;

import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component("profileGuard")
public class ProfileGuard {
    private final Environment environment;

    public ProfileGuard(Environment environment) {
        this.environment = environment;
    }

    public boolean isE2E() {
        String[] profiles = environment.getActiveProfiles();
        if (profiles == null) return false;
        for (String p : profiles) {
            if (p == null) continue;
            String s = p.toLowerCase();
            if ("test".equals(s) || s.startsWith("e2e")) {
                return true;
            }
        }
        return false;
    }
}

