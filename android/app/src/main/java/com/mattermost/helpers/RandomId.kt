package com.mattermost.helpers

import kotlin.math.floor

class RandomId {
    companion object {
        private const val alphabet = "0123456789abcdefghijklmnopqrstuvwxyz"
        private const val alphabetLength = alphabet.length
        private const val idLength = 16

        fun generate(): String {
            var id = ""
            for (i in 1.rangeTo((idLength / 2))) {
                val random = floor(Math.random() * alphabetLength * alphabetLength)
                id += alphabet[floor(random / alphabetLength).toInt()]
                id += alphabet[(random % alphabetLength).toInt()]
            }

            return id
        }
    }
}
