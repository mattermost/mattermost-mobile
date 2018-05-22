package com.mattermost.rnbeta;

import com.mattermost.share.SharePackage;

import android.support.annotation.NonNull;
import android.content.Context;
import android.os.Bundle;

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

import com.facebook.react.ReactPackage;
import com.facebook.soloader.SoLoader;

import com.imagepicker.ImagePickerPackage;
import com.gnet.bottomsheet.RNBottomSheetPackage;
import com.learnium.RNDeviceInfo.RNDeviceInfo;
import com.psykar.cookiemanager.CookieManagerPackage;
import com.oblador.vectoricons.VectorIconsPackage;
import com.BV.LinearGradient.LinearGradientPackage;
import com.reactnativenavigation.NavigationApplication;
import com.wix.reactnativenotifications.RNNotificationsPackage;
import com.wix.reactnativenotifications.core.notification.INotificationsApplication;
import com.wix.reactnativenotifications.core.notification.IPushNotification;
import com.wix.reactnativenotifications.core.AppLaunchHelper;
import com.wix.reactnativenotifications.core.AppLifecycleFacade;
import com.wix.reactnativenotifications.core.JsIOHelper;

import java.util.Arrays;
import java.util.List;

public class MainApplication extends NavigationApplication implements INotificationsApplication {
  public NotificationsLifecycleFacade notificationsLifecycleFacade;
  public Boolean sharedExtensionIsOpened = false;
  public Boolean replyFromPushNotification = false;

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
            new RNSentryPackage(this),
            new ReactNativeExceptionHandlerPackage(),
            new ReactNativeYouTube(),
            new ReactVideoPackage(),
            new RNReactNativeDocViewerPackage(),
            new ReactNativeDocumentPicker(),
            new SharePackage(this),
            new KeychainPackage(),
            new InitializationPackage(this)
    );
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
