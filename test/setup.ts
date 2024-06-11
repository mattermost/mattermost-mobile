// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable react/no-multi-comp */

import {setGenerator} from '@nozbe/watermelondb/utils/common/randomId';
import * as ReactNative from 'react-native';
import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';
import {v4 as uuidv4} from 'uuid';

import {mockApiClient} from './mock_api_client';

import type {RequestOptions} from '@mattermost/react-native-network-client';
import type {ReadDirItem, StatResult} from 'react-native-fs';

import 'react-native-gesture-handler/jestSetup';
import '@testing-library/react-native/extend-expect';

// @ts-expect-error Promise does not exists in global
global.Promise = jest.requireActual('promise');

setGenerator(uuidv4);

require('isomorphic-fetch');

const WebViewMock = () => {
    return null;
};

jest.mock('react-native-webview', () => ({
    WebView: WebViewMock,
}));

jest.mock('@nozbe/watermelondb/utils/common/randomId/randomId', () => ({}));

/* eslint-disable no-console */
jest.mock('@database/manager');
jest.doMock('react-native', () => {
    const {
        Platform,
        StyleSheet,
        requireNativeComponent,
        Alert: RNAlert,
        InteractionManager: RNInteractionManager,
        NativeModules: RNNativeModules,
        Linking: RNLinking,
    } = ReactNative;

    const Alert = {
        ...RNAlert,
        alert: jest.fn(),
    };

    const InteractionManager = {
        ...RNInteractionManager,
        runAfterInteractions: jest.fn((cb) => cb()),
    };

    const NativeModules = {
        ...RNNativeModules,
        UIManager: {
            RCTView: {
                directEventTypes: {},
            },
        },
        PlatformConstants: {
            forceTouchAvailable: false,
        },
        RNGestureHandlerModule: {
            State: {
                BEGAN: 'BEGAN',
                FAILED: 'FAILED',
                ACTIVE: 'ACTIVE',
                END: 'END',
            },
        },
        KeyboardObserver: {},
        JailMonkey: {
            trustFall: jest.fn().mockReturnValue(true),
        },
        RNCNetInfo: {
            getCurrentState: jest.fn().mockResolvedValue({isConnected: true}),
            addListener: jest.fn(),
            removeListeners: jest.fn(),
            addEventListener: jest.fn(),
        },
        RNKeychainManager: {
            SECURITY_LEVEL_ANY: 'ANY',
            SECURITY_LEVEL_SECURE_SOFTWARE: 'SOFTWARE',
            SECURITY_LEVEL_SECURE_HARDWARE: 'HARDWARE',
        },
        RNReactNativeHapticFeedback: {
            trigger: jest.fn(),
        },
        RNDocumentPicker: {
            pick: jest.fn(),
        },
        RNFastStorage: {
            setupLibrary: jest.fn(),
            setStringAsync: jest.fn(),
        },
        Appearance: {
            getColorScheme: jest.fn().mockReturnValue('light'),
        },
        MattermostManaged: {
            getConstants: () => ({
                appGroupIdentifier: 'group.mattermost.rnbeta',
                appGroupSharedDirectory: {
                    sharedDirectory: '',
                    databasePath: '',
                },
            }),
        },
        SplitView: {
            addListener: jest.fn(),
            removeListeners: jest.fn(),
            isRunningInSplitView: jest.fn().mockReturnValue(() => ({isSplitView: false, isTablet: false})),
        },
        Notifications: {
            getDeliveredNotifications: jest.fn().mockResolvedValue([]),
            removeChannelNotifications: jest.fn().mockImplementation(),
            removeThreadNotifications: jest.fn().mockImplementation(),
            removeServerNotifications: jest.fn().mockImplementation(),
        },
        APIClient: {
            getConstants: () => ({
                EVENTS: {
                    UPLOAD_PROGRESS: 'APIClient-UploadProgress',
                    CLIENT_ERROR: 'APIClient-Error',
                },
                RETRY_TYPES: {
                    EXPONENTIAL_RETRY: 'exponential',
                    LINEAR_RETRY: 'linear',
                },
            }),
        },
        WebSocketClient: {
            getConstants: () => ({
                EVENTS: {
                    OPEN_EVENT: 'WebSocketClient-Open',
                    CLOSE_EVENT: 'WebSocketClient-Close',
                    ERROR_EVENT: 'WebSocketClient-Error',
                    MESSAGE_EVENT: 'WebSocketClient-Message',
                    READY_STATE_EVENT: 'WebSocketClient-ReadyState',
                    CLIENT_ERROR: 'WebSocketClient-Error',
                },
                READY_STATE: {
                    CONNECTING: 0,
                    OPEN: 1,
                    CLOSING: 2,
                    CLOSED: 3,
                },
            }),
        },
        WebRTCModule: {
            senderGetCapabilities: jest.fn().mockReturnValue(null),
            receiverGetCapabilities: jest.fn().mockReturnValue(null),
        },
    };

    const Linking = {
        ...RNLinking,
        openURL: jest.fn(),
        addEventListener: jest.fn(() => {
            return {remove: jest.fn()};
        }),
    };

    return Object.setPrototypeOf({
        Platform: {
            ...Platform,
            OS: 'ios',
            Version: 12,
            constants: {
                reactNativeVersion: {
                    major: 0,
                    minor: 64,
                },
            },
        },
        StyleSheet,
        requireNativeComponent,
        Alert,
        InteractionManager,
        NativeModules,
        Linking,
    }, ReactNative);
});

jest.mock('react-native-vector-icons', () => {
    const React = jest.requireActual('react');
    class CompassIcon extends React.PureComponent {
        render() {
            return React.createElement('Icon', this.props);
        }
    }
    CompassIcon.getImageSource = jest.fn().mockResolvedValue({});
    return {
        createIconSet: () => CompassIcon,

        createIconSetFromFontello: () => CompassIcon,
    };
});

jest.mock('react-native-fs', () => {
    const RNFS = {
        CachesDirectoryPath: 'root/cache',
        DocumentDirectoryPath: 'root/files',
        exists: async () => {
            return true;
        },
        unlink: async () => {
            return true;
        },
        mkdir: async () => {
            return true;
        },
        readDir: async (path: string): Promise<ReadDirItem[]> => {
            return [{
                ctime: undefined,
                mtime: undefined,
                name: 'testfile.test',
                path,
                size: 123,
                isFile: () => true,
                isDirectory: () => false,
            }];
        },
        stat: async (path: string): Promise<StatResult> => ({
            name: 'test name',
            path,
            size: 123,
            mode: 600,
            ctime: 0,
            mtime: 0,
            originalFilepath: path,
            isFile: () => true,
            isDirectory: () => false,
        }),
    };

    return RNFS;
});

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
jest.mock('../node_modules/react-native/Libraries/EventEmitter/NativeEventEmitter');

jest.mock('react-native-device-info', () => {
    return {
        getVersion: jest.fn(() => '0.0.0'),
        getBuildNumber: jest.fn(() => '0'),
        getModel: jest.fn(() => 'iPhone X'),
        hasNotch: jest.fn(() => true),
        isTablet: jest.fn(() => false),
        getApplicationName: jest.fn(() => 'Mattermost'),
        getSystemName: jest.fn(() => 'ios'),
        getSystemVersion: jest.fn(() => '0.0.0'),
    };
});

jest.mock('react-native-localize', () => ({
    getTimeZone: () => 'World/Somewhere',
    getLocales: () => ([
        {countryCode: 'GB', languageTag: 'en-GB', languageCode: 'en', isRTL: false},
        {countryCode: 'US', languageTag: 'en-US', languageCode: 'en', isRTL: false},
        {countryCode: 'FR', languageTag: 'fr-FR', languageCode: 'fr', isRTL: false},
    ]),
}));

jest.mock('@react-native-cookies/cookies', () => ({
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    openURL: jest.fn(),
    getInitialURL: jest.fn(),
    clearAll: jest.fn(),
    get: () => Promise.resolve(({
        res: {
            MMCSRF: {
                value: 'the cookie',
            },
        },
    })),
}));

jest.mock('react-native-navigation', () => {
    const RNN = jest.requireActual('react-native-navigation');
    RNN.Navigation.setLazyComponentRegistrator = jest.fn();
    RNN.Navigation.setDefaultOptions = jest.fn();
    RNN.Navigation.registerComponent = jest.fn();
    return {
        ...RNN,
        Navigation: {
            ...RNN.Navigation,
            events: () => ({
                registerAppLaunchedListener: jest.fn(),
                registerComponentListener: jest.fn(() => {
                    return {remove: jest.fn()};
                }),
                bindComponent: jest.fn(() => {
                    return {remove: jest.fn()};
                }),
                registerNavigationButtonPressedListener: jest.fn(() => {
                    return {remove: jest.fn()};
                }),
            }),
            setRoot: jest.fn(),
            pop: jest.fn(),
            push: jest.fn(),
            showModal: jest.fn(),
            dismissModal: jest.fn(),
            dismissAllModals: jest.fn(),
            popToRoot: jest.fn(),
            mergeOptions: jest.fn(),
            showOverlay: jest.fn(),
            dismissOverlay: jest.fn(),
        },
    };
});

jest.mock('react-native-notifications', () => {
    let deliveredNotifications: ReactNative.PushNotification[] = [];

    return {
        Notifications: {
            registerRemoteNotifications: jest.fn(),
            addEventListener: jest.fn(),
            setDeliveredNotifications: jest.fn((notifications) => {
                deliveredNotifications = notifications;
            }),
            NotificationAction: jest.fn(),
            NotificationCategory: jest.fn(),
            events: () => ({
                registerNotificationOpened: jest.fn(),
                registerRemoteNotificationsRegistered: jest.fn(),
                registerNotificationReceivedBackground: jest.fn(),
                registerNotificationReceivedForeground: jest.fn(),
            }),
            ios: {
                getDeliveredNotifications: jest.fn().mockImplementation(() => Promise.resolve(deliveredNotifications)),
                removeDeliveredNotifications: jest.fn((ids) => {
                    // eslint-disable-next-line
                    // @ts-ignore
                    deliveredNotifications = deliveredNotifications.filter((n) => !ids.includes(n.identifier));
                }),
                setBadgeCount: jest.fn(),
            },
        },
    };
});

jest.mock('react-native-share', () => ({
    default: jest.fn(),
}));

jest.mock('@screens/navigation', () => ({
    resetToChannel: jest.fn(),
    resetToSelectServer: jest.fn(),
    resetToTeams: jest.fn(),
    goToScreen: jest.fn(),
    popTopScreen: jest.fn(),
    showModal: jest.fn(),
    showModalOverCurrentContext: jest.fn(),
    setButtons: jest.fn(),
    showOverlay: jest.fn(),
    mergeNavigationOptions: jest.fn(),
    popToRoot: jest.fn(() => Promise.resolve()),
    dismissModal: jest.fn(() => Promise.resolve()),
    dismissAllModals: jest.fn(() => Promise.resolve()),
    dismissAllModalsAndPopToScreen: jest.fn(),
    dismissAllModalsAndPopToRoot: jest.fn(),
    dismissOverlay: jest.fn(() => Promise.resolve()),
}));

jest.mock('@mattermost/react-native-emm', () => ({
    addListener: jest.fn(),
    authenticate: async () => {
        return true;
    },
    getManagedConfig: <T>() => ({} as T),
    isDeviceSecured: async () => {
        return true;
    },
    openSecuritySettings: () => jest.fn(),
    setAppGroupId: () => {
        return '';
    },
    useManagedConfig: () => ({}),
}));

jest.mock('@react-native-clipboard/clipboard', () => ({}));

jest.mock('react-native-document-picker', () => ({}));

jest.mock('@mattermost/react-native-network-client', () => ({
    getOrCreateAPIClient: (serverUrl: string) => ({client: {
        baseUrl: serverUrl,
        get: (url: string, options?: RequestOptions) => mockApiClient.get(`${serverUrl}${url}`, options),
        post: (url: string, options?: RequestOptions) => mockApiClient.post(`${serverUrl}${url}`, options),
        invalidate: jest.fn(),
    }}),
    RetryTypes: {
        EXPONENTIAL_RETRY: 'exponential',
    },
}));

jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('react-native-permissions', () => require('react-native-permissions/mock'));

jest.mock('react-native-haptic-feedback', () => {
    const RNHF = jest.requireActual('react-native-haptic-feedback');
    return {
        ...RNHF,
        trigger: () => '',
    };
});

declare const global: {
    requestAnimationFrame: (callback: () => void) => void;
    performance: {
        now: () => number;
    };
};

global.requestAnimationFrame = (callback) => {
    setTimeout(callback, 0);
};

global.performance.now = () => Date.now();
