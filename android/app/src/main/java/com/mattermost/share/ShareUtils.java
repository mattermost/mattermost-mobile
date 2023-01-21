package com.mattermost.share;

import android.app.Activity;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.MediaMetadataRetriever;
import android.net.Uri;
import android.webkit.URLUtil;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.mattermost.helpers.RealPathUtil;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.util.UUID;

public class ShareUtils {
    public static ReadableMap getTextItem(String text) {
        WritableMap map = Arguments.createMap();
        map.putString("value", text);
        map.putString("type", "");
        map.putBoolean("isString", true);
        return map;
    }

    public static ReadableMap getFileItem(Activity activity, Uri uri) {
        WritableMap map = Arguments.createMap();
        String filePath = RealPathUtil.getRealPathFromURI(activity, uri);
        if (filePath == null) {
            return null;
        }

        File file = new File(filePath);
        String type = RealPathUtil.getMimeTypeFromUri(activity, uri);
        if (type != null) {
            if (type.startsWith("image/")) {
                BitmapFactory.Options bitMapOption = ShareUtils.getImageDimensions(filePath);
                map.putInt("height", bitMapOption.outHeight);
                map.putInt("width", bitMapOption.outWidth);

            } else if (type.startsWith("video/")) {
                File cacheDir = new File(activity.getCacheDir(), RealPathUtil.CACHE_DIR_NAME);
                addVideoThumbnailToMap(cacheDir, activity.getApplicationContext(), map, "file://" + filePath);
            }
        } else {
            type = "application/octet-stream";
        }

        map.putString("value", "file://" + filePath);
        map.putDouble("size", (double) file.length());
        map.putString("filename", file.getName());
        map.putString("type", type);
        map.putString("extension", RealPathUtil.getExtension(filePath).replaceFirst(".", ""));
        map.putBoolean("isString", false);
        return map;
    }

    public static BitmapFactory.Options getImageDimensions(String filePath) {
        BitmapFactory.Options bitMapOption = new BitmapFactory.Options();
        bitMapOption.inJustDecodeBounds=true;
        BitmapFactory.decodeFile(filePath, bitMapOption);
        return bitMapOption;
    }

    private static void addVideoThumbnailToMap(File cacheDir, Context context, WritableMap map, String filePath) {
        String fileName = ("thumb-" + UUID.randomUUID().toString()) + ".png";
        OutputStream fOut = null;

        try {
            File file = new File(cacheDir, fileName);
            Bitmap image = getBitmapAtTime(context, filePath, 1);
            if (file.createNewFile()) {
                fOut = new FileOutputStream(file);
                image.compress(Bitmap.CompressFormat.PNG, 100, fOut);
                fOut.flush();
                fOut.close();

                map.putString("videoThumb", "file://" + file.getAbsolutePath());
                map.putInt("width", image.getWidth());
                map.putInt("height", image.getHeight());
            }
        } catch (Exception ignored) {
        }
    }

    private static Bitmap getBitmapAtTime(Context context, String filePath, int time) {
        try {
            MediaMetadataRetriever retriever = new MediaMetadataRetriever();
            if (URLUtil.isFileUrl(filePath)) {
                String decodedPath;
                try {
                    decodedPath = URLDecoder.decode(filePath, "UTF-8");
                } catch (UnsupportedEncodingException e) {
                    decodedPath = filePath;
                }

                retriever.setDataSource(decodedPath.replace("file://", ""));
            } else if (filePath.contains("content://")) {
                retriever.setDataSource(context, Uri.parse(filePath));
            }

            Bitmap image = retriever.getFrameAtTime(time * 1000, MediaMetadataRetriever.OPTION_CLOSEST_SYNC);
            retriever.release();
            return image;
        } catch (Exception e) {
            throw new IllegalStateException("File doesn't exist or not supported");
        }
    }
}
