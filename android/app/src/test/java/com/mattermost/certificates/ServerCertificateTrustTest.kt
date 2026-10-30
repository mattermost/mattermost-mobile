package com.mattermost.certificates

import com.mattermost.networkclient.helpers.ServerCertificateStore
import com.mattermost.networkclient.helpers.ServerCertificateException
import com.mattermost.networkclient.helpers.ServerTrustManager
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import java.security.cert.CertificateException
import java.security.cert.CertificateFactory
import java.security.cert.X509Certificate
import javax.net.ssl.X509TrustManager

class ServerCertificateTrustTest {
    private val ca = ServerCertificateStore.parseCertificate(CA_PEM.toByteArray())
    private val leaf = CertificateFactory.getInstance("X.509")
        .generateCertificate(LEAF_PEM.byteInputStream()) as X509Certificate

    private val rejectingPlatform = object : X509TrustManager {
        override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) {
            throw CertificateException("Platform trust rejected the chain")
        }

        override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) {
            throw CertificateException("Platform trust rejected the chain")
        }

        override fun getAcceptedIssuers(): Array<X509Certificate> = emptyArray()
    }

    @Test
    fun parseAcceptsPemAndDerCaCertificates() {
        assertEquals(ca, ServerCertificateStore.parseCertificate(CA_PEM.toByteArray()))
        assertEquals(ca, ServerCertificateStore.parseCertificate(ca.encoded))
    }

    @Test
    fun parseRejectsLeafAndMultipleCertificates() {
        val leafError = assertThrows(ServerCertificateException::class.java) {
            ServerCertificateStore.parseCertificate(LEAF_PEM.toByteArray())
        }
        assertEquals("E_CERTIFICATE_NOT_CA", leafError.code)

        val bundleError = assertThrows(ServerCertificateException::class.java) {
            ServerCertificateStore.parseCertificate((CA_PEM + "\n" + LEAF_PEM).toByteArray())
        }
        assertEquals("E_CERTIFICATE_INVALID", bundleError.code)
    }

    @Test
    fun importedCaIsAppliedToAnExistingTrustManagerAndCanBeRemoved() {
        var imported: List<X509Certificate> = emptyList()
        val trustManager = ServerTrustManager(rejectingPlatform) { imported }

        assertThrows(CertificateException::class.java) {
            trustManager.checkServerTrusted(arrayOf(leaf), "RSA")
        }

        imported = listOf(ca)
        trustManager.checkServerTrusted(arrayOf(leaf), "RSA")
        assertTrue(trustManager.acceptedIssuers.contains(ca))

        imported = emptyList()
        assertThrows(CertificateException::class.java) {
            trustManager.checkServerTrusted(arrayOf(leaf), "RSA")
        }
    }

    @Test
    fun platformTrustStillSucceedsWithoutConsultingImportedCertificates() {
        var providerCalls = 0
        val platform = object : X509TrustManager {
            override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) = Unit
            override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) = Unit
            override fun getAcceptedIssuers(): Array<X509Certificate> = emptyArray()
        }
        val trustManager = ServerTrustManager(platform) {
            providerCalls += 1
            listOf(ca)
        }

        trustManager.checkServerTrusted(arrayOf(leaf), "RSA")
        assertEquals(0, providerCalls)
    }

    companion object {
        private const val CA_PEM = """-----BEGIN CERTIFICATE-----
MIIDNTCCAh2gAwIBAgIUY1XzOGO1+NKcGJkWYP1sWN0dgpkwDQYJKoZIhvcNAQEL
BQAwIjEgMB4GA1UEAwwXRU5DTUEgVW5pdCBUZXN0IFJvb3QgQ0EwHhcNMjYxMDI5
MTM1NDEzWhcNMzYxMDI2MTM1NDEzWjAiMSAwHgYDVQQDDBdFTkNNQSBVbml0IFRl
c3QgUm9vdCBDQTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAL7ZMtF7
cxiY69Mx3Pbx0aGXVgfdAJY0UFG+f+nPvcH882LiTHb3s47ndo8fByZ8edbWe0u3
ngSaHrzb/HY7ozJqyw6FQMTt7btQ1Zv0J76OkYGz03AvLXYjQRIU/HyjAFi6pAqr
HElAaOhgE6ffU6wzBpAzO23fcKnClONGjhk/HPWOrZa/pFz19fOqzOR2LD+tJW4I
t4/2G15a1SxjFvcKSUZNbXBUa8GyvC57IgG2rgsaecgYrp3YvE2BVWhYiSO9ff1h
kr//vOZN/rZr04Z0St6VMAkl5mX6/05nzziAr4ohDc6Wc4wCikC8Hc64B/1WYdY8
fFj96xu/BQWFDacCAwEAAaNjMGEwHwYDVR0jBBgwFoAUH8/Fq6j0Wb1SMeiJCB4H
8WNyrQ8wDwYDVR0TAQH/BAUwAwEB/zAOBgNVHQ8BAf8EBAMCAQYwHQYDVR0OBBYE
FB/Pxauo9Fm9UjHoiQgeB/Fjcq0PMA0GCSqGSIb3DQEBCwUAA4IBAQCsA2tO93fC
9YYUboFmQyBbLtYF0uk7W92egoEF1T6Vd1FiqVWJSJkw+zGeVY1vD4LJK2V4hTWK
lo5XrgpTMd2PS4MusF2b0OjAidnfYbL5yzglnmYR7eLLE6Ub05KP68I0+xu0JZgu
qoTvs1KtRpxsxAZ7X7jZF8+Bsj0xjmKI2xyanclJSXOAoLR38bcAVQPRyjt7YhJE
H3Sn1tWB2lfntxnDXBctzRS02OhIDyObeywFMgANuIkMIsNowHeZCpyAEFQWVatV
ViVKRAai+rYSScLEj3xLIX2sXuspY5JhlfG8jstCJHsSWwIjjKQz41ljzPZ8ZPZF
YxWTjNSVEdW3
-----END CERTIFICATE-----"""

        private const val LEAF_PEM = """-----BEGIN CERTIFICATE-----
MIIDZTCCAk2gAwIBAgIUHt6IZtwxDLemLzc9o5sNRxVbVAUwDQYJKoZIhvcNAQEL
BQAwIjEgMB4GA1UEAwwXRU5DTUEgVW5pdCBUZXN0IFJvb3QgQ0EwHhcNMjYxMDI5
MTM1NDEzWhcNMzYxMDI2MTM1NDEzWjAeMRwwGgYDVQQDDBNzZXJ2ZXIuZXhhbXBs
ZS50ZXN0MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArI6b2WnOZtyG
0/6V1poTw9gy5cE6MVuW2Nxgg+0hcWV0QtPHvxKlX550cymFp+rsYvdKlf/qRKXy
XdU1ApU7lhiLWdCSJSVh+d2fpwavyy/9k6j46j6t/7N3HMiK64+VYvzp+8QubBfO
cryoVAsEUo9ADQ5WSMu2pPAJEgj273PD6QeM18yl6Ao0RcsgdvfimYe3uxMcRDs0
CyTgprS2P7moxi8akc3Y5uN0CRaeV8s/lK5MR2O5x1V5VAW6cfYRMyylgxX5ZQ7J
/da776AQBK65RG8ICn1ThhxBk+apardVaiZVeZN+Z6uUo9FqA42rXlRxpBrF4hLx
wS5bMrrbDwIDAQABo4GWMIGTMAwGA1UdEwEB/wQCMAAwDgYDVR0PAQH/BAQDAgWg
MBMGA1UdJQQMMAoGCCsGAQUFBwMBMB4GA1UdEQQXMBWCE3NlcnZlci5leGFtcGxl
LnRlc3QwHQYDVR0OBBYEFIbPlIt9/HB9EqVUs78Bg7M6NCveMB8GA1UdIwQYMBaA
FB/Pxauo9Fm9UjHoiQgeB/Fjcq0PMA0GCSqGSIb3DQEBCwUAA4IBAQCMNFlAem/t
MRPAxd816y/XaEOyRwx/uJ4uZFHg+odvsBFjCTuX+TfhGDWHHaVPwrlrfKskj3Uj
53C2wDV7BbXVtQBjIM4aj0/6JCHjPji6xIP0Wy1PtWLXwhLzepZOVjbC9bayU8Dl
4gsWWkgbpuXz4PXwdsH8XSX0hJWul6XXH31l7zO9PecZvMSQ4Ul2rrVDweIR+Fxe
D0CKq85ZBOq3G5XRb88PgYaoMhRR/iVuH9+4i3ezIcROYLANafA7/qzEY0BwYiq3
1NvSTtrDLn0/JavVtt8Z6jTDl6zXxfpghBr/vxYCd2mPpwckxwH206yCdXcoS8ro
Yvnlu0fUUqmT
-----END CERTIFICATE-----"""
    }
}
