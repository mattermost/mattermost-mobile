package com.mattermost.helpers

object AppStateHelper {
    @Volatile
    var isMainAppActive: Boolean = false
}
