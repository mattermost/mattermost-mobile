package com.mattermost.share.tests;

import com.facebook.react.bridge.ReactApplicationContext;

import org.junit.Test;
import org.junit.Before;
import org.junit.runner.RunWith;

import org.robolectric.Robolectric;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.RobolectricTestRunner;

import org.powermock.core.classloader.annotations.PowerMockIgnore;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import static com.google.common.truth.Truth.assertThat;

import com.mattermost.share.ShareModule;
import com.mattermost.rnbeta2.MainApplication;

@RunWith(RobolectricTestRunner.class)
// @Config(manifest = "src/app/AndroidManifest.xml")
public class ShareModuleTest {
    
    private ShareModule mShareModule;

    @Mock private MainApplication mMainApplication;

    @Before
    public void setup() {
        ReactApplicationContext mReactApplicationContext = new ReactApplicationContext(RuntimeEnvironment.application);
        mShareModule = new ShareModule(mMainApplication, mReactApplicationContext);
    }

    // @Test
    // public void processIntent_ForNullActivity_ReturnsEmptyItems() {
    //     String test = "test";
    //     assertThat(test).isEqualTo("TODO");
    // }

    @Test
    public void processIntent_ACTION_SEND_ForTextPlainMIME_ReturnsMap() {
        // ShareModule shareModule = new ShareModule(mMainApplication, mReactContext);
        // WritableArray items = shareModule.processIntent();
    }

    // @Test
    // public void processIntent_ACTION_SEND_ForImageMIME_ReturnsMap() {
    //     String test = "test";
    //     assertThat(test).isEqualTo("test");
    // }

    // @Test
    // public void processIntent_ACTION_SEND_ForVideoMIME_ReturnsMap() {
    //     String test = "test";
    //     assertThat(test).isEqualTo("test");
    // }

    // @Test
    // public void processIntent_ACTION_SEND_MULTIPLE_ForImageMIME_ReturnsMap() {
    //     String test = "test";
    //     assertThat(test).isEqualTo("test");
    // }

    // @Test
    // public void processIntent_ACTION_SEND_MULTIPLE_ForVideoMIME_ReturnsMap() {
    //     String test = "test";
    //     assertThat(test).isEqualTo("test");
    // }

    // @Test
    // public void processIntent_ACTION_SEND_MULTIPLE_ForOtherMIME_ReturnsMap() {
    //     String test = "test";
    //     assertThat(test).isEqualTo("test");
    // }
}