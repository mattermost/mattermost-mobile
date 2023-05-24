package com.mattermost.helpers;

import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.content.ContentResolver;
import android.os.Environment;
import android.webkit.MimeTypeMap;
import android.util.Log;
import android.text.TextUtils;

import android.os.ParcelFileDescriptor;

import java.io.*;
import java.nio.channels.FileChannel;

// Class based on DocumentHelper https://gist.github.com/steveevers/a5af24c226f44bb8fdc3

public class RealPathUtil {
    public static final String CACHE_DIR_NAME = "mmShare";
    public static String getRealPathFromURI(final Context context, final Uri uri) {

        // DocumentProvider
        if (DocumentsContract.isDocumentUri(context, uri)) {
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
                if (!TextUtils.isEmpty(id)) {
                    if (id.startsWith("raw:")) {
                        return id.replaceFirst("raw:", "");
                    }
                    try {
                        return getPathFromSavingTempFile(context, uri);
                    } catch (NumberFormatException e) {
                        Log.e("ReactNative", "DownloadsProvider unexpected uri " + uri);
                        return null;
                    }
                }
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

                String name = getDataColumn(context, contentUri, selection, selectionArgs);
                if (!TextUtils.isEmpty(name)) {
                    return name;
                }

                return getPathFromSavingTempFile(context, uri);
            }
        }

        if ("content".equalsIgnoreCase(uri.getScheme())) {
            // MediaStore (and general)

            if (isGooglePhotosUri(uri)) {
                return uri.getLastPathSegment();
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
        String fileName = "";

        if (uri == null || uri.isRelative()) {
            return null;
        }

        // Try and get the filename from the Uri
        try {
            Cursor returnCursor =
                    context.getContentResolver().query(uri, null, null, null, null);
            int nameIndex = returnCursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
            returnCursor.moveToFirst();
            fileName = sanitizeFilename(returnCursor.getString(nameIndex));
            returnCursor.close();
        } catch (Exception e) {
            // just continue to get the filename with the last segment of the path
        }

        try {
            if (TextUtils.isEmpty(fileName)) {
                fileName = sanitizeFilename(uri.getLastPathSegment().trim());
            }


            File cacheDir = new File(context.getCacheDir(), CACHE_DIR_NAME);
            boolean cacheDirExists = cacheDir.exists();
            if (!cacheDirExists) {
                cacheDirExists = cacheDir.mkdirs();
            }

            if (cacheDirExists) {
                tmpFile = new File(cacheDir, fileName);
                boolean fileCreated = tmpFile.createNewFile();

                if (fileCreated) {
                    ParcelFileDescriptor pfd = context.getContentResolver().openFileDescriptor(uri, "r");

                    try (FileInputStream inputSrc = new FileInputStream(pfd.getFileDescriptor())) {
                        FileChannel src = inputSrc.getChannel();
                        try (FileOutputStream outputDst = new FileOutputStream(tmpFile)) {
                            FileChannel dst = outputDst.getChannel();
                            dst.transferFrom(src, 0, src.size());
                            src.close();
                            dst.close();
                        }
                    }

                    pfd.close();
                }
                return tmpFile.getAbsolutePath();
            }
        } catch (IOException ex) {
            ex.printStackTrace();
        }

        return null;
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
        String extension = "";
        if (uri == null) {
            return extension;
        }

        extension = MimeTypeMap.getFileExtensionFromUrl(uri);
        if (!extension.equals("")) {
            return extension;
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
        try {
            ContentResolver cR = context.getContentResolver();
            return cR.getType(uri);
        } catch (Exception e) {
            return "application/octet-stream";
        }
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
        if (fileOrDirectory.isDirectory()) {
                File[] files = fileOrDirectory.listFiles();
                if (files != null) {
                    for (File child : files)
                        deleteRecursive(child);
                }
        }

        if (!fileOrDirectory.delete()) {
            Log.i("ReactNative", "Couldn't delete file " + fileOrDirectory.getName());
        }
    }

    private static String sanitizeFilename(String filename) {
        if (filename == null) {
            return null;
        }

        File f = new File(filename);
        return f.getName();
    }
}
