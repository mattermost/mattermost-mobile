package com.mattermost.callsnative.services

import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/**
 * Boots the React Native JS runtime from a service context — used when an
 * incoming-call FCM arrives while the app is killed. RN runs the
 * `MMCallsBootTask` JS handler (defined in `app/init/headless_boot.ts`),
 * which calls the same `initialize()` MainActivity would, so WS / event
 * subscribers / calls-native listeners are all live by the time the user
 * answers.
 */
class MMCallsBootTaskService : HeadlessJsTaskService() {
    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig {
        return HeadlessJsTaskConfig(
            "MMCallsBootTask",
            Arguments.createMap(),
            0,
            true,
        )
    }
}
