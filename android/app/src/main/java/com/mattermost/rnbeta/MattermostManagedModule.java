package com.mattermost.rnbeta;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.text.TextUtils;
import android.webkit.MimeTypeMap;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.content.FileProvider;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.GuardedResultAsyncTask;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import com.mattermost.helpers.Credentials;
import com.reactlibrary.createthumbnail.CreateThumbnailModule;
import com.mattermost.helpers.RealPathUtil;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.lang.ref.WeakReference;
import java.net.URL;
import java.nio.channels.FileChannel;
import java.util.Objects;

public class MattermostManagedModule extends ReactContextBaseJavaModule {
    private static final String SAVE_EVENT = "MattermostManagedSaveFile";
    private static final Integer SAVE_REQUEST = 38641;
    private static MattermostManagedModule instance;
    private ReactApplicationContext reactContext;

    private Promise mPickerPromise;
    private String fileContent;

    private MattermostManagedModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        // Let the document provider know you're done by closing the stream.
        ActivityEventListener mActivityEventListener = new BaseActivityEventListener() {
            @Override
            public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent intent) {
                if (requestCode == SAVE_REQUEST) {
                    if (mPickerPromise != null) {
                        if (resultCode == Activity.RESULT_CANCELED) {
                            mPickerPromise.reject(SAVE_EVENT, "Save operation cancelled");
                        } else if (resultCode == Activity.RESULT_OK) {
                            Uri uri = intent.getData();
                            if (uri == null) {
                                mPickerPromise.reject(SAVE_EVENT, "No data found");
                            } else {
                                try {
                                    new SaveDataTask(reactContext, fileContent, uri).execute();
                                    mPickerPromise.resolve(uri.toString());
                                } catch (Exception e) {
                                    mPickerPromise.reject(SAVE_EVENT, e.getMessage());
                                }
                            }
                        }

                        mPickerPromise = null;
                    } else if (resultCode == Activity.RESULT_OK) {
                        try {
                            Uri uri = intent.getData();
                            if (uri != null)
                                new SaveDataTask(reactContext, fileContent, uri).execute();
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    }
                }
            }
        };
        reactContext.addActivityEventListener(mActivityEventListener);
    }

    public static MattermostManagedModule getInstance(ReactApplicationContext reactContext) {
        if (instance == null) {
            instance = new MattermostManagedModule(reactContext);
        } else {
            instance.reactContext = reactContext;
        }

        return instance;
    }

    public static MattermostManagedModule getInstance() {
        return instance;
    }

    public void sendEvent(String eventName,
                           @Nullable WritableMap params) {
        this.reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
    }

    @Override
    @NonNull
    public String getName() {
        return "MattermostManaged";
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

    @ReactMethod
    public void saveFile(String path, final Promise promise) {
        Uri contentUri;
        String filename = "";
        if(path.startsWith("content://")) {
            contentUri = Uri.parse(path);
        } else {
            File newFile = new File(path);
            filename = newFile.getName();
            Activity currentActivity = getCurrentActivity();
            if(currentActivity == null) {
                promise.reject(SAVE_EVENT, "Activity doesn't exist");
                return;
            }
            try {
                final String packageName = currentActivity.getPackageName();
                final String authority = packageName + ".provider";
                contentUri = FileProvider.getUriForFile(currentActivity, authority, newFile);
            }
            catch(IllegalArgumentException e) {
                promise.reject(SAVE_EVENT, e.getMessage());
                return;
            }
        }

        if(contentUri == null) {
            promise.reject(SAVE_EVENT, "Invalid file");
            return;
        }

        String extension = MimeTypeMap.getFileExtensionFromUrl(path).toLowerCase();
        String mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);
        if (mimeType == null) {
            mimeType = RealPathUtil.getMimeType(path);
        }

        Intent intent = new Intent();
        intent.setAction(Intent.ACTION_CREATE_DOCUMENT);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType);
        intent.putExtra(Intent.EXTRA_TITLE, filename);

        PackageManager pm = Objects.requireNonNull(getCurrentActivity()).getPackageManager();
        if (intent.resolveActivity(pm) != null) {
            try {
                getCurrentActivity().startActivityForResult(intent, SAVE_REQUEST);
                mPickerPromise = promise;
                fileContent = path;
            }
            catch(Exception e) {
                promise.reject(SAVE_EVENT, e.getMessage());
            }
        } else {
            try {
                if(mimeType == null) {
                    throw new Exception("It wasn't possible to detect the type of the file");
                }
                throw new Exception("No app associated with this mime type");
            }
            catch(Exception e) {
                promise.reject(SAVE_EVENT, e.getMessage());
            }
        }
    }

    @ReactMethod
    public void createThumbnail(ReadableMap options, Promise promise) {
        try {
            WritableMap optionsMap = Arguments.createMap();
            optionsMap.merge(options);
            String url = options.hasKey("url") ? options.getString("url") : "";
            URL videoUrl = new URL(url);
            String serverUrl = videoUrl.getProtocol() + "://" + videoUrl.getHost() + ":" + videoUrl.getPort();
            String token = Credentials.getCredentialsForServerSync(this.reactContext, serverUrl);
            if (!TextUtils.isEmpty(token)) {
                WritableMap headers = Arguments.createMap();
                if (optionsMap.hasKey("headers")) {
                    headers.merge(Objects.requireNonNull(optionsMap.getMap("headers")));
                }
                headers.putString("Authorization", "Bearer " + token);
                optionsMap.putMap("headers", headers);
            }
            CreateThumbnailModule thumb = new CreateThumbnailModule(this.reactContext);
            thumb.create(optionsMap.copy(), promise);
        } catch (Exception e) {
            promise.reject("CreateThumbnail_ERROR", e);
        }
    }

    private static class SaveDataTask extends GuardedResultAsyncTask<Object> {
        private final WeakReference<Context> weakContext;
        private final String fromFile;
        private final Uri toFile;

        protected SaveDataTask(ReactApplicationContext reactContext, String path, Uri destination) {
            super(reactContext.getExceptionHandler());
            weakContext = new WeakReference<>(reactContext.getApplicationContext());
            fromFile = path;
            toFile = destination;
        }

        @Override
        protected Object doInBackgroundGuarded() {
            try {
                ParcelFileDescriptor pfd = weakContext.get().getContentResolver().openFileDescriptor(toFile, "w");
                File input = new File(this.fromFile);
                try (FileInputStream fileInputStream = new FileInputStream(input)) {
                    try (FileOutputStream fileOutputStream = new FileOutputStream(pfd.getFileDescriptor())) {
                        FileChannel source = fileInputStream.getChannel();
                        FileChannel dest = fileOutputStream.getChannel();
                        dest.transferFrom(source, 0, source.size());
                        source.close();
                        dest.close();
                    }
                }
                pfd.close();
            } catch (Exception e) {
                e.printStackTrace();
            }

            return null;
        }

        @Override
        protected void onPostExecuteGuarded(Object o) {

        }
    }
}
