package com.usyd.catams.karate;

import com.intuit.karate.Results;
import com.intuit.karate.Runner;
import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

class KarateTestRunner {

    @Test
    void testParallel() {
        Results results = Runner.path("classpath:com/usyd/catams/karate/features")
                .tags("~@ignore")
                .parallel(5);
        assertEquals(0, results.getFailCount(), results.getErrorMessages());
    }

}


