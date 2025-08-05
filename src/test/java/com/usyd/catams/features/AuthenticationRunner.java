
package com.usyd.catams.features;

import com.intuit.karate.junit5.Karate;

class AuthenticationRunner {

    @Karate.Test
    Karate testAuthentication() {
        return Karate.run("authentication").relativeTo(getClass());
    }

}

