package com.mattermost.rnbeta;

import com.facebook.react.bridge.JSIModuleSpec;
import com.facebook.react.bridge.JavaScriptContextHolder;

import android.content.Context;
import android.os.Bundle;
import android.util.Log;
import java.io.File;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.mattermost.helpers.RealPathUtil;
import com.wix.reactnativenotifications.RNNotificationsPackage;

import com.reactnativenavigation.NavigationApplication;
import com.wix.reactnativenotifications.core.notification.INotificationsApplication;
import com.wix.reactnativenotifications.core.notification.IPushNotification;
import com.wix.reactnativenotifications.core.notificationdrawer.IPushNotificationsDrawer;
import com.wix.reactnativenotifications.core.notificationdrawer.INotificationsDrawerApplication;
import com.wix.reactnativenotifications.core.AppLaunchHelper;
import com.wix.reactnativenotifications.core.AppLifecycleFacade;
import com.wix.reactnativenotifications.core.JsIOHelper;

import com.facebook.react.PackageList;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.ReactPackage;
import com.facebook.react.config.ReactFeatureFlags;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.TurboReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.JSIModulePackage;
import com.facebook.react.module.model.ReactModuleInfo;
import com.facebook.react.module.model.ReactModuleInfoProvider;
import com.facebook.react.modules.network.OkHttpClientProvider;
import com.facebook.soloader.SoLoader;

import com.mattermost.networkclient.RCTOkHttpClientFactory;
import com.mattermost.newarchitecture.MainApplicationReactNativeHost;
import com.swmansion.reanimated.ReanimatedJSIModulePackage;
import com.nozbe.watermelondb.jsi.WatermelonDBJSIPackage;

public class MainApplication extends NavigationApplication implements INotificationsApplication, INotificationsDrawerApplication {
  public static MainApplication instance;

  public Boolean sharedExtensionIsOpened = false;

  private final ReactNativeHost mReactNativeHost =
    new ReactNativeHost(this) {
      @Override
      public boolean getUseDeveloperSupport() {
        return BuildConfig.DEBUG;
      }

      @Override
      protected List<ReactPackage> getPackages() {
        List<ReactPackage> packages = new PackageList(this).getPackages();
        // Packages that cannot be autolinked yet can be added manually here, for example:
        // packages.add(new MyReactNativePackage());
        packages.add(new RNNotificationsPackage(MainApplication.this));


        packages.add(
          new TurboReactPackage() {
                @Override
                public NativeModule getModule(String name, ReactApplicationContext reactContext) {
                  switch (name) {
                  case "MattermostManaged":
                      return MattermostManagedModule.getInstance(reactContext);
                    case "NotificationPreferences":
                      return NotificationPreferencesModule.getInstance(instance, reactContext);
                    default:
                      throw new IllegalArgumentException("Could not find module " + name);
                  }
                }

                @Override
                public ReactModuleInfoProvider getReactModuleInfoProvider() {
                  return () -> {
                    Map<String, ReactModuleInfo> map = new HashMap<>();
                    map.put("MattermostManaged", new ReactModuleInfo("MattermostManaged", "com.mattermost.rnbeta.MattermostManagedModule", false, false, false, false, false));
                    map.put("NotificationPreferences", new ReactModuleInfo("NotificationPreferences", "com.mattermost.rnbeta.NotificationPreferencesModule", false, false, false, false, false));
                    return map;
                  };
                }
              }
        );

        return packages;
      }

      @Override
      protected JSIModulePackage getJSIModulePackage() {
        return new JSIModulePackage() {
          @Override
          public List<JSIModuleSpec> getJSIModules(
            final ReactApplicationContext reactApplicationContext,
            final JavaScriptContextHolder jsContext
          ) {
            List<JSIModuleSpec> modules = Arrays.asList();
            modules.addAll(new WatermelonDBJSIPackage().getJSIModules(reactApplicationContext, jsContext));
            modules.addAll(new ReanimatedJSIModulePackage().getJSIModules(reactApplicationContext, jsContext));

            return modules;
          }
        };
      }

      @Override
      protected String getJSMainModuleName() {
        return "index";
      }
    };
  
  private final ReactNativeHost mNewArchitectureNativeHost =
      new MainApplicationReactNativeHost(this);

  @Override
  public ReactNativeHost getReactNativeHost() {
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      return mNewArchitectureNativeHost;
    } else {
      return mReactNativeHost;
    }
  }

  @Override
  public void onCreate() {
    super.onCreate();
    instance = this;

    // If you opted-in for the New Architecture, we enable the TurboModule system
    ReactFeatureFlags.useTurboModules = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED;
    SoLoader.init(this, /* native exopackage */ false);
    initializeFlipper(this, getReactNativeHost().getReactInstanceManager());

    Context context = getApplicationContext();

    // Delete any previous temp files created by the app
    File tempFolder = new File(context.getCacheDir(), RealPathUtil.CACHE_DIR_NAME);
    RealPathUtil.deleteTempFiles(tempFolder);
    Log.i("ReactNative", "Cleaning temp cache " + tempFolder.getAbsolutePath());

    // Tells React Native to use our RCTOkHttpClientFactory which builds an OKHttpClient
    // with a cookie jar defined in APIClientModule and an interceptor to intercept all
    // requests that originate from React Native's OKHttpClient
    OkHttpClientProvider.setOkHttpClientFactory(new RCTOkHttpClientFactory());
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

  /**
   * Loads Flipper in React Native templates. Call this in the onCreate method with something like
   * initializeFlipper(this, getReactNativeHost().getReactInstanceManager());
   */
  private static void initializeFlipper(
      Context context, ReactInstanceManager reactInstanceManager) {
    if (BuildConfig.DEBUG) {
      try {
        /*
         We use reflection here to pick up the class that initializes Flipper,
        since Flipper library is not available in release mode
        */
        Class<?> aClass = Class.forName("com.rn.ReactNativeFlipper");
        aClass
            .getMethod("initializeFlipper", Context.class, ReactInstanceManager.class)
            .invoke(null, context, reactInstanceManager);
      } catch (Exception e) {
        e.printStackTrace();
      }
    }
  }
}
