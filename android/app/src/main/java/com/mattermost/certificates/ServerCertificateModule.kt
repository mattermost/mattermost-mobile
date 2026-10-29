package com.mattermost.certificates

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.mattermost.networkclient.helpers.ServerCertificateException
import com.mattermost.networkclient.helpers.ServerCertificateStore
import com.mattermost.networkclient.helpers.StoredServerCertificate
import java.util.concurrent.Executors

class ServerCertificateModule(
    reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
    companion object {
        const val NAME = "ENCMAServerCertificates"
    }

    private val applicationContext = reactContext.applicationContext
    private val executor = Executors.newSingleThreadExecutor()

    override fun getName(): String = NAME

    @ReactMethod
    fun importCertificate(serverUrl: String, uri: String, fileName: String?, promise: Promise) {
        executor.execute {
            run(promise) {
                val certificate = ServerCertificateStore.importCertificate(
                    applicationContext,
                    serverUrl,
                    uri,
                    fileName,
                )
                promise.resolve(certificate.toMap())
            }
        }
    }

    @ReactMethod
    fun getCertificate(serverUrl: String, promise: Promise) {
        executor.execute {
            run(promise) {
                promise.resolve(ServerCertificateStore.getCertificate(applicationContext, serverUrl)?.toMap())
            }
        }
    }

    @ReactMethod
    fun removeCertificate(serverUrl: String, promise: Promise) {
        executor.execute {
            run(promise) {
                promise.resolve(ServerCertificateStore.removeCertificate(applicationContext, serverUrl))
            }
        }
    }

    @ReactMethod
    fun reassignCertificate(previousServerUrl: String, newServerUrl: String, promise: Promise) {
        executor.execute {
            run(promise) {
                val certificate = ServerCertificateStore.reassignCertificate(
                    applicationContext,
                    previousServerUrl,
                    newServerUrl,
                )
                promise.resolve(certificate.toMap())
            }
        }
    }

    private fun run(promise: Promise, action: () -> Unit) {
        try {
            action()
        } catch (error: ServerCertificateException) {
            promise.reject(error.code, error.message)
        } catch (_: Exception) {
            promise.reject(
                "E_CERTIFICATE",
                "The certificate operation could not be completed. Try again.",
            )
        }
    }

    private fun StoredServerCertificate.toMap(): WritableMap {
        return Arguments.createMap().apply {
            putString("host", host)
            putString("fileName", fileName)
            putString("subject", certificate.subjectX500Principal.name)
            putString("fingerprint", ServerCertificateStore.fingerprint(certificate))
            putDouble("notAfter", certificate.notAfter.time.toDouble())
        }
    }
}
