package com.mattermost.helpers

class ServerVersion {
    companion object {

        fun isMinimum(currentVersion: String, minMajorVersion: Int = 0, minMinorVersion: Int = 0, minDotVersion: Int = 0): Boolean {
            val split = currentVersion.split(".").toTypedArray()
            val major = split[0].toInt()
            val minor = split[1].toInt()
            val dot = split[2].toInt()

            if (major > minMajorVersion) {
                return true
            }
            if (major < minMajorVersion) {
                return false
            }

            // Major version is equal, check minor
            if (minor > minMinorVersion) {
                return true
            }
            if (minor < minMinorVersion) {
                return false
            }

            // Minor version is equal, check dot
            if (dot > minDotVersion) {
                return true
            }
            if (dot < minDotVersion) {
                return false
            }

            // Dot version is equal
            return true
        }
    }
}
