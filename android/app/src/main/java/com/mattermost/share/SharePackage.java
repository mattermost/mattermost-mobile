package com.mattermost.share;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.JavaScriptModule;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.uimanager.ViewManager;
import com.facebook.react.ReactPackage;
import com.mattermost.rnbeta.MainApplication;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class SharePackage implements ReactPackage {
    MainApplication mApplication;

    public SharePackage(MainApplication application) {
        mApplication = application;
    }

    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        return Arrays.<NativeModule>asList(new ShareModule(mApplication, reactContext));
    }

    public List<Class<? extends JavaScriptModule>> createJSModules() {
        return Collections.emptyList();
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}
