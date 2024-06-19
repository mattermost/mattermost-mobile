package com.mattermost.helpers

import java.util.UUID

class RandomId {
    companion object {
        private const val alphabet = "0123456789abcdefghijklmnopqrstuvwxyz"
        private const val alphabetLength = alphabet.length
        private const val idLength = 16

        fun generate(): String {
            return UUID.randomUUID().toString()
        }
    }
}
