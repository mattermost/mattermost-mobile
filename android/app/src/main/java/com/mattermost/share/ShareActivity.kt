package com.mattermost.share

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.mattermost.rnbeta.MainApplication

class ShareActivity : ReactActivity() {
    override fun getMainComponentName(): String? = "MattermostShare"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val app: MainApplication = this.application as MainApplication
        app.sharedExtensionIsOpened = true
    }
}
