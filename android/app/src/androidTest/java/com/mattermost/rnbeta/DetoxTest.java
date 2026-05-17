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
        // 360s master / 300s idle. The original 240/180 was tripped on Android
        // shard 1 (CI run 25951064506) by a now-fixed cause: the system
        // POST_NOTIFICATIONS permission dialog appearing on top of the server
        // screen, pausing MainActivity, and keeping Fabric's mount queue
        // non-empty while the activity was PAUSED. The dialog appeared because
        // setup.ts called `pm grant POST_NOTIFICATIONS` AFTER `device.launchApp()`
        // — by then the JS bundle had already run and called requestNotifications().
        // The grant is now performed BEFORE launchApp (see detox/e2e/test/setup.ts
        // launchAndVerify), so the dialog never appears and Fabric drains normally.
        //
        // The 360/300 budget is retained as defense in depth for tail-end CI
        // shards under heavy parallel load: even with the dialog gone, a cold
        // boot that does WatermelonDB schema creation (39 tables) + initial
        // batch inserts + channel-list rebuild can keep the mount queue busy
        // for ~30–60 s legitimately, and we don't want a tighter budget to
        // start flaking on a slow runner.
        detoxConfig.idlePolicyConfig.masterTimeoutSec = 360;
        detoxConfig.idlePolicyConfig.idleResourceTimeoutSec = 300;
        detoxConfig.rnContextLoadTimeoutSec = (BuildConfig.DEBUG ? 180 : 60);

        Detox.runTests(mActivityRule, detoxConfig);
    }
}
