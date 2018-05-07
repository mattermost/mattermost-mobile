package com.mattermost.rnbeta;

import android.app.Application;

//import com.facebook.react.ReactApplication;

//import com.facebook.react.ReactNativeHost;

//import com.facebook.react.shell.MainReactPackage;
import com.facebook.soloader.SoLoader;
import com.reactnativenavigation.NavigationApplication;

// import notification packages
import com.wix.reactnativenotifications.RNNotificationsPackage;
import com.wix.reactnativenotifications.core.notification.INotificationsApplication;
import com.wix.reactnativenotifications.core.notification.IPushNotification;
import com.wix.reactnativenotifications.core.AppLifecycleFacade;
import com.wix.reactnativenotifications.core.AppLaunchHelper;
import com.wix.reactnativenotifications.core.JsIOHelper;

// import third-party modules
import com.imagepicker.ImagePickerPackage;
import com.gnet.bottomsheet.RNBottomSheetPackage;
import com.learnium.RNDeviceInfo.RNDeviceInfo;
import com.psykar.cookiemanager.CookieManagerPackage;
import com.oblador.vectoricons.VectorIconsPackage;
import com.facebook.react.ReactPackage;
import com.BV.LinearGradient.LinearGradientPackage;
import com.horcrux.svg.SvgPackage;
import io.tradle.react.LocalAuthPackage;
import com.gantix.JailMonkey.JailMonkeyPackage;
import com.RNFetchBlob.RNFetchBlobPackage;
import io.sentry.RNSentryPackage;
import com.masteratul.exceptionhandler.ReactNativeExceptionHandlerPackage;
import com.inprogress.reactnativeyoutube.ReactNativeYouTube;
import com.brentvatne.react.ReactVideoPackage;
import com.reactlibrary.RNReactNativeDocViewerPackage;

// Mattermost share module
import com.mattermost.share.SharePackage;

import android.content.Context;
import android.os.Bundle;

import java.util.Arrays;
import java.util.List;


// telemtry stuff
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactMarker;
import com.facebook.react.bridge.ReactMarkerConstants;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import android.support.annotation.Nullable;


public class MainApplication extends NavigationApplication implements INotificationsApplication {
  public NotificationsLifecycleFacade notificationsLifecycleFacade;

  @Override
  public boolean isDebug() {
    // Make sure you are using BuildConfig from your own application
    return BuildConfig.DEBUG;
  }

  protected List<ReactPackage> getPackages() {
    // Add additional packages you require here
    // No need to add RnnPackage and MainReactPackage
    return Arrays.<ReactPackage>asList(
            // eg. new VectorIconsPackage()
            new RNNotificationsPackage(MainApplication.this),
            new ImagePickerPackage(),
            new RNBottomSheetPackage(),
            new RNDeviceInfo(),
            new CookieManagerPackage(),
            new VectorIconsPackage(),
            new SvgPackage(),
            new LinearGradientPackage(),
            new LocalAuthPackage(),
            new JailMonkeyPackage(),
            new RNFetchBlobPackage(),
            new RNSentryPackage(MainApplication.this),
            new ReactNativeExceptionHandlerPackage(),
            new ReactNativeYouTube(),
            new ReactVideoPackage(),
            new RNReactNativeDocViewerPackage(),
            new MattermostPackage(this),
            new SharePackage(),
            new StartTimePackage(this)
    );
  }

  @Override
  public List<ReactPackage> createAdditionalReactPackages() {
    return getPackages();
  }

  @Override
  public String getJSMainModuleName() {
    return "index";
  }

  @Override
  public void onCreate() {
    super.onCreate();
    instance = this;
    // Create an object of the custom facade impl
    notificationsLifecycleFacade = NotificationsLifecycleFacade.getInstance();
    // Attach it to react-native-navigation
    setActivityCallbacks(notificationsLifecycleFacade);

    SoLoader.init(this, /* native exopackage */ false);

    ReactMarker.addListener(new ReactMarker.MarkerListener() {
      @Override
      public void logMarker(ReactMarkerConstants name, @Nullable String tag, int instanceKey) {
        if (name.toString() == ReactMarkerConstants.NATIVE_MODULE_SETUP_START.toString()) {

        } else if (name.toString() == ReactMarkerConstants.NATIVE_MODULE_SETUP_END.toString()) {

        } else if (name.toString() == ReactMarkerConstants.RUN_JS_BUNDLE_START.toString()) {
          JS_BUNDLE_RUN_START_TIME = System.currentTimeMillis();
        } else if (name.toString() == ReactMarkerConstants.RUN_JS_BUNDLE_END.toString()) {
          JS_BUNDLE_RUN_END_TIME = System.currentTimeMillis();
          ReactContext ctx = getReactGateway().getReactContext();

          if (ctx != null) {
            WritableMap map = Arguments.createMap();
            map.putDouble("jsBundleRunStartTime", JS_BUNDLE_RUN_START_TIME);
            map.putDouble("jsBundleRunEndTime", JS_BUNDLE_RUN_END_TIME);
            ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).
                    emit("JS_BUNDLE_METRICS", map);
          }
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
