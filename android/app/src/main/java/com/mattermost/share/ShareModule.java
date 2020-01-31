package com.mattermost.share;

import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.Arguments;
import com.mattermost.rnbeta.MainApplication;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;

import java.io.File;
import java.util.ArrayList;

import javax.annotation.Nullable;

import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONException;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.MultipartBody;
import okhttp3.RequestBody;
import okhttp3.Response;

public class ShareModule extends ReactContextBaseJavaModule {
    private final OkHttpClient client = new OkHttpClient();
    public static final MediaType JSON = MediaType.parse("application/json; charset=utf-8");
    private final MainApplication mApplication;
    public static final String CACHE_DIR_NAME = "mmShare";

    public ShareModule(MainApplication application, ReactApplicationContext reactContext) {
        super(reactContext);
        mApplication = application;
    }
    private File tempFolder;

    @Override
    public String getName() {
        return "MattermostShare";
    }

    @ReactMethod
    public void clear() {
        Activity currentActivity = getCurrentActivity();

        if (currentActivity != null) {
            Intent intent = currentActivity.getIntent();
            intent.setAction("");
            intent.removeExtra(Intent.EXTRA_TEXT);
            intent.removeExtra(Intent.EXTRA_STREAM);
        }
    }

    @Nullable
    @Override
    public Map<String, Object> getConstants() {
        HashMap<String, Object> constants = new HashMap<>(1);
        constants.put("cacheDirName", CACHE_DIR_NAME);
        constants.put("isOpened", mApplication.sharedExtensionIsOpened);
        mApplication.sharedExtensionIsOpened = false;
        return constants;
    }

    @ReactMethod
    public void close(ReadableMap data) {
        this.clear();
        Activity currentActivity = getCurrentActivity();
        if (currentActivity != null) {
            currentActivity.finishAndRemoveTask();
        }

        if (data != null && data.hasKey("url")) {
            ReadableArray files = data.getArray("files");
            String serverUrl = data.getString("url");
            String token = data.getString("token");
            JSONObject postData = buildPostObject(data);

            if (files.size() > 0) {
                uploadFiles(serverUrl, token, files, postData);
            } else {
                try {
                    post(serverUrl, token, postData);
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
        }

        RealPathUtil.deleteTempFiles(this.tempFolder);
    }

    @ReactMethod
    public void data(Promise promise) {
        promise.resolve(processIntent());
    }

    @ReactMethod
    public void getFilePath(String filePath, Promise promise) {
        Activity currentActivity = getCurrentActivity();
        WritableMap map = Arguments.createMap();

        if (currentActivity != null) {
            Uri uri = Uri.parse(filePath);
            String path = RealPathUtil.getRealPathFromURI(currentActivity, uri);
            if (path != null) {
                String text = "file://" + path;
                map.putString("filePath", text);
            }
        }

        promise.resolve(map);
    }

    public WritableArray processIntent() {
        WritableMap map = Arguments.createMap();
        WritableArray items = Arguments.createArray();

        String text = "";
        String type = "";
        String action = "";

        Activity currentActivity = getCurrentActivity();

        if (currentActivity != null) {
            this.tempFolder = new File(currentActivity.getCacheDir(), CACHE_DIR_NAME);
            Intent intent = currentActivity.getIntent();
            action = intent.getAction();
            type = intent.getType();
            if (type == null) {
                type = "";
            }

            if (Intent.ACTION_SEND.equals(action) && "text/plain".equals(type)) {
                text = intent.getStringExtra(Intent.EXTRA_TEXT);
                map.putString("value", text);
                map.putString("type", type);
                items.pushMap(map);
            } else if (Intent.ACTION_SEND.equals(action)) {
                Uri uri = (Uri) intent.getParcelableExtra(Intent.EXTRA_STREAM);
                if (uri != null) {
                    text = "file://" + RealPathUtil.getRealPathFromURI(currentActivity, uri);
                    map.putString("value", text);

                    if (type.equals("image/*")) {
                        type = "image/jpeg";
                    } else if (type.equals("video/*")) {
                        type = "video/mp4";
                    }

                    map.putString("type", type);
                    items.pushMap(map);
                }
            } else if (Intent.ACTION_SEND_MULTIPLE.equals(action)) {
                ArrayList<Uri> uris = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
                for (Uri uri : uris) {
                    String filePath = RealPathUtil.getRealPathFromURI(currentActivity, uri);
                    map = Arguments.createMap();
                    text = "file://" + filePath;
                    map.putString("value", text);

                    type = RealPathUtil.getMimeTypeFromUri(currentActivity, uri);
                    if (type != null) {
                        if (type.equals("image/*")) {
                            type = "image/jpeg";
                        } else if (type.equals("video/*")) {
                            type = "video/mp4";
                        }
                    } else {
                        type = "application/octet-stream";
                    }
                    map.putString("type", type);
                    items.pushMap(map);
                }
            }
        }

        return items;
    }

    private JSONObject buildPostObject(ReadableMap data) {
        JSONObject json = new JSONObject();
        try {
            json.put("user_id", data.getString("currentUserId"));
            json.put("channel_id", data.getString("channelId"));
            json.put("message", data.getString("value"));
        } catch (JSONException e) {
            e.printStackTrace();
        }
        return json;
    }

    private void post(String serverUrl, String token, JSONObject postData) throws IOException {
        RequestBody body = RequestBody.create(JSON, postData.toString());
        Request request = new Request.Builder()
                .header("Authorization", "BEARER " + token)
                .url(serverUrl + "/api/v4/posts")
                .post(body)
                .build();
        Response response = client.newCall(request).execute();
    }

    private void uploadFiles(String serverUrl, String token, ReadableArray files, JSONObject postData) {
        try {
            MultipartBody.Builder builder = new MultipartBody.Builder()
                    .setType(MultipartBody.FORM);

            for(int i = 0 ; i < files.size() ; i++) {
                ReadableMap file = files.getMap(i);
                String filePath = file.getString("fullPath").replaceFirst("file://", "");
                File fileInfo = new File(filePath);
                if (fileInfo.exists()) {
                    final MediaType MEDIA_TYPE = MediaType.parse(file.getString("mimeType"));
                    builder.addFormDataPart("files", file.getString("filename"), RequestBody.create(MEDIA_TYPE, fileInfo));
                }
            }

            builder.addFormDataPart("channel_id", postData.getString("channel_id"));
            RequestBody body = builder.build();
            Request request = new Request.Builder()
                    .header("Authorization", "BEARER " + token)
                    .url(serverUrl + "/api/v4/files")
                    .post(body)
                    .build();

            try (Response response = client.newCall(request).execute()) {
                if (response.isSuccessful()) {
                    String responseData = response.body().string();
                    JSONObject responseJson = new JSONObject(responseData);
                    JSONArray fileInfoArray = responseJson.getJSONArray("file_infos");
                    JSONArray file_ids = new JSONArray();
                    for(int i = 0 ; i < fileInfoArray.length() ; i++) {
                        JSONObject fileInfo = fileInfoArray.getJSONObject(i);
                        file_ids.put(fileInfo.getString("id"));
                    }
                    postData.put("file_ids", file_ids);
                    post(serverUrl, token, postData);
                }
            } catch (IOException e) {
                e.printStackTrace();
            }

        } catch (JSONException e) {
            e.printStackTrace();
        }
    }
}
