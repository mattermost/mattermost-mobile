package com.mattermost.rnbeta;

import com.facebook.react.bridge.ReactMarker;
import com.facebook.react.bridge.ReactMarkerConstants;
import com.mattermost.share.SharePackage;
import android.app.Application;
import android.support.annotation.NonNull;
import android.content.Context;
import android.os.Bundle;
import android.util.Log;

import com.facebook.react.ReactApplication;
import com.reactnativedocumentpicker.ReactNativeDocumentPicker;
import com.reactlibrary.RNReactNativeDocViewerPackage;
import com.brentvatne.react.ReactVideoPackage;
import com.horcrux.svg.SvgPackage;
import com.inprogress.reactnativeyoutube.ReactNativeYouTube;
import io.sentry.RNSentryPackage;
import com.masteratul.exceptionhandler.ReactNativeExceptionHandlerPackage;
import com.RNFetchBlob.RNFetchBlobPackage;
import com.gantix.JailMonkey.JailMonkeyPackage;
import io.tradle.react.LocalAuthPackage;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;
import com.facebook.soloader.SoLoader;

import com.imagepicker.ImagePickerPackage;
import com.gnet.bottomsheet.RNBottomSheetPackage;
import com.learnium.RNDeviceInfo.RNDeviceInfo;
import com.psykar.cookiemanager.CookieManagerPackage;
import com.oblador.vectoricons.VectorIconsPackage;
import com.BV.LinearGradient.LinearGradientPackage;
import com.github.yamill.orientation.OrientationPackage;
import com.reactnativenavigation.NavigationApplication;
import com.wix.reactnativenotifications.RNNotificationsPackage;
import com.wix.reactnativenotifications.core.notification.INotificationsApplication;
import com.wix.reactnativenotifications.core.notification.IPushNotification;
import com.wix.reactnativenotifications.core.AppLaunchHelper;
import com.wix.reactnativenotifications.core.AppLifecycleFacade;
import com.wix.reactnativenotifications.core.JsIOHelper;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;

import javax.annotation.Nullable;

public class MainApplication extends NavigationApplication implements INotificationsApplication {
  HashMap<String, Long> nativeModules = new HashMap<>();
  public long JS_BUNDLE_RUN_START_TIME;
  private long totalElapsed = 0;
  public NotificationsLifecycleFacade notificationsLifecycleFacade;

  @Override
  public boolean isDebug() {
    return BuildConfig.DEBUG;
  }

  public long getReactInitializeElapshedTime() {
    return this.REACT_INITIALIZED_ELAPSED;
  }

  public long getReactAfterStartTime() {
    return this.REACT_AFTER_START_TIME;
  }

  @NonNull
  @Override
  public List<ReactPackage> createAdditionalReactPackages() {
    // Add the packages you require here.
    // No need to add RnnPackage and MainReactPackage
    return Arrays.<ReactPackage>asList(
            new RNBottomSheetPackage(),
            new CookieManagerPackage(),
            new LinearGradientPackage(),
            new OrientationPackage(),
            new RNNotificationsPackage(this),
            new LocalAuthPackage(),
            new JailMonkeyPackage(),
            new RNFetchBlobPackage(),
            new MattermostPackage(this),
            new ReactNativeExceptionHandlerPackage(),
            new ReactNativeYouTube(),
            new ReactVideoPackage(),
            new RNReactNativeDocViewerPackage(),
            new ReactNativeDocumentPicker(),
            new SharePackage(),
            new RNSentryPackage(this),
            new ImagePickerPackage(),
            new VectorIconsPackage(),
            new SvgPackage(),
            new RNDeviceInfo(),
            new StartTimePackage(this)
    );
  }

  @Override
  public String getJSMainModuleName() {
    return "index";
  }

  @Override
  public void onCreate() {
    super.onCreate();
    Log.e("Mattermost", "MainApplication.onCreate");
    instance = this;
    // Create an object of the custom facade impl
    notificationsLifecycleFacade = NotificationsLifecycleFacade.getInstance();
    // Attach it to react-native-navigation
    setActivityCallbacks(notificationsLifecycleFacade);

    SoLoader.init(this, /* native exopackage */ false);

    ReactMarker.addListener(new ReactMarker.MarkerListener() {
      @Override
      public void logMarker(ReactMarkerConstants name, @Nullable String tag, int instanceKey) {
        Log.i("Mattermost", "LogMarker: " + name.toString() + ", " + tag);

        if (name.toString() == ReactMarkerConstants.NATIVE_MODULE_SETUP_START.toString()) {
          nativeModules.put(tag, System.currentTimeMillis());
        } else if (name.toString() == ReactMarkerConstants.NATIVE_MODULE_SETUP_END.toString()) {
          Long setupStart = nativeModules.get(tag);
          if (setupStart != null) {
            long elapsed = System.currentTimeMillis() - setupStart;
            totalElapsed += elapsed;
            Log.e("Mattermost", "native module setup time for " + tag + ": " + String.valueOf(elapsed));
            Log.e("Mattermost", "total elapsed native module setup: " + String.valueOf(totalElapsed));
          }
        } else if (name.toString() == ReactMarkerConstants.RUN_JS_BUNDLE_START.toString()) {
          JS_BUNDLE_RUN_START_TIME = System.currentTimeMillis();
        }
      }
    });
  }

  @Override
  public boolean clearHostOnActivityDestroy() {
    // This solves the issue where the splash screen does not go away
    // after the app is killed by the OS cause of memory or a long time in the background
    return false;
  }

  @Override
  public IPushNotification getPushNotification(Context context, Bundle bundle, AppLifecycleFacade defaultFacade, AppLaunchHelper defaultAppLaunchHelper) {
    return new CustomPushNotification(
            context,
            bundle,
            notificationsLifecycleFacade, // Instead of defaultFacade!!!
            defaultAppLaunchHelper,
            new JsIOHelper()
    );
  }
}
