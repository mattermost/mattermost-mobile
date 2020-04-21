package com.mattermost.rnbeta

import com.facebook.react.bridge.ReactApplicationContext
import com.mattermost.react_native_interface.AsyncStorageHelper
import com.mattermost.react_native_interface.KeysReadableArray
import com.mattermost.react_native_interface.ResolvePromise
import com.oblador.keychain.KeychainModule
import java.util.*

object MattermostCredentialsHelper {
    const val CURRENT_SERVER_URL = "@currentServerUrl"
    @JvmStatic
    fun getCredentialsForCurrentServer(context: ReactApplicationContext?, promise: ResolvePromise?) {
        val keychainModule = KeychainModule(context)
        val asyncStorage = AsyncStorageHelper(context)
        val keys = ArrayList<String>(1)
        keys.add(CURRENT_SERVER_URL)
        val asyncStorageKeys: KeysReadableArray = object : KeysReadableArray() {
            override fun size(): Int = keys.size
            override fun getString(index: Int): String? = keys[index]
        }
        val asyncStorageResults: HashMap<String, String> = asyncStorage.multiGet(asyncStorageKeys)
        val serverUrl = asyncStorageResults[CURRENT_SERVER_URL]
        keychainModule.getGenericPasswordForOptions(serverUrl, promise)
    }
}
