package com.mattermost.helpers

import com.facebook.react.ReactActivity
import com.mattermost.intune.IntuneInitializer
import com.microsoft.intune.mam.client.MAMIdentitySwitchResult
import com.microsoft.intune.mam.client.app.AppIdentitySwitchReason
import com.microsoft.intune.mam.client.app.AppIdentitySwitchResultCallback
import com.microsoft.intune.mam.client.app.MAMActivityIdentityRequirementListener
import com.microsoft.intune.mam.client.app.MAMActivityIdentitySwitchListener

abstract class IntuneReactActivity : ReactActivity(), MAMActivityIdentityRequirementListener, MAMActivityIdentitySwitchListener {
    override fun onMAMIdentitySwitchRequired(
        upn: String,
        oid: String,
        reason: AppIdentitySwitchReason,
        callback: AppIdentitySwitchResultCallback
    ) {
        IntuneInitializer.onMAMIdentitySwitchRequired(this, oid, reason, callback)
    }

    // The default implementation finishes the Activity on failure, which would close the whole RN UI
    override fun onSwitchMAMIdentityComplete(result: MAMIdentitySwitchResult) {
        IntuneInitializer.onSwitchMAMIdentityComplete(this, result)
    }
}
