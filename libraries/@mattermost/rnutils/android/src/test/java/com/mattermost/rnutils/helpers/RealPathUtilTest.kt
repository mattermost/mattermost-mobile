package com.mattermost.rnutils.helpers

import android.content.ComponentName
import android.content.ContentProvider
import android.content.ContentValues
import android.content.Context
import android.content.IntentFilter
import android.content.pm.ProviderInfo
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import android.os.ParcelFileDescriptor
import android.provider.DocumentsContract
import android.provider.OpenableColumns
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import java.io.File

private const val GOOGLE_PHOTOS_AUTHORITY = "com.google.android.apps.photos.content"
private const val DOWNLOADS_AUTHORITY = "com.android.providers.downloads.documents"
private const val GENUINE_AUTHORITY = "com.example.genuine.provider"
private const val SECRET = "secret-session-cookie"
private const val SHARED_CONTENT = "shared-content"

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class RealPathUtilTest {
    private lateinit var context: Context
    private lateinit var privateFile: File

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext()
        privateFile = File(context.dataDir, "app_webview/Default/Cookies").apply {
            parentFile?.mkdirs()
            writeText(SECRET)
        }
    }

    @Test
    fun `should not resolve a spoofed Google Photos uri to a private file`() {
        val uri = Uri.parse("content://$GOOGLE_PHOTOS_AUTHORITY/0/${Uri.encode(privateFile.absolutePath)}")

        assertNull(RealPathUtil.getRealPathFromURI(context, uri))
    }

    @Test
    fun `should not resolve a file uri pointing into private storage`() {
        val uri = Uri.fromFile(privateFile)

        assertNull(RealPathUtil.getRealPathFromURI(context, uri))
    }

    @Test
    fun `should resolve a file uri for a picker result in the cache directory`() {
        val pickerResult = File(context.cacheDir, "rn_image_picker_lib_temp_1.jpg").apply { writeText(SHARED_CONTENT) }
        val uri = Uri.fromFile(pickerResult)

        assertEquals(pickerResult.absolutePath, RealPathUtil.getRealPathFromURI(context, uri))
    }

    @Test
    fun `should not resolve a spoofed downloads raw document id to a private file`() {
        registerDocumentsProvider(DOWNLOADS_AUTHORITY)
        val uri = DocumentsContract.buildDocumentUri(DOWNLOADS_AUTHORITY, "raw:${privateFile.absolutePath}")

        assertNull(RealPathUtil.getRealPathFromURI(context, uri))
    }

    @Test
    fun `should copy a genuine content uri into the share cache with a sanitized name`() {
        registerContentProvider(GENUINE_AUTHORITY, displayName = "../../evil.txt")
        val uri = Uri.parse("content://$GENUINE_AUTHORITY/files/1")

        val path = RealPathUtil.getRealPathFromURI(context, uri)

        assertEquals(File(context.cacheDir, "${CACHE_DIR_NAME}/evil.txt").absolutePath, path)
        assertEquals(SHARED_CONTENT, File(path!!).readText())
    }

    @Test
    fun `should copy a genuine Google Photos uri into the share cache`() {
        registerContentProvider(GOOGLE_PHOTOS_AUTHORITY, displayName = "photo.jpg")
        val uri = Uri.parse("content://$GOOGLE_PHOTOS_AUTHORITY/0/1/mediakey%3A%2Flocal%253A123/ORIGINAL/NONE/1234")

        val path = RealPathUtil.getRealPathFromURI(context, uri)

        assertEquals(File(context.cacheDir, "${CACHE_DIR_NAME}/photo.jpg").absolutePath, path)
        assertEquals(SHARED_CONTENT, File(path!!).readText())
    }

    private fun registerDocumentsProvider(authority: String) {
        val providerInfo = ProviderInfo().apply {
            this.authority = authority
            packageName = "com.android.providers.downloads"
            name = "com.android.providers.downloads.DownloadStorageProvider"
            exported = true
        }
        val packageManager = shadowOf(context.packageManager)
        packageManager.addOrUpdateProvider(providerInfo)
        packageManager.addIntentFilterForProvider(
            ComponentName(providerInfo.packageName, providerInfo.name),
            IntentFilter(DocumentsContract.PROVIDER_INTERFACE),
        )
    }

    private fun registerContentProvider(authority: String, displayName: String) {
        val source = File(context.filesDir, "provider-source").apply { writeText(SHARED_CONTENT) }
        FakeProvider.displayName = displayName
        FakeProvider.source = source
        Robolectric.buildContentProvider(FakeProvider::class.java).create(authority)
    }

    class FakeProvider : ContentProvider() {
        companion object {
            lateinit var displayName: String
            lateinit var source: File
        }

        override fun onCreate() = true

        override fun query(
            uri: Uri,
            projection: Array<out String>?,
            selection: String?,
            selectionArgs: Array<out String>?,
            sortOrder: String?,
        ): Cursor = MatrixCursor(arrayOf(OpenableColumns.DISPLAY_NAME)).apply { addRow(arrayOf(displayName)) }

        override fun openFile(uri: Uri, mode: String): ParcelFileDescriptor =
            ParcelFileDescriptor.open(source, ParcelFileDescriptor.MODE_READ_ONLY)

        override fun getType(uri: Uri): String? = null
        override fun insert(uri: Uri, values: ContentValues?): Uri? = null
        override fun delete(uri: Uri, selection: String?, selectionArgs: Array<out String>?) = 0
        override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<out String>?) = 0
    }
}
