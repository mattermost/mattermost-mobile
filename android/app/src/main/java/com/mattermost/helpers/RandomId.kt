package com.mattermost.helpers

import java.util.UUID

class RandomId {
    companion object {
        fun generate(): String {
            return UUID.randomUUID().toString()
        }
    }
}
