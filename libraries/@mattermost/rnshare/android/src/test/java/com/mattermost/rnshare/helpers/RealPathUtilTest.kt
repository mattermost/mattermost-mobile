package com.mattermost.rnshare.helpers

import android.content.ComponentName
import android.content.ContentProvider
import android.content.ContentValues
import android.content.Context
import android.content.ContextWrapper
import android.content.IntentFilter
import android.content.pm.ProviderInfo
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import android.os.Environment
import android.os.ParcelFileDescriptor
import android.os.Process
import android.os.storage.StorageManager
import android.provider.DocumentsContract
import android.provider.OpenableColumns
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assume.assumeTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.shadows.ShadowContentResolver
import org.robolectric.shadows.StorageVolumeBuilder
import java.io.File
import java.nio.file.Files

private const val GOOGLE_PHOTOS_AUTHORITY = "com.google.android.apps.photos.content"
private const val DOWNLOADS_AUTHORITY = "com.android.providers.downloads.documents"
private const val GENUINE_AUTHORITY = "com.example.genuine.provider"
private const val SECRET = "secret-session-cookie"
private const val SHARED_CONTENT = "shared-content"
private val MEDIA_AND_OBB = listOf("media", "obb")

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
    fun `should resolve a file uri in shared storage`() {
        val sharedFile = File(addSharedStorageVolume(), "Download/report.pdf").apply {
            parentFile?.mkdirs()
            writeText(SHARED_CONTENT)
        }

        assertEquals(sharedFile.canonicalPath, RealPathUtil.getRealPathFromURI(context, Uri.fromFile(sharedFile)))
    }

    @Test
    fun `should not resolve a file uri in this app's external storage`() {
        addSharedStorageVolume()
        val appFile = File(context.getExternalFilesDir(null), "attachment.pdf").apply { writeText(SECRET) }

        assertNull(RealPathUtil.getRealPathFromURI(context, Uri.fromFile(appFile)))
    }

    @Test
    fun `should not resolve a file uri in this app's external media or obb storage`() {
        val root = addSharedStorageVolume()
        val deviceContext = withMediaAndObbDirs(root)

        for (type in MEDIA_AND_OBB) {
            val appFile = File(root, "Android/$type/${context.packageName}/attachment.pdf").apply {
                parentFile?.mkdirs()
                writeText(SECRET)
            }
            assertNull(RealPathUtil.getRealPathFromURI(deviceContext, Uri.fromFile(appFile)))
        }
    }

    @Test
    fun `should resolve a file uri in another app's external media or obb storage`() {
        val root = addSharedStorageVolume()
        val deviceContext = withMediaAndObbDirs(root)

        for (type in MEDIA_AND_OBB) {
            val otherAppFile = File(root, "Android/$type/com.example.other/photo.jpg").apply {
                parentFile?.mkdirs()
                writeText(SHARED_CONTENT)
            }
            assertEquals(otherAppFile.canonicalPath, RealPathUtil.getRealPathFromURI(deviceContext, Uri.fromFile(otherAppFile)))
        }
    }

    @Test
    fun `should not resolve a file uri in this app's external storage spelled with different case`() {
        val root = addSharedStorageVolume()
        val appFile = File(context.getExternalFilesDir(null), "attachment.pdf").apply { writeText(SECRET) }
        val caseVariant = File(root, appFile.relativeTo(root).path.uppercase())
        assumeTrue("requires a case-insensitive filesystem", caseVariant.exists())

        assertNull(RealPathUtil.getRealPathFromURI(context, Uri.fromFile(caseVariant)))
    }

    @Test
    fun `should not resolve a file uri in shared storage that links into private storage`() {
        val link = File(addSharedStorageVolume().canonicalFile, "Download/link").apply { parentFile?.mkdirs() }
        Files.createSymbolicLink(link.toPath(), privateFile.toPath())

        assertNull(RealPathUtil.getRealPathFromURI(context, Uri.fromFile(link)))
    }

    @Test
    fun `should not resolve a spoofed downloads raw document id to a private file`() {
        registerDocumentsProvider(DOWNLOADS_AUTHORITY)
        val uri = DocumentsContract.buildDocumentUri(DOWNLOADS_AUTHORITY, "raw:${privateFile.absolutePath}")

        assertNull(RealPathUtil.getRealPathFromURI(context, uri))
    }

    @Test
    fun `should not copy a content uri served by this app's own provider`() {
        val ownAuthority = "${context.packageName}.provider"
        val provider = registerContentProvider(ownAuthority, displayName = "server.db", packageName = context.packageName)
        // Android routes user-prefixed authorities to the same provider; Robolectric needs it registered explicitly.
        ShadowContentResolver.registerProviderInternal("0@$ownAuthority", provider)

        assertNull(RealPathUtil.getRealPathFromURI(context, Uri.parse("content://$ownAuthority/files/databases/server.db")))
        assertNull(RealPathUtil.getRealPathFromURI(context, Uri.parse("content://0@$ownAuthority/files/databases/server.db")))
    }

    @Test
    fun `should copy a genuine content uri into the share cache with a sanitized name`() {
        registerContentProvider(GENUINE_AUTHORITY, displayName = "../../..%2Fevil.txt")
        val uri = Uri.parse("content://$GENUINE_AUTHORITY/files/1")

        assertCopiedToShareCache(RealPathUtil.getRealPathFromURI(context, uri), ".._2Fevil.txt")
    }

    @Test
    fun `should keep separate copies of content uris with the same name`() {
        registerContentProvider(GENUINE_AUTHORITY, displayName = "report.pdf")
        val uri = Uri.parse("content://$GENUINE_AUTHORITY/files/1")

        val first = RealPathUtil.getRealPathFromURI(context, uri)
        val second = RealPathUtil.getRealPathFromURI(context, uri)

        assertCopiedToShareCache(first, "report.pdf")
        assertCopiedToShareCache(second, "report.pdf")
        assertNotEquals(first, second)
    }

    @Test
    fun `should copy a genuine Google Photos uri into the share cache`() {
        registerContentProvider(GOOGLE_PHOTOS_AUTHORITY, displayName = "photo.jpg")
        val uri = Uri.parse("content://$GOOGLE_PHOTOS_AUTHORITY/0/1/mediakey%3A%2Flocal%253A123/ORIGINAL/NONE/1234")

        assertCopiedToShareCache(RealPathUtil.getRealPathFromURI(context, uri), "photo.jpg")
    }

    @Test
    fun `should not leave a partial copy when a content uri cannot be read`() {
        registerContentProvider(GENUINE_AUTHORITY, displayName = "report.pdf")
        FakeProvider.source = File(context.filesDir, "missing")
        val uri = Uri.parse("content://$GENUINE_AUTHORITY/files/1")

        assertNull(RealPathUtil.getRealPathFromURI(context, uri))
        assertEquals(0, File(context.cacheDir, RealPathUtil.CACHE_DIR_NAME).listFiles()?.size ?: 0)
    }

    private fun assertCopiedToShareCache(path: String?, expectedName: String) {
        val copy = File(requireNotNull(path))
        assertEquals(expectedName, copy.name)
        assertEquals(File(context.cacheDir, RealPathUtil.CACHE_DIR_NAME), copy.parentFile?.parentFile)
        assertEquals(SHARED_CONTENT, copy.readText())
    }

    private fun addSharedStorageVolume(): File {
        // Robolectric keeps external dirs side by side; their parent holds the app-specific dirs, as a device volume does.
        val root = requireNotNull(Environment.getExternalStorageDirectory().parentFile)
        val volume = StorageVolumeBuilder("primary", root, "Internal storage", Process.myUserHandle(), Environment.MEDIA_MOUNTED)
            .setIsPrimary(true)
            .setIsEmulated(true)
            .build()
        shadowOf(context.getSystemService(StorageManager::class.java)).addStorageVolume(volume)
        return root
    }

    // Robolectric provides no media or obb dirs, so lay them out as a device volume does.
    private fun withMediaAndObbDirs(root: File): Context {
        val packageName = context.packageName
        return object : ContextWrapper(context) {
            @Deprecated("Deprecated in Java")
            override fun getExternalMediaDirs() = arrayOf(File(root, "Android/media/$packageName"))
            override fun getObbDirs() = arrayOf(File(root, "Android/obb/$packageName"))
        }
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

    private fun registerContentProvider(
        authority: String,
        displayName: String,
        packageName: String = "com.example.genuine",
    ): FakeProvider {
        val source = File(context.filesDir, "provider-source").apply { writeText(SHARED_CONTENT) }
        FakeProvider.displayName = displayName
        FakeProvider.source = source
        val providerInfo = ProviderInfo().apply {
            this.authority = authority
            this.packageName = packageName
            name = FakeProvider::class.java.name
        }
        shadowOf(context.packageManager).addOrUpdateProvider(providerInfo)
        return Robolectric.buildContentProvider(FakeProvider::class.java).create(providerInfo).get()
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
