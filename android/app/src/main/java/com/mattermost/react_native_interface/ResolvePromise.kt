package com.mattermost.react_native_interface

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap

/**
 * ResolvePromise: Helper class that abstracts boilerplate
 */
open class ResolvePromise : Promise {
    override fun resolve(value: Any?) {}
    override fun reject(code: String, message: String) {}
    override fun reject(code: String, map: WritableMap) {}
    override fun reject(code: String, e: Throwable) {}
    override fun reject(e: Throwable, map: WritableMap) {}
    override fun reject(code: String, e: Throwable, map: WritableMap) {}
    override fun reject(code: String, message: String, e: Throwable, map: WritableMap) {}
    override fun reject(code: String, message: String, e: Throwable) {}
    override fun reject(code: String, message: String, map: WritableMap) {}
    override fun reject(message: String) {}
    override fun reject(reason: Throwable) {}
}
