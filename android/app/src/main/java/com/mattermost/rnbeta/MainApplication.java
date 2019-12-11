package com.mattermost.rnbeta;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import android.content.Context;
import android.content.RestrictionsManager;
import android.os.Bundle;
import android.util.Log;
import java.io.File;
import java.util.HashMap;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import com.mattermost.share.ShareModule;
import com.learnium.RNDeviceInfo.RNDeviceModule;
import com.imagepicker.ImagePickerModule;
import com.psykar.cookiemanager.CookieManagerModule;
import com.oblador.vectoricons.VectorIconsModule;
import com.wix.reactnativenotifications.RNNotificationsModule;
import io.tradle.react.LocalAuthModule;
import com.gantix.JailMonkey.JailMonkeyModule;
import com.RNFetchBlob.RNFetchBlob;
import com.masteratul.exceptionhandler.ReactNativeExceptionHandlerModule;
import com.inprogress.reactnativeyoutube.YouTubeStandaloneModule;
import com.philipphecht.RNDocViewerModule;
import io.github.elyx0.reactnativedocumentpicker.DocumentPickerModule;
import com.oblador.keychain.KeychainModule;
import com.reactnativecommunity.asyncstorage.AsyncStorageModule;
import com.reactnativecommunity.netinfo.NetInfoModule;
import com.reactnativecommunity.webview.RNCWebViewPackage;
import io.sentry.RNSentryModule;
import com.dylanvann.fastimage.FastImageViewPackage;
import com.levelasquez.androidopensettings.AndroidOpenSettings;
import com.mkuczera.RNReactNativeHapticFeedbackModule;

import com.reactnativecommunity.webview.RNCWebViewPackage;
import com.brentvatne.react.ReactVideoPackage;
import com.BV.LinearGradient.LinearGradientPackage;
import com.horcrux.svg.SvgPackage;
import com.swmansion.gesturehandler.react.RNGestureHandlerPackage;

import com.reactnativenavigation.NavigationApplication;
import com.reactnativenavigation.react.NavigationReactNativeHost;
import com.reactnativenavigation.react.ReactGateway;
import com.wix.reactnativenotifications.core.notification.INotificationsApplication;
import com.wix.reactnativenotifications.core.notification.IPushNotification;
import com.wix.reactnativenotifications.core.notificationdrawer.IPushNotificationsDrawer;
import com.wix.reactnativenotifications.core.notificationdrawer.INotificationsDrawerApplication;
import com.wix.reactnativenotifications.core.AppLaunchHelper;
import com.wix.reactnativenotifications.core.AppLifecycleFacade;
import com.wix.reactnativenotifications.core.JsIOHelper;

import com.facebook.react.ReactPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.TurboReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMarker;
import com.facebook.react.bridge.ReactMarkerConstants;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.module.model.ReactModuleInfo;
import com.facebook.react.module.model.ReactModuleInfoProvider;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.soloader.SoLoader;

import com.mattermost.share.RealPathUtil;

public class MainApplication extends NavigationApplication implements INotificationsApplication, INotificationsDrawerApplication {
  public static MainApplication instance;

  public Boolean sharedExtensionIsOpened = false;

  public long APP_START_TIME;

  public long RELOAD;
  public long CONTENT_APPEARED;

  public long PROCESS_PACKAGES_START;
  public long PROCESS_PACKAGES_END;

  private Bundle mManagedConfig = null;

  @Override
  protected ReactGateway createReactGateway() {
    ReactNativeHost host = new NavigationReactNativeHost(this, isDebug(), createAdditionalReactPackages()) {
      @Override
      protected String getJSMainModuleName() {
        return "index";
      }
    };
    return new ReactGateway(this, isDebug(), host);
  }

  @Override
  public boolean isDebug() {
    return BuildConfig.DEBUG;
  }

  @NonNull
  @Override
  public List<ReactPackage> createAdditionalReactPackages() {
    // Add the packages you require here.
    // No need to add RnnPackage and MainReactPackage
    return Arrays.<ReactPackage>asList(
            new TurboReactPackage() {
              @Override
              public NativeModule getModule(String name, ReactApplicationContext reactContext) {
                switch (name) {
                  case "MattermostShare":
                    return new ShareModule(instance, reactContext);
                  case "RNDeviceInfo":
                    return new RNDeviceModule(reactContext, false);
                  case "ImagePickerManager":
                    return new ImagePickerModule(reactContext, R.style.DefaultExplainingPermissionsTheme);
                  case "RNCookieManagerAndroid":
                    return new CookieManagerModule(reactContext);
                  case "RNVectorIconsModule":
                    return new VectorIconsModule(reactContext);
                  case "WixRNNotifications":
                    return new RNNotificationsModule(instance, reactContext);
                  case "RNLocalAuth":
                    return new LocalAuthModule(reactContext);
                  case "JailMonkey":
                    return new JailMonkeyModule(reactContext, false);
                  case "RNFetchBlob":
                    return new RNFetchBlob(reactContext);
                  case "MattermostManaged":
                    return MattermostManagedModule.getInstance(reactContext);
                  case "NotificationPreferences":
                    return NotificationPreferencesModule.getInstance(instance, reactContext);
                  case "RNTextInputReset":
                    return new RNTextInputResetModule(reactContext);
                  case "ReactNativeExceptionHandler":
                    return new ReactNativeExceptionHandlerModule(reactContext);
                  case "YouTubeStandaloneModule":
                    return new YouTubeStandaloneModule(reactContext);
                  case "RNDocViewer":
                    return new RNDocViewerModule(reactContext);
                  case "RNDocumentPicker":
                    return new DocumentPickerModule(reactContext);
                  case "RNKeychainManager":
                    return new KeychainModule(reactContext);
                  case "RNSentry":
                    return new RNSentryModule(reactContext);
                  case AsyncStorageModule.NAME:
                    return new AsyncStorageModule(reactContext);
                  case NetInfoModule.NAME:
                    return new NetInfoModule(reactContext);
                  case "RNAndroidOpenSettings":
                    return new AndroidOpenSettings(reactContext);
                  case "RNReactNativeHapticFeedbackModule":
                    return new RNReactNativeHapticFeedbackModule(reactContext);
                  default:
                    throw new IllegalArgumentException("Could not find module " + name);
                }
              }

              @Override
              public ReactModuleInfoProvider getReactModuleInfoProvider() {
                return new ReactModuleInfoProvider() {
                  @Override
                  public Map<String, ReactModuleInfo> getReactModuleInfos() {
                    Map<String, ReactModuleInfo> map = new HashMap<>();
                    map.put("MattermostManaged", new ReactModuleInfo("MattermostManaged", "com.mattermost.rnbeta.MattermostManagedModule", false, false, false, false, false));
                    map.put("NotificationPreferences", new ReactModuleInfo("NotificationPreferences", "com.mattermost.rnbeta.NotificationPreferencesModule", false, false, false, false, false));
                    map.put("RNTextInputReset", new ReactModuleInfo("RNTextInputReset", "com.mattermost.rnbeta.RNTextInputResetModule", false, false, false, false, false));

                    map.put("MattermostShare", new ReactModuleInfo("MattermostShare", "com.mattermost.share.ShareModule", false, false, true, false, false));
                    map.put("RNDeviceInfo", new ReactModuleInfo("RNDeviceInfo", "com.learnium.RNDeviceInfo.RNDeviceModule", false, false, true, false, false));
                    map.put("ImagePickerManager", new ReactModuleInfo("ImagePickerManager", "com.imagepicker.ImagePickerModule", false, false, false, false, false));
                    map.put("RNCookieManagerAndroid", new ReactModuleInfo("RNCookieManagerAndroid", "com.psykar.cookiemanager.CookieManagerModule", false, false, false, false, false));
                    map.put("RNVectorIconsModule", new ReactModuleInfo("RNVectorIconsModule", "com.oblador.vectoricons.VectorIconsModule", false, false, false, false, false));
                    map.put("WixRNNotifications", new ReactModuleInfo("WixRNNotifications", "com.wix.reactnativenotifications.RNNotificationsModule", false, false, false, false, false));
                    map.put("RNLocalAuth", new ReactModuleInfo("RNLocalAuth", "io.tradle.react.LocalAuthModule", false, false, false, false, false));
                    map.put("JailMonkey", new ReactModuleInfo("JailMonkey", "com.gantix.JailMonkey.JailMonkeyModule", false, false, true, false, false));
                    map.put("RNFetchBlob", new ReactModuleInfo("RNFetchBlob", "com.RNFetchBlob.RNFetchBlob", false, false, true, false, false));
                    map.put("ReactNativeExceptionHandler", new ReactModuleInfo("ReactNativeExceptionHandler", "com.masteratul.exceptionhandler.ReactNativeExceptionHandlerModule", false, false, false, false, false));
                    map.put("YouTubeStandaloneModule", new ReactModuleInfo("YouTubeStandaloneModule", "com.inprogress.reactnativeyoutube.YouTubeStandaloneModule", false, false, false, false, false));
                    map.put("RNDocViewer", new ReactModuleInfo("RNDocViewer", "com.philipphecht.RNDocViewerModule", false, false, false, false, false));
                    map.put("RNDocumentPicker", new ReactModuleInfo("RNDocumentPicker", "io.github.elyx0.reactnativedocumentpicker.DocumentPickerModule", false, false, false, false, false));
                    map.put("RNKeychainManager", new ReactModuleInfo("RNKeychainManager", "com.oblador.keychain.KeychainModule", false, false, true, false, false));
                    map.put("RNSentry", new ReactModuleInfo("RNSentry", "com.sentry.RNSentryModule", false, false, true, false, false));
                    map.put(AsyncStorageModule.NAME, new ReactModuleInfo(AsyncStorageModule.NAME, "com.reactnativecommunity.asyncstorage.AsyncStorageModule", false, false, false, false, false));
                    map.put(NetInfoModule.NAME, new ReactModuleInfo(NetInfoModule.NAME, "com.reactnativecommunity.netinfo.NetInfoModule", false, false, false, false, false));
                    map.put("RNAndroidOpenSettings", new ReactModuleInfo("RNAndroidOpenSettings", "com.levelasquez.androidopensettings.AndroidOpenSettings", false, false, false, false, false));
                    map.put("RNReactNativeHapticFeedbackModule", new ReactModuleInfo("RNReactNativeHapticFeedback", "com.mkuczera.RNReactNativeHapticFeedbackModule", false, false, false, false, false));
                    return map;
                  }
                };
              }
            },
            new FastImageViewPackage(),
            new RNCWebViewPackage(),
            new SvgPackage(),
            new LinearGradientPackage(),
            new ReactVideoPackage(),
            new RNGestureHandlerPackage(),
            new RNPasteableTextInputPackage()
    );
  }

  @Override
  public void onCreate() {
    super.onCreate();
    instance = this;

    // Delete any previous temp files created by the app
    File tempFolder = new File(getApplicationContext().getCacheDir(), "mmShare");
    RealPathUtil.deleteTempFiles(tempFolder);
    Log.i("ReactNative", "Cleaning temp cache " + tempFolder.getAbsolutePath());

    SoLoader.init(this, /* native exopackage */ false);

    // Uncomment to listen to react markers for build that has telemetry enabled
    // addReactMarkerListener();
  }

  @Override
  public IPushNotification getPushNotification(Context context, Bundle bundle, AppLifecycleFacade defaultFacade, AppLaunchHelper defaultAppLaunchHelper) {
    return new CustomPushNotification(
            context,
            bundle,
            defaultFacade,
            defaultAppLaunchHelper,
            new JsIOHelper()
    );
  }

  @Override
  public IPushNotificationsDrawer getPushNotificationsDrawer(Context context, AppLaunchHelper defaultAppLaunchHelper) {
    return new CustomPushNotificationDrawer(context, defaultAppLaunchHelper);
  }

  public ReactContext getRunningReactContext() {
    final ReactGateway reactGateway = getReactGateway();

    if (reactGateway == null) {
        return null;
    }

    return reactGateway
        .getReactNativeHost()
        .getReactInstanceManager()
        .getCurrentReactContext();
  }

  public synchronized Bundle loadManagedConfig(Context ctx) {
    if (ctx != null) {
      RestrictionsManager myRestrictionsMgr =
              (RestrictionsManager) ctx.getSystemService(Context.RESTRICTIONS_SERVICE);

      mManagedConfig = myRestrictionsMgr.getApplicationRestrictions();
      myRestrictionsMgr = null;

      if (mManagedConfig!= null && mManagedConfig.size() > 0) {
        return mManagedConfig;
      }

      return null;
    }

    return null;
  }

  public synchronized Bundle getManagedConfig() {
    if (mManagedConfig != null && mManagedConfig.size() > 0) {
        return mManagedConfig;
    }

    ReactContext ctx = getRunningReactContext();

    if (ctx != null) {
      return loadManagedConfig(ctx);
    }

    return null;
  }

  private void addReactMarkerListener() {
    ReactMarker.addListener(new ReactMarker.MarkerListener() {
      @Override
      public void logMarker(ReactMarkerConstants name, @Nullable String tag, int instanceKey) {
        if (name.toString() == ReactMarkerConstants.RELOAD.toString()) {
          APP_START_TIME = System.currentTimeMillis();
          RELOAD = System.currentTimeMillis();
        } else if (name.toString() == ReactMarkerConstants.PROCESS_PACKAGES_START.toString()) {
          PROCESS_PACKAGES_START = System.currentTimeMillis();
        } else if (name.toString() == ReactMarkerConstants.PROCESS_PACKAGES_END.toString()) {
          PROCESS_PACKAGES_END = System.currentTimeMillis();
        } else if (name.toString() == ReactMarkerConstants.CONTENT_APPEARED.toString()) {
          CONTENT_APPEARED = System.currentTimeMillis();
          ReactContext ctx = getRunningReactContext();

          if (ctx != null) {
            WritableMap map = Arguments.createMap();

            map.putDouble("appReload", RELOAD);
            map.putDouble("appContentAppeared", CONTENT_APPEARED);

            map.putDouble("processPackagesStart", PROCESS_PACKAGES_START);
            map.putDouble("processPackagesEnd", PROCESS_PACKAGES_END);

            ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).
                    emit("nativeMetrics", map);
          }
        }
      }
    });
  }
}
