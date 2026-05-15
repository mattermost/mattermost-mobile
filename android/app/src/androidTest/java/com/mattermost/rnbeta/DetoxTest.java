package com.mattermost.rnbeta;

import com.wix.detox.Detox;
import com.wix.detox.config.DetoxConfig;

import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.filters.LargeTest;
import androidx.test.rule.ActivityTestRule;

@RunWith(AndroidJUnit4.class)
@LargeTest
public class DetoxTest {

    @Rule
    public ActivityTestRule<MainActivity> mActivityRule = new ActivityTestRule<>(MainActivity.class, false, false);

    @Test
    public void runDetoxTests() {
        DetoxConfig detoxConfig = new DetoxConfig();
        // Increased from 90/60 to accommodate Fabric startup during cold boot.
        // RN 0.83.9 New Architecture keeps Fabric's MountItemDispatcher busy for ~30s
        // during server DB creation (39 tables) + batch model inserts + channel-list
        // re-renders. Detox's FabricUIManagerIdlingResources fires the idle timeout
        // during this window, crashing the test with IdlingResourceTimeoutException.
        detoxConfig.idlePolicyConfig.masterTimeoutSec = 240;
        detoxConfig.idlePolicyConfig.idleResourceTimeoutSec = 180;
        detoxConfig.rnContextLoadTimeoutSec = (BuildConfig.DEBUG ? 180 : 60);

        Detox.runTests(mActivityRule, detoxConfig);
    }
}
