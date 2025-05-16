package com.mattermost.securepdfviewer.enums

enum class Events(val event: String) {
    ON_LINK_PRESSED("onLinkPressed"),
    ON_LINK_PRESSED_DISABLED("onLinkPressedDisabled"),
    ON_LOAD_EVENT("onLoad"),
    ON_LOAD_ERROR_EVENT("onLoadError"),
    ON_PASSWORD_REQUIRED("onPasswordRequired"),
    ON_PASSWORD_FAILED("onPasswordFailed"),
    ON_PASSWORD_LIMIT_REACHED("onPasswordFailureLimitReached"),
    ON_TAP("onTap")
}
