package com.RNFetchBlob;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.util.Log;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;

// Cookies
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.network.ForwardingCookieHandler;
import com.facebook.react.modules.network.CookieJarContainer;
import com.facebook.react.modules.network.OkHttpClientProvider;
import okhttp3.OkHttpClient;
import okhttp3.JavaNetCookieJar;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

import static android.app.Activity.RESULT_OK;
import static com.RNFetchBlob.RNFetchBlobConst.GET_CONTENT_INTENT;

public class RNFetchBlob extends ReactContextBaseJavaModule {

    public static final String FETCH_BLOB_PREFERENCES = "FETCH_BLOB_PREFERENCES";

    // Cookies
    private final ForwardingCookieHandler mCookieHandler;
    private final CookieJarContainer mCookieJarContainer;
    private final OkHttpClient mClient;

    static ReactApplicationContext RCTContext;
    static LinkedBlockingQueue<Runnable> taskQueue = new LinkedBlockingQueue<>();
    static ThreadPoolExecutor threadPool = new ThreadPoolExecutor(5, 10, 5000, TimeUnit.MILLISECONDS, taskQueue);
    static LinkedBlockingQueue<Runnable> fsTaskQueue = new LinkedBlockingQueue<>();
    static ThreadPoolExecutor fsThreadPool = new ThreadPoolExecutor(2, 10, 5000, TimeUnit.MILLISECONDS, taskQueue);
    static public boolean ActionViewVisible = false;
    static HashMap<Integer, Promise> promiseTable = new HashMap<>();

    public RNFetchBlob(ReactApplicationContext reactContext) {

        super(reactContext);

        mClient = OkHttpClientProvider.getOkHttpClient();
        mCookieHandler = new ForwardingCookieHandler(reactContext);
        mCookieJarContainer = (CookieJarContainer) mClient.cookieJar();
        mCookieJarContainer.setCookieJar(new JavaNetCookieJar(mCookieHandler));

        RCTContext = reactContext;
        reactContext.addActivityEventListener(new ActivityEventListener() {
            @Override
            public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
                if(requestCode == GET_CONTENT_INTENT && resultCode == RESULT_OK) {
                    Uri d = data.getData();
                    promiseTable.get(GET_CONTENT_INTENT).resolve(d.toString());
                    promiseTable.remove(GET_CONTENT_INTENT);
                }
            }

            @Override
            public void onNewIntent(Intent intent) {

            }
        });
    }

    @Override
    public String getName() {
        return "RNFetchBlob";
    }

    @Override
    public Map<String, Object> getConstants() {
        ReactApplicationContext appContext = this.getReactApplicationContext();
        Context context = appContext.getApplicationContext();
        SharedPreferences preferences = context.getApplicationContext().getSharedPreferences(FETCH_BLOB_PREFERENCES, Context.MODE_PRIVATE);
        Map<String, Object> res = new HashMap<>();

        if (preferences.getString("DocumentDir", null) != null) {
            Log.i("FetchBlob", "from cache");
            res.put("DocumentDir", preferences.getString("DocumentDir", ""));
            res.put("CacheDir", preferences.getString("CacheDir", ""));
            res.put("DCIMDir", preferences.getString("DCIMDir", ""));
            res.put("PictureDir", preferences.getString("PictureDir", ""));
            res.put("MusicDir", preferences.getString("MusicDir", ""));
            res.put("DownloadDir", preferences.getString("DownloadDir", ""));
            res.put("MovieDir", preferences.getString("MovieDir", ""));
            res.put("RingtoneDir", preferences.getString("RingtoneDir", ""));
            res.put("SDCardDir", preferences.getString("SDCardDir", ""));
            res.put("SDCardApplicationDir", preferences.getString("SDCardApplicationDir", ""));
            res.put("MainBundleDir", preferences.getString("MainBundleDir", ""));
            return res;
        }


        res = RNFetchBlobFS.getSystemfolders(appContext);
        this.saveConstants(res, context);
        return res;
    }

    private void saveConstants(Map<String, Object> res, Context ctx) {
        SharedPreferences preferences = ctx.getSharedPreferences(FETCH_BLOB_PREFERENCES, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = preferences.edit();
        Log.e("FetchBlob", "DocumentDir: " + res.get("DocumentDir").toString());
        editor.putString("DocumentDir", res.get("DocumentDir").toString());
        editor.putString("CacheDir", res.get("CacheDir").toString());
        editor.putString("DCIMDir", res.get("DCIMDir").toString());
        editor.putString("PictureDir", res.get("PictureDir").toString());
        editor.putString("MusicDir", res.get("MusicDir").toString());
        editor.putString("DownloadDir", res.get("DownloadDir").toString());
        editor.putString("MovieDir", res.get("MovieDir").toString());
        editor.putString("RingtoneDir", res.get("RingtoneDir").toString());
        editor.putString("SDCardDir", res.get("SDCardDir").toString());
        editor.putString("SDCardApplicationDir", res.get("SDCardApplicationDir").toString());
        editor.putString("MainBundleDir", res.get("MainBundleDir").toString());
        editor.commit();
    }

    @ReactMethod
    public void createFile(final String path, final String content, final String encode, final Callback callback) {
        threadPool.execute(new Runnable() {
            @Override
            public void run() {
                RNFetchBlobFS.createFile(path, content, encode, callback);
            }
        });

    }

    @ReactMethod
    public void actionViewIntent(String path, String mime, final Promise promise) {
        try {
            Intent intent= new Intent(Intent.ACTION_VIEW)
                    .setDataAndType(Uri.parse("file://" + path), mime);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            this.getReactApplicationContext().startActivity(intent);
            ActionViewVisible = true;

            final LifecycleEventListener listener = new LifecycleEventListener() {
                @Override
                public void onHostResume() {
                    if(ActionViewVisible)
                        promise.resolve(null);
                    RCTContext.removeLifecycleEventListener(this);
                }

                @Override
                public void onHostPause() {

                }

                @Override
                public void onHostDestroy() {

                }
            };
            RCTContext.addLifecycleEventListener(listener);
        } catch(Exception ex) {
            promise.reject(ex.getLocalizedMessage());
        }
    }

    @ReactMethod
    public void createFileASCII(final String path, final ReadableArray dataArray, final Callback callback) {
        threadPool.execute(new Runnable() {
            @Override
            public void run() {
                RNFetchBlobFS.createFileASCII(path, dataArray, callback);
            }
        });

    }

    @ReactMethod
    public void writeArrayChunk(final String streamId, final ReadableArray dataArray, final Callback callback) {
        RNFetchBlobFS.writeArrayChunk(streamId, dataArray, callback);
    }

    @ReactMethod
    public void unlink(String path, Callback callback) {
        RNFetchBlobFS.unlink(path, callback);
    }

    @ReactMethod
    public void mkdir(String path, Callback callback) {
        RNFetchBlobFS.mkdir(path, callback);
    }

    @ReactMethod
    public void exists(String path, Callback callback) {
        RNFetchBlobFS.exists(path, callback);
    }

    @ReactMethod
    public void cp(final String path, final String dest, final Callback callback) {
        threadPool.execute(new Runnable() {
            @Override
            public void run() {
                RNFetchBlobFS.cp(path, dest, callback);
            }
        });

    }

    @ReactMethod
    public void mv(String path, String dest, Callback callback) {
        RNFetchBlobFS.mv(path, dest, callback);
    }

    @ReactMethod
    public void ls(String path, Callback callback) {
        RNFetchBlobFS.ls(path, callback);
    }

    @ReactMethod
    public void writeStream(String path, String encode, boolean append, Callback callback) {
        new RNFetchBlobFS(this.getReactApplicationContext()).writeStream(path, encode, append, callback);
    }

    @ReactMethod
    public void writeChunk(String streamId, String data, Callback callback) {
        RNFetchBlobFS.writeChunk(streamId, data, callback);
    }

    @ReactMethod
    public void closeStream(String streamId, Callback callback) {
        RNFetchBlobFS.closeStream(streamId, callback);
    }

    @ReactMethod
    public void removeSession(ReadableArray paths, Callback callback) {
        RNFetchBlobFS.removeSession(paths, callback);
    }

    @ReactMethod
    public void readFile(final String path, final String encoding, final Promise promise) {
        threadPool.execute(new Runnable() {
            @Override
            public void run() {
                RNFetchBlobFS.readFile(path, encoding, promise);
            }
        });
    }

    @ReactMethod
    public void writeFileArray(final String path, final ReadableArray data, final boolean append, final Promise promise) {
        threadPool.execute(new Runnable() {
            @Override
            public void run() {
                RNFetchBlobFS.writeFile(path, data, append, promise);
            }
        });
    }

    @ReactMethod
    public void writeFile(final String path, final String encoding, final String data, final boolean append, final Promise promise) {
        threadPool.execute(new Runnable() {
            @Override
            public void run() {
                RNFetchBlobFS.writeFile(path, encoding, data, append, promise);
            }
        });

    }

    @ReactMethod
    public void lstat(String path, Callback callback) {
        RNFetchBlobFS.lstat(path, callback);
    }

    @ReactMethod
    public void stat(String path, Callback callback) {
        RNFetchBlobFS.stat(path, callback);
    }

    @ReactMethod
    public void scanFile(final ReadableArray pairs, final Callback callback) {
        final ReactApplicationContext ctx = this.getReactApplicationContext();
        threadPool.execute(new Runnable() {
            @Override
            public void run() {
                int size = pairs.size();
                String [] p = new String[size];
                String [] m = new String[size];
                for(int i=0;i<size;i++) {
                    ReadableMap pair = pairs.getMap(i);
                    if(pair.hasKey("path")) {
                        p[i] = pair.getString("path");
                        if(pair.hasKey("mime"))
                            m[i] = pair.getString("mime");
                        else
                            m[i] = null;
                    }
                }
                new RNFetchBlobFS(ctx).scanFile(p, m, callback);
            }
        });

    }

    @ReactMethod
    /**
     * @param path Stream file path
     * @param encoding Stream encoding, should be one of `base64`, `ascii`, and `utf8`
     * @param bufferSize Stream buffer size, default to 4096 or 4095(base64).
     */
    public void readStream(final String path, final String encoding, final int bufferSize, final int tick, final String streamId) {
        final ReactApplicationContext ctx = this.getReactApplicationContext();
        fsThreadPool.execute(new Runnable() {
            @Override
            public void run() {
                RNFetchBlobFS fs = new RNFetchBlobFS(ctx);
                fs.readStream(path, encoding, bufferSize, tick, streamId);
            }
        });
    }

    @ReactMethod
    public void cancelRequest(String taskId, Callback callback) {
        try {
            RNFetchBlobReq.cancelTask(taskId);
            callback.invoke(null, taskId);
        } catch (Exception ex) {
            callback.invoke(ex.getLocalizedMessage(), null);
        }
    }

    @ReactMethod
    public void slice(String src, String dest, int start, int end, Promise promise) {
        RNFetchBlobFS.slice(src, dest, start, end, "", promise);
    }

    @ReactMethod
    public void enableProgressReport(String taskId, int interval, int count) {
        RNFetchBlobProgressConfig config = new RNFetchBlobProgressConfig(true, interval, count, RNFetchBlobProgressConfig.ReportType.Download);
        RNFetchBlobReq.progressReport.put(taskId, config);
    }

    @ReactMethod
    public void df(final Callback callback) {
        fsThreadPool.execute(new Runnable() {
            @Override
            public void run() {
                RNFetchBlobFS.df(callback);
            }
        });
    }


    @ReactMethod
    public void enableUploadProgressReport(String taskId, int interval, int count) {
        RNFetchBlobProgressConfig config = new RNFetchBlobProgressConfig(true, interval, count, RNFetchBlobProgressConfig.ReportType.Upload);
        RNFetchBlobReq.uploadProgressReport.put(taskId, config);
    }

    @ReactMethod
    public void fetchBlob(ReadableMap options, String taskId, String method, String url, ReadableMap headers, String body, final Callback callback) {
        new RNFetchBlobReq(options, taskId, method, url, headers, body, null, mClient, callback).run();
}

    @ReactMethod
    public void fetchBlobForm(ReadableMap options, String taskId, String method, String url, ReadableMap headers, ReadableArray body, final Callback callback) {
        new RNFetchBlobReq(options, taskId, method, url, headers, null, body, mClient, callback).run();
    }

    @ReactMethod
    public void getContentIntent(String mime, Promise promise) {
        Intent i = new Intent(Intent.ACTION_GET_CONTENT);
        if(mime != null)
            i.setType(mime);
        else
            i.setType("*/*");
        promiseTable.put(GET_CONTENT_INTENT, promise);
        this.getReactApplicationContext().startActivityForResult(i, GET_CONTENT_INTENT, null);

    }

    @ReactMethod
    public void addCompleteDownload (ReadableMap config, Promise promise) {
        DownloadManager dm = (DownloadManager) RNFetchBlob.RCTContext.getSystemService(RNFetchBlob.RCTContext.DOWNLOAD_SERVICE);
        String path = RNFetchBlobFS.normalizePath(config.getString("path"));
        if(path == null) {
            promise.reject("RNFetchblob.addCompleteDownload can not resolve URI:" + config.getString("path"), "RNFetchblob.addCompleteDownload can not resolve URI:" + path);
            return;
        }
        try {
            WritableMap stat = RNFetchBlobFS.statFile(path);
            dm.addCompletedDownload(
                    config.hasKey("title") ? config.getString("title") : "",
                    config.hasKey("description") ? config.getString("description") : "",
                    true,
                    config.hasKey("mime") ? config.getString("mime") : null,
                    path,
                    Long.valueOf(stat.getString("size")),
                    config.hasKey("showNotification") && config.getBoolean("showNotification")
            );
            promise.resolve(null);
        }
        catch(Exception ex) {
            promise.reject("RNFetchblob.addCompleteDownload failed", ex.getStackTrace().toString());
        }

    }

}
