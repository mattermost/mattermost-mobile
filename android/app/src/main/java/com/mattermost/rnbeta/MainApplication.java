package com.mattermost.rnbeta;

import com.mattermost.share.SharePackage;
import com.mattermost.share.RealPathUtil;

import android.app.Activity;
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;
import android.content.Context;
import android.content.RestrictionsManager;
import android.os.Bundle;
import android.util.Log;

import java.io.File;
import java.util.Arrays;
import java.util.List;

import com.facebook.soloader.SoLoader;
import com.facebook.react.ReactPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactMarker;
import com.facebook.react.bridge.ReactMarkerConstants;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import com.reactnativedocumentpicker.ReactNativeDocumentPicker;
import com.oblador.keychain.KeychainPackage;
import com.reactlibrary.RNReactNativeDocViewerPackage;
import com.brentvatne.react.ReactVideoPackage;
import com.horcrux.svg.SvgPackage;
import com.inprogress.reactnativeyoutube.ReactNativeYouTube;
import io.sentry.RNSentryPackage;
import com.masteratul.exceptionhandler.ReactNativeExceptionHandlerPackage;
import com.RNFetchBlob.RNFetchBlobPackage;
import com.gantix.JailMonkey.JailMonkeyPackage;
import io.tradle.react.LocalAuthPackage;
import com.reactnativecommunity.asyncstorage.AsyncStoragePackage;
import com.reactnativecommunity.netinfo.NetInfoPackage;
import com.reactnativecommunity.webview.RNCWebViewPackage;
import com.swmansion.gesturehandler.react.RNGestureHandlerPackage;
import com.imagepicker.ImagePickerPackage;
import com.gnet.bottomsheet.RNBottomSheetPackage;
import com.learnium.RNDeviceInfo.RNDeviceInfo;
import com.psykar.cookiemanager.CookieManagerPackage;
import com.oblador.vectoricons.VectorIconsPackage;
import com.BV.LinearGradient.LinearGradientPackage;
import com.reactnativenavigation.NavigationApplication;
import com.reactnativenavigation.react.NavigationReactNativeHost;
import com.reactnativenavigation.react.ReactGateway;
import com.wix.reactnativenotifications.RNNotificationsPackage;
import com.wix.reactnativenotifications.core.notification.INotificationsApplication;
import com.wix.reactnativenotifications.core.notification.IPushNotification;
import com.wix.reactnativenotifications.core.notificationdrawer.IPushNotificationsDrawer;
import com.wix.reactnativenotifications.core.notificationdrawer.INotificationsDrawerApplication;
import com.wix.reactnativenotifications.core.AppLaunchHelper;
import com.wix.reactnativenotifications.core.AppLifecycleFacade;
import com.wix.reactnativenotifications.core.JsIOHelper;

public class MainApplication extends NavigationApplication implements INotificationsApplication, INotificationsDrawerApplication {
  public static MainApplication instance;

  public Boolean sharedExtensionIsOpened = false;
  public Boolean replyFromPushNotification = false;

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
            new ImagePickerPackage(),
            new RNBottomSheetPackage(),
            new RNDeviceInfo(),
            new CookieManagerPackage(),
            new VectorIconsPackage(),
            new SvgPackage(),
            new LinearGradientPackage(),
            new RNNotificationsPackage(this),
            new LocalAuthPackage(),
            new JailMonkeyPackage(),
            new RNFetchBlobPackage(),
            new MattermostPackage(this),
            new RNSentryPackage(),
            new ReactNativeExceptionHandlerPackage(),
            new ReactNativeYouTube(),
            new ReactVideoPackage(),
            new RNReactNativeDocViewerPackage(),
            new ReactNativeDocumentPicker(),
            new SharePackage(this),
            new KeychainPackage(),
            new InitializationPackage(this),
            new AsyncStoragePackage(),
            new NetInfoPackage(),
            new RNCWebViewPackage(),
            new RNGestureHandlerPackage()
    );
  }

  @Override
  public void onCreate() {
    super.onCreate();
    instance = this;

    registerActivityLifecycleCallbacks(new ManagedActivityLifecycleCallbacks());

    // Delete any previous temp files created by the app
    File tempFolder = new File(getApplicationContext().getCacheDir(), "mmShare");
    RealPathUtil.deleteTempFiles(tempFolder);
    Log.i("ReactNative", "Cleaning temp cache " + tempFolder.getAbsolutePath());

    SoLoader.init(this, /* native exopackage */ false);

    // Uncomment to listen to react markers for build that has telemetry enabled
    // addReactMarkerListener();
  }

  // TODO: Need to test if this is needed for RNN v2
  // @Override
  // public boolean clearHostOnActivityDestroy(Activity activity) {
  //   // This solves the issue where the splash screen does not go away
  //   // after the app is killed by the OS cause of memory or a long time in the background
  //   return false;
  // }

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
    if (mManagedConfig!= null && mManagedConfig.size() > 0) {
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
