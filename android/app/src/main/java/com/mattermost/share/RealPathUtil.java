package com.mattermost.share;

import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.DocumentsContract;
import android.provider.MediaStore;
import android.content.ContentUris;
import android.content.ContentResolver;
import android.os.Environment;
import android.webkit.MimeTypeMap;

import android.os.ParcelFileDescriptor;
import java.io.*;
import java.nio.channels.FileChannel;

// Class based on the steveevers DocumentHelper https://gist.github.com/steveevers/a5af24c226f44bb8fdc3

public class RealPathUtil {
    public static String getRealPathFromURI(final Context context, final Uri uri) {

        final boolean isKitKatOrNewer = Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT;

        // DocumentProvider
        if (isKitKatOrNewer && DocumentsContract.isDocumentUri(context, uri)) {
            // ExternalStorageProvider
            if (isExternalStorageDocument(uri)) {
                final String docId = DocumentsContract.getDocumentId(uri);
                final String[] split = docId.split(":");
                final String type = split[0];

                if ("primary".equalsIgnoreCase(type)) {
                    return Environment.getExternalStorageDirectory() + "/" + split[1];
                }
            } else if (isDownloadsDocument(uri)) {
                // DownloadsProvider

                final String id = DocumentsContract.getDocumentId(uri);
                final Uri contentUri = ContentUris.withAppendedId(
                        Uri.parse("content://downloads/public_downloads"), Long.valueOf(id));

                return getDataColumn(context, contentUri, null, null);
            } else if (isMediaDocument(uri)) {
                // MediaProvider

                final String docId = DocumentsContract.getDocumentId(uri);
                final String[] split = docId.split(":");
                final String type = split[0];

                Uri contentUri = null;
                if ("image".equals(type)) {
                    contentUri = MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
                } else if ("video".equals(type)) {
                    contentUri = MediaStore.Video.Media.EXTERNAL_CONTENT_URI;
                } else if ("audio".equals(type)) {
                    contentUri = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
                }

                final String selection = "_id=?";
                final String[] selectionArgs = new String[] {
                        split[1]
                };

                return getDataColumn(context, contentUri, selection, selectionArgs);
            }
        } else if ("content".equalsIgnoreCase(uri.getScheme())) {
            // MediaStore (and general)

            if (isGooglePhotosUri(uri)) {
                return uri.getLastPathSegment();
            }

            try {
                String path = getDataColumn(context, uri, null, null);

                if (path != null) {
                    return path;
                }
            } catch (Exception e) {
                // do nothing and try to get a temp file
            }

            // Try save to tmp file, and return tmp file path
            return getPathFromSavingTempFile(context, uri);
        } else if ("file".equalsIgnoreCase(uri.getScheme())) {
            return uri.getPath();
        }

        return null;
    }

    public static String getPathFromSavingTempFile(Context context, final Uri uri) {
        File tmpFile;
        try {
            String fileName = uri.getLastPathSegment();
            File cacheDir = new File(context.getCacheDir(), "mmShare");
            if (!cacheDir.exists()) {
                cacheDir.mkdirs();
            }

            String mimeType = getMimeType(uri.getPath());
            tmpFile = File.createTempFile("tmp", fileName, cacheDir);

            ParcelFileDescriptor pfd = context.getContentResolver().openFileDescriptor(uri, "r");

            FileChannel src = new FileInputStream(pfd.getFileDescriptor()).getChannel();
            FileChannel dst = new FileOutputStream(tmpFile).getChannel();
            dst.transferFrom(src, 0, src.size());
            src.close();
            dst.close();
        } catch (IOException ex) {
            return null;
        }
        return tmpFile.getAbsolutePath();
    }

    public static String getDataColumn(Context context, Uri uri, String selection,
                                       String[] selectionArgs) {

        Cursor cursor = null;
        final String column = "_data";
        final String[] projection = {
                column
        };

        try {
            cursor = context.getContentResolver().query(uri, projection, selection, selectionArgs,
                    null);
            if (cursor != null && cursor.moveToFirst()) {
                final int index = cursor.getColumnIndexOrThrow(column);
                return cursor.getString(index);
            }
        } finally {
            if (cursor != null)
                cursor.close();
        }
        return null;
    }


    public static boolean isExternalStorageDocument(Uri uri) {
        return "com.android.externalstorage.documents".equals(uri.getAuthority());
    }

    public static boolean isDownloadsDocument(Uri uri) {
        return "com.android.providers.downloads.documents".equals(uri.getAuthority());
    }

    public static boolean isMediaDocument(Uri uri) {
        return "com.android.providers.media.documents".equals(uri.getAuthority());
    }

    public static boolean isGooglePhotosUri(Uri uri) {
        return "com.google.android.apps.photos.content".equals(uri.getAuthority());
    }

    public static String getExtension(String uri) {
        if (uri == null) {
            return null;
        }

        int dot = uri.lastIndexOf(".");
        if (dot >= 0) {
            return uri.substring(dot);
        } else {
            // No extension.
            return "";
        }
    }

    public static String getMimeType(File file) {

        String extension = getExtension(file.getName());

        if (extension.length() > 0)
            return MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension.substring(1));

        return "application/octet-stream";
    }

    public static String getMimeType(String filePath) {
        File file = new File(filePath);
        return getMimeType(file);
    }

    public static String getMimeTypeFromUri(final Context context, final Uri uri) {
        ContentResolver cR = context.getContentResolver();
        return cR.getType(uri);
    }

    public static void deleteTempFiles(final File dir) {
        try {
            if (dir.isDirectory()) {
                deleteRecursive(dir);
            }
        } catch (Exception e) {
            // do nothing
        }
    }

    private static void deleteRecursive(File fileOrDirectory) {
        if (fileOrDirectory.isDirectory())
            for (File child : fileOrDirectory.listFiles())
                deleteRecursive(child);

        fileOrDirectory.delete();
    }
}
