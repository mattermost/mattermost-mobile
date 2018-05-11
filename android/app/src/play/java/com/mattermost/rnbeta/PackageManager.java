package com.mattermost.rnbeta;

import com.facebook.react.ReactPackage;
import com.inprogress.reactnativeyoutube.ReactNativeYouTube;

import java.util.Arrays;
import java.util.List;

public class PackageManager {
  public static List<ReactPackage> getOptionalPackages() {
    return Arrays.<ReactPackage>asList(
        new ReactNativeYouTube()
    );
  }
}
