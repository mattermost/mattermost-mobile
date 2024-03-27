package com.mattermost.helpers.database_extension

import com.nozbe.watermelondb.WMDatabase
import org.json.JSONObject

fun queryCurrentUserId(db: WMDatabase): String? {
    val result = find(db, "System", "currentUserId")
    return result?.getString("value")?.removeSurrounding("\"")
}

fun queryCurrentTeamId(db: WMDatabase): String? {
    val result = find(db, "System", "currentTeamId")
    return result?.getString("value")?.removeSurrounding("\"")
}

fun queryConfigDisplayNameSetting(db: WMDatabase): String? {
    val license = find(db, "System", "license")
    val lockDisplayName = find(db, "Config", "LockTeammateNameDisplay")
    val displayName = find(db, "Config", "TeammateNameDisplay")

    val licenseValue = license?.getString("value") ?: ""
    val lockDisplayNameValue = lockDisplayName?.getString("value") ?: "false"
    val displayNameValue = displayName?.getString("value") ?: "full_name"
    val licenseJson = JSONObject(licenseValue)
    val licenseLock = try { licenseJson.getString("LockTeammateNameDisplay") } catch (e: Exception) { "false"}

    if (licenseLock == "true" && lockDisplayNameValue == "true") {
        return displayNameValue
    }

    return null
}

fun queryConfigSigningKey(db: WMDatabase): String? {
    return find(db, "Config", "AsymmetricSigningPublicKey")?.getString("value")
}

fun queryConfigServerVersion(db: WMDatabase): String? {
    return find(db, "Config", "Version")?.getString("value")
}
