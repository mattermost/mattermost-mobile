package com.mattermost.share;

import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.Arguments;
import com.mattermost.helpers.Credentials;
import com.mattermost.rnbeta.MainApplication;
import com.mattermost.helpers.RealPathUtil;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import java.io.File;
import java.util.ArrayList;

import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONException;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.MultipartBody;
import okhttp3.RequestBody;
import okhttp3.Response;

public class ShareModule extends ReactContextBaseJavaModule {
    private final OkHttpClient client = new OkHttpClient();
    public static final MediaType JSON = MediaType.parse("application/json; charset=utf-8");
    private static ShareModule instance;
    private final MainApplication mApplication;
    private ReactApplicationContext mReactContext;
    private File tempFolder;

    private ShareModule(ReactApplicationContext reactContext) {
        super(reactContext);
        mReactContext = reactContext;
        mApplication = (MainApplication)reactContext.getApplicationContext();
    }

    public static ShareModule getInstance(ReactApplicationContext reactContext) {
        if (instance == null) {
            instance = new ShareModule(reactContext);
        } else {
            instance.mReactContext = reactContext;
        }

        return instance;
    }

    public static ShareModule getInstance() {
        return instance;
    }

    @NonNull
    @Override
    public String getName() {
        return "MattermostShare";
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    public String getCurrentActivityName() {
        Activity currentActivity = getCurrentActivity();
        if (currentActivity != null) {
            String activityName = currentActivity.getComponentName().getClassName();
            String[] components = activityName.split("\\.");
            return components[components.length - 1];
        }

        return "";
    }

    @ReactMethod
    public void clear() {
        Activity currentActivity = getCurrentActivity();
        if (currentActivity != null && this.getCurrentActivityName().equals("ShareActivity")) {
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
        constants.put("cacheDirName", RealPathUtil.CACHE_DIR_NAME);
        constants.put("isOpened", mApplication.getSharedExtensionIsOpened());
        return constants;
    }

    @ReactMethod
    public void close(ReadableMap data) {
        this.clear();
        Activity currentActivity = getCurrentActivity();
        if (currentActivity == null || !this.getCurrentActivityName().equals("ShareActivity")) {
            return;
        }

        currentActivity.finishAndRemoveTask();
        if (data != null && data.hasKey("serverUrl")) {
            ReadableArray files = data.getArray("files");
            String serverUrl = data.getString("serverUrl");
            final String token = Credentials.getCredentialsForServerSync(mReactContext, serverUrl);
            JSONObject postData = buildPostObject(data);

            if (files != null && files.size() > 0) {
                uploadFiles(serverUrl, token, files, postData);
            } else {
                try {
                    post(serverUrl, token, postData);
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
        }

        mApplication.setSharedExtensionIsOpened(false);
        RealPathUtil.deleteTempFiles(this.tempFolder);
    }

    @ReactMethod
    public void getSharedData(Promise promise) {
        promise.resolve(processIntent());
    }

    public WritableArray processIntent() {
        String type, action, extra;
        WritableArray items = Arguments.createArray();
        Activity currentActivity = getCurrentActivity();

        if (currentActivity != null) {
            this.tempFolder = new File(currentActivity.getCacheDir(), RealPathUtil.CACHE_DIR_NAME);
            Intent intent = currentActivity.getIntent();
            action = intent.getAction();
            type = intent.getType();
            extra = intent.getStringExtra(Intent.EXTRA_TEXT);

            if (Intent.ACTION_SEND.equals(action) && "text/plain".equals(type) && extra != null) {
                items.pushMap(ShareUtils.getTextItem(extra));
            } else if (Intent.ACTION_SEND.equals(action)) {
                if (extra != null) {
                    items.pushMap(ShareUtils.getTextItem(extra));
                }
                Uri uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
                if (uri != null) {
                    ReadableMap fileInfo = ShareUtils.getFileItem(currentActivity, uri);
                    if (fileInfo != null) {
                        items.pushMap(fileInfo);
                    }
                }
            } else if (Intent.ACTION_SEND_MULTIPLE.equals(action)) {
                if (extra != null) {
                    items.pushMap(ShareUtils.getTextItem(extra));
                }

                ArrayList<Uri> uris = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
                for (Uri uri : uris) {
                    ReadableMap fileInfo = ShareUtils.getFileItem(currentActivity, uri);
                    if (fileInfo != null) {
                        items.pushMap(fileInfo);
                    }
                }
            }
        }

        return items;
    }

    private JSONObject buildPostObject(ReadableMap data) {
        JSONObject json = new JSONObject();
        try {
            json.put("user_id", data.getString("userId"));
            if (data.hasKey("channelId")) {
                json.put("channel_id", data.getString("channelId"));
            }
            if (data.hasKey("message")) {
                json.put("message", data.getString("message"));
            }
        } catch (JSONException e) {
            e.printStackTrace();
        }
        return json;
    }

    private void post(String serverUrl, String token, JSONObject postData) throws IOException {
        RequestBody body = RequestBody.create(postData.toString(), JSON);
        Request request = new Request.Builder()
                .header("Authorization", "BEARER " + token)
                .url(serverUrl + "/api/v4/posts")
                .post(body)
                .build();
        client.newCall(request).execute();
    }

    private void uploadFiles(String serverUrl, String token, ReadableArray files, JSONObject postData) {
        try {
            MultipartBody.Builder builder = new MultipartBody.Builder()
                    .setType(MultipartBody.FORM);

            for(int i = 0 ; i < files.size() ; i++) {
                ReadableMap file = files.getMap(i);
                String mime = file.getString("type");
                String fullPath = file.getString("value");
                if (fullPath != null) {
                    String filePath = fullPath.replaceFirst("file://", "");
                    File fileInfo = new File(filePath);
                    if (fileInfo.exists() && mime != null) {
                        final MediaType MEDIA_TYPE = MediaType.parse(mime);
                        builder.addFormDataPart("files", file.getString("filename"), RequestBody.create(fileInfo, MEDIA_TYPE));
                    }
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
                    String responseData = Objects.requireNonNull(response.body()).string();
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
