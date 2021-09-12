package com.mattermost.helpers

import kotlin.math.floor

class RandomId {
    companion object {
        private const val alphabet = "0123456789abcdefghijklmnopqrstuvwxyz"
        private const val alphabetLenght = alphabet.length
        private const val idLenght = 16

        fun generate(): String {
            var id = ""
            for (i in 1.rangeTo((idLenght / 2))) {
                val random = floor(Math.random() * alphabetLenght * alphabetLenght)
                id += alphabet[floor(random / alphabetLenght).toInt()]
                id += alphabet[(random % alphabetLenght).toInt()]
            }

            return id
        }
    }
}
