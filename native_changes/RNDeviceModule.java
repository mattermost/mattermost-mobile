package com.learnium.RNDeviceInfo;

import android.Manifest;
import android.app.KeyguardManager;
import android.bluetooth.BluetoothAdapter;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.net.wifi.WifiManager;
import android.net.wifi.WifiInfo;
import android.os.Build;
import android.os.SystemClock;
import android.provider.Settings.Secure;
import android.webkit.WebSettings;
import android.telephony.TelephonyManager;
import android.text.format.Formatter;
import android.app.ActivityManager;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.Promise;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.TimeZone;
import java.lang.Runtime;

import javax.annotation.Nullable;

public class RNDeviceModule extends ReactContextBaseJavaModule {

    public static final String DEVICE_INFO_PREFERENCES = "DEVICE_INFO_PREFERENCES";
    public static final Long CACHE_EXPIRATION = (long) 4 * 60 * 60 * 1000;

    ReactApplicationContext reactContext;

    WifiInfo wifiInfo;

    public RNDeviceModule(ReactApplicationContext reactContext) {
        super(reactContext);

        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "RNDeviceInfo";
    }

    private WifiInfo getWifiInfo() {
        if (this.wifiInfo == null) {
            WifiManager manager = (WifiManager) reactContext.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            this.wifiInfo = manager.getConnectionInfo();
        }
        return this.wifiInfo;
    }

    private String getCurrentLanguage() {
        Locale current = getReactApplicationContext().getResources().getConfiguration().locale;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            return current.toLanguageTag();
        } else {
            StringBuilder builder = new StringBuilder();
            builder.append(current.getLanguage());
            if (current.getCountry() != null) {
                builder.append("-");
                builder.append(current.getCountry());
            }
            return builder.toString();
        }
    }

    private String getCurrentCountry() {
        Locale current = getReactApplicationContext().getResources().getConfiguration().locale;
        return current.getCountry();
    }

    private Boolean isEmulator() {
        return Build.FINGERPRINT.startsWith("generic")
                || Build.FINGERPRINT.startsWith("unknown")
                || Build.MODEL.contains("google_sdk")
                || Build.MODEL.contains("Emulator")
                || Build.MODEL.contains("Android SDK built for x86")
                || Build.MANUFACTURER.contains("Genymotion")
                || (Build.BRAND.startsWith("generic") && Build.DEVICE.startsWith("generic"))
                || "google_sdk".equals(Build.PRODUCT);
    }

    private Boolean isTablet() {
        int layout = getReactApplicationContext().getResources().getConfiguration().screenLayout & Configuration.SCREENLAYOUT_SIZE_MASK;
        return layout == Configuration.SCREENLAYOUT_SIZE_LARGE || layout == Configuration.SCREENLAYOUT_SIZE_XLARGE;
    }

    private Boolean is24Hour() {
        return android.text.format.DateFormat.is24HourFormat(this.reactContext.getApplicationContext());
    }

    @ReactMethod
    public void isPinOrFingerprintSet(Callback callback) {
        KeyguardManager keyguardManager = (KeyguardManager) this.reactContext.getApplicationContext().getSystemService(Context.KEYGUARD_SERVICE); //api 16+
        callback.invoke(keyguardManager.isKeyguardSecure());
    }

    @ReactMethod
    public void getIpAddress(Promise p) {
        String ipAddress = Formatter.formatIpAddress(getWifiInfo().getIpAddress());
        p.resolve(ipAddress);
    }

    @ReactMethod
    public void getMacAddress(Promise p) {
        String macAddress = getWifiInfo().getMacAddress();
        p.resolve(macAddress);
    }

    @ReactMethod
    public String getCarrier() {
        TelephonyManager telMgr = (TelephonyManager) this.reactContext.getSystemService(Context.TELEPHONY_SERVICE);
        return telMgr.getNetworkOperatorName();
    }

    @Override
    public @Nullable
    Map<String, Object> getConstants() {
        ReactApplicationContext appContext = this.getReactApplicationContext();
        Context context = appContext.getApplicationContext();
        SharedPreferences preferences = context.getSharedPreferences(DEVICE_INFO_PREFERENCES, Context.MODE_PRIVATE);
        HashMap<String, Object> constants = new HashMap<String, Object>();

        if (preferences.getString("appName", null) != null) {
            return this.getFromCache(preferences, context);
        }

        PackageManager packageManager = this.reactContext.getPackageManager();
        String packageName = this.reactContext.getPackageName();

        constants.put("appVersion", "not available");
        constants.put("appName", "not available");
        constants.put("buildVersion", "not available");
        constants.put("buildNumber", 0);

        try {
            PackageInfo packageInfo = packageManager.getPackageInfo(packageName, 0);
            PackageInfo info = packageManager.getPackageInfo(packageName, 0);
            String applicationName = this.reactContext.getApplicationInfo().loadLabel(this.reactContext.getPackageManager()).toString();
            constants.put("appVersion", info.versionName);
            constants.put("buildNumber", info.versionCode);
            constants.put("firstInstallTime", info.firstInstallTime);
            constants.put("lastUpdateTime", info.lastUpdateTime);
            constants.put("appName", applicationName);
        } catch (PackageManager.NameNotFoundException e) {
            e.printStackTrace();
        }

        String deviceName = "Unknown";

        String permission = "android.permission.BLUETOOTH";
        int res = this.reactContext.checkCallingOrSelfPermission(permission);
        if (res == PackageManager.PERMISSION_GRANTED) {
            try {
                BluetoothAdapter myDevice = BluetoothAdapter.getDefaultAdapter();
                if (myDevice != null) {
                    deviceName = myDevice.getName();
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }


        try {
            if (Class.forName("com.google.android.gms.iid.InstanceID") != null) {
                constants.put("instanceId", com.google.android.gms.iid.InstanceID.getInstance(this.reactContext).getId());
            }
        } catch (ClassNotFoundException e) {
            constants.put("instanceId", "N/A: Add com.google.android.gms:play-services-gcm to your project.");
        }
        constants.put("serialNumber", Build.SERIAL);
        constants.put("deviceName", deviceName);
        constants.put("systemName", "Android");
        constants.put("systemVersion", Build.VERSION.RELEASE);
        constants.put("model", Build.MODEL);
        constants.put("brand", Build.BRAND);
        constants.put("deviceId", Build.BOARD);
        constants.put("apiLevel", Build.VERSION.SDK_INT);
        constants.put("deviceLocale", this.getCurrentLanguage());
        constants.put("deviceCountry", this.getCurrentCountry());
        constants.put("uniqueId", Secure.getString(this.reactContext.getContentResolver(), Secure.ANDROID_ID));
        constants.put("systemManufacturer", Build.MANUFACTURER);
        constants.put("bundleId", packageName);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1) {
            try {
                constants.put("userAgent", WebSettings.getDefaultUserAgent(this.reactContext));
            } catch (RuntimeException e) {
                constants.put("userAgent", System.getProperty("http.agent"));
            }
        }
        constants.put("timezone", TimeZone.getDefault().getID());
        constants.put("isEmulator", this.isEmulator());
        constants.put("isTablet", this.isTablet());
        constants.put("is24Hour", this.is24Hour());
        if (getCurrentActivity() != null &&
                (getCurrentActivity().checkCallingOrSelfPermission(Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED ||
                        getCurrentActivity().checkCallingOrSelfPermission(Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED ||
                        getCurrentActivity().checkCallingOrSelfPermission("android.permission.READ_PHONE_NUMBERS") == PackageManager.PERMISSION_GRANTED)) {
            TelephonyManager telMgr = (TelephonyManager) this.reactContext.getApplicationContext().getSystemService(Context.TELEPHONY_SERVICE);
            constants.put("phoneNumber", telMgr.getLine1Number());
        }
        constants.put("carrier", this.getCarrier());

        Runtime rt = Runtime.getRuntime();
        constants.put("maxMemory", rt.maxMemory());
        ActivityManager actMgr = (ActivityManager) this.reactContext.getSystemService(Context.ACTIVITY_SERVICE);
        ActivityManager.MemoryInfo memInfo = new ActivityManager.MemoryInfo();
        actMgr.getMemoryInfo(memInfo);
        constants.put("totalMemory", memInfo.totalMem);
        this.saveConstants(constants, context);
        return constants;
    }

    private Map<String, Object> getFromCache(SharedPreferences preferences, Context context) {
        Map<String, Object> constants = new HashMap<>();

        Long cacheTime = preferences.getLong("cacheTime", 0);
        Long timeNow = SystemClock.elapsedRealtime();

        // recreate non-volatile constants from cache once expired
        if (cacheTime != 0 && (timeNow - cacheTime) > CACHE_EXPIRATION) {
            constants.putAll(this.recreateVolatileConstants(preferences));
            constants.putAll(this.addNonVolatileConstants(preferences));
            constants.put("cacheTime", timeNow);
            this.saveConstants(constants, context);

            return constants;
        }

        constants.put("appVersion", preferences.getString("appVersion", ""));
        constants.put("appName", preferences.getString("appName", ""));
        constants.put("buildVersion", preferences.getString("buildVersion", ""));

        constants.put("buildNumber", preferences.getInt("buildNumber", 0));
        constants.put("firstInstallTime", preferences.getLong("firstInstallTime", 0));
        constants.put("lastUpdateTime", preferences.getLong("lastUpdateTime", 0));

        constants.put("instanceId", preferences.getString("instanceId", ""));
        constants.put("serialNumber", preferences.getString("serialNumber", ""));
        constants.put("deviceName", preferences.getString("deviceName", ""));
        constants.put("systemName", preferences.getString("systemName", ""));
        constants.put("model", preferences.getString("model", ""));
        constants.put("brand", preferences.getString("brand", ""));
        constants.put("deviceId", preferences.getString("deviceId", ""));
        constants.put("apiLevel", preferences.getString("apiLevel", ""));
        constants.put("deviceLocale", preferences.getString("deviceLocale", ""));
        constants.put("deviceCountry", preferences.getString("deviceCountry", ""));
        constants.put("uniqueId", preferences.getString("uniqueId", ""));
        constants.put("systemManufacturer", preferences.getString("systemManufacturer", ""));
        constants.put("bundleId", preferences.getString("bundleId", ""));
        constants.put("userAgent", preferences.getString("userAgent", ""));
        constants.put("timezone", preferences.getString("timezone", ""));

        constants.put("isEmulator", preferences.getBoolean("isEmulator", false));
        constants.put("isTablet", preferences.getBoolean("isTablet", false));
        constants.put("is24Hour", preferences.getBoolean("is24Hour", false));

        constants.put("phoneNumber", preferences.getString("phoneNumber", ""));
        constants.put("carrier", preferences.getString("carrier", ""));
        constants.put("maxMemory", preferences.getLong("maxMemory", 0));
        constants.put("totalMemory", preferences.getLong("totalMemory", 0));

        return constants;
    }

    /**
     * volatile data
     * - appVersion
     * - buildNumber
     * <p>
     * - firstInstallTime
     * - lastUpdateTime
     * - apiLevel
     * <p>
     * - deviceLocale
     * - deviceCountry
     * - timezone
     * - is24Hour
     */
    private Map<String, Object> recreateVolatileConstants(SharedPreferences preferences) {
        Map<String, Object> constants = new HashMap<>();
        try {
            String packageName = this.reactContext.getPackageName();
            PackageManager packageManager = this.reactContext.getPackageManager();
            PackageInfo info = packageManager.getPackageInfo(packageName, 0);

            // volatile data
            constants.put("appVersion", info.versionName);
            constants.put("buildNumber", info.versionCode);

            constants.put("firstInstallTime", info.firstInstallTime);
            constants.put("lastUpdateTime", info.lastUpdateTime);
            constants.put("apiLevel", Build.VERSION.SDK_INT);

            constants.put("deviceLocale", this.getCurrentLanguage());
            constants.put("deviceCountry", this.getCurrentCountry());
            constants.put("timezone", TimeZone.getDefault().getID());
            constants.put("is24Hour", this.is24Hour());

        } catch (PackageManager.NameNotFoundException exception) {

            constants.put("appVersion", preferences.getString("appVersion", ""));
            constants.put("buildNumber", preferences.getInt("buildNumber", 0));

            constants.put("firstInstallTime", preferences.getLong("firstInstallTime", 0));
            constants.put("lastUpdateTime", preferences.getLong("lastUpdateTime", 0));
            constants.put("apiLevel", preferences.getString("apiLevel", ""));

            constants.put("deviceLocale", preferences.getString("deviceLocale", ""));
            constants.put("deviceCountry", preferences.getString("deviceCountry", ""));
            constants.put("timezone", preferences.getString("timezone", ""));
            constants.put("is24Hour", preferences.getBoolean("is24Hour", false));
        }


        return constants;
    }

    /**
     * non-volatile data
     * - appName
     * - buildVersion
     * <p>
     * - instanceId
     * - serialNumber
     * - deviceName
     * - systemName
     * - model
     * - brand
     * - deviceId
     * <p>
     * - uniqueId
     * - systemManufacturer
     * - bundleId
     * - userAgent
     * <p>
     * - isEmulator
     * - isTablet
     * <p>
     * - phoneNumber
     * - carrier
     * - maxMemory
     * - totalMemory
     */
    private Map<String, Object> addNonVolatileConstants(SharedPreferences preferences) {
        Map<String, Object> constants = new HashMap<>();

        constants.put("appName", preferences.getString("appName", ""));
        constants.put("buildVersion", preferences.getString("buildVersion", ""));

        constants.put("instanceId", preferences.getString("instanceId", ""));
        constants.put("serialNumber", preferences.getString("serialNumber", ""));
        constants.put("deviceName", preferences.getString("deviceName", ""));
        constants.put("systemName", preferences.getString("systemName", ""));
        constants.put("model", preferences.getString("model", ""));
        constants.put("brand", preferences.getString("brand", ""));
        constants.put("deviceId", preferences.getString("deviceId", ""));

        constants.put("uniqueId", preferences.getString("uniqueId", ""));
        constants.put("systemManufacturer", preferences.getString("systemManufacturer", ""));
        constants.put("bundleId", preferences.getString("bundleId", ""));
        constants.put("userAgent", preferences.getString("userAgent", ""));

        constants.put("isEmulator", preferences.getBoolean("isEmulator", false));
        constants.put("isTablet", preferences.getBoolean("isTablet", false));

        constants.put("phoneNumber", preferences.getString("phoneNumber", ""));
        constants.put("carrier", preferences.getString("carrier", ""));
        constants.put("maxMemory", preferences.getLong("maxMemory", 0));
        constants.put("totalMemory", preferences.getLong("totalMemory", 0));

        return constants;
    }

    private void saveConstants(Map<String, Object> constants, Context ctx) {
        SharedPreferences preferences = ctx.getSharedPreferences(DEVICE_INFO_PREFERENCES, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = preferences.edit();

        // volatile data
        editor.putString("appVersion", constants.get("appVersion").toString());
        editor.putInt("buildNumber", (Integer) constants.get("buildNumber"));
        editor.putLong("firstInstallTime", (Long) constants.get("firstInstallTime"));
        editor.putLong("lastUpdateTime", (Long) constants.get("lastUpdateTime"));

        editor.putString("apiLevel", constants.get("apiLevel").toString());
        editor.putString("deviceLocale", constants.get("deviceLocale").toString());
        editor.putString("deviceCountry", constants.get("deviceCountry").toString());
        editor.putString("timezone", constants.get("timezone").toString());

        editor.putBoolean("is24Hour", (Boolean) constants.get("is24Hour"));

        // non-volatile data
        editor.putString("appName", constants.get("appName").toString());
        editor.putString("buildVersion", constants.get("buildVersion").toString());

        editor.putString("instanceId", constants.get("instanceId").toString());
        editor.putString("serialNumber", constants.get("serialNumber").toString());
        editor.putString("deviceName", constants.get("deviceName").toString());
        editor.putString("systemName", constants.get("systemName").toString());
        editor.putString("model", constants.get("model").toString());
        editor.putString("brand", constants.get("brand").toString());
        editor.putString("deviceId", constants.get("deviceId").toString());
        editor.putString("uniqueId", constants.get("uniqueId").toString());
        editor.putString("systemManufacturer", constants.get("systemManufacturer").toString());
        editor.putString("bundleId", constants.get("bundleId").toString());
        editor.putString("userAgent", constants.get("userAgent").toString());

        editor.putBoolean("isEmulator", (Boolean) constants.get("isEmulator"));
        editor.putBoolean("isTablet", (Boolean) constants.get("isTablet"));


        if (constants.get("phoneNumber") != null) {
            editor.putString("phoneNumber", constants.get("phoneNumber").toString());
        }
        editor.putString("carrier", constants.get("carrier").toString());
        editor.putLong("maxMemory", (Long) constants.get("maxMemory"));
        editor.putLong("totalMemory", (Long) constants.get("totalMemory"));

        editor.putLong("cacheTime", SystemClock.elapsedRealtime());

        editor.commit();
    }
}
