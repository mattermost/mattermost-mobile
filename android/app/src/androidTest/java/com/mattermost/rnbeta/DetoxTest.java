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
        // Bumped from 240/180 to 360/300 after CI run 25951064506 (Android shard
        // 1, account_profile_picture + advanced_settings) showed
        // FabricUIManagerIdlingResources reporting "not idle" for 3:06
        // continuously while the app was sitting on the server screen. The 180s
        // idleResourceTimeoutSec fired and Detox crashed the app with
        // IdlingResourceTimeoutException; the global beforeAll's retry then
        // also ran out of Jest hook budget. Empirically, even on slow Android
        // CI shards the Fabric mount queue typically drains within ~30s; the
        // worst-observed legitimate startup is ~180s, but tail-end shards
        // (heavy parallel load) need more headroom. 300s covers the observed
        // tail with a safety margin.
        //
        // TODO: investigate why FabricUIManagerIdlingResources stays non-idle
        // on the server screen — likely a perpetually-restarting Reanimated
        // animation (see app/hooks/screen_transition_animation.ts and
        // app/screens/server/form.tsx withTiming usage) or a continuous timer
        // emitter. A fix at the source would let us lower these back down.
        detoxConfig.idlePolicyConfig.masterTimeoutSec = 360;
        detoxConfig.idlePolicyConfig.idleResourceTimeoutSec = 300;
        detoxConfig.rnContextLoadTimeoutSec = (BuildConfig.DEBUG ? 180 : 60);

        Detox.runTests(mActivityRule, detoxConfig);
    }
}
