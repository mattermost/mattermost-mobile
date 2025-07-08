// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable react/no-multi-comp */

import {setGenerator} from '@nozbe/watermelondb/utils/common/randomId';
import * as ReactNative from 'react-native';
import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';
import {v4 as uuidv4} from 'uuid';

import 'react-native-gesture-handler/jestSetup';

import {mockApiClient} from './mock_api_client';

import type {RequestOptions} from '@mattermost/react-native-network-client';

// @ts-expect-error Promise does not exists in global
global.Promise = jest.requireActual('promise');

// eslint-disable-next-line no-process-env
process.env.EXPO_OS = 'ios';

setGenerator(uuidv4);

require('isomorphic-fetch');

jest.mock('expo-application', () => {
    return {
        nativeApplicationVersion: '0.0.0',
        nativeBuildVersion: '0',
        applicationName: 'Mattermost',
        applicationId: 'com.mattermost.rnbeta',
    };
});

jest.mock('expo-crypto', () => ({
    randomUUID: jest.fn(() => '12345678-1234-1234-1234-1234567890ab'),
}));

jest.mock('expo-device', () => {
    return {
        deviceName: 'Device',
        osName: 'Test',
        osVersion: '0.0.0',
        applicationId: 'com.mattermost.rnbeta',
        isRootedExperimentalAsync: jest.fn().mockResolvedValue(false),
    };
});

jest.mock('expo-file-system', () => ({
    downloadAsync: jest.fn(() => Promise.resolve({md5: 'md5', uri: 'uri'})),
    getInfoAsync: jest.fn(() => Promise.resolve({exists: true, md5: 'md5', uri: 'uri'})),
    readAsStringAsync: jest.fn(() => Promise.resolve()),
    writeAsStringAsync: jest.fn(() => Promise.resolve()),
    deleteAsync: jest.fn(() => Promise.resolve()),
    moveAsync: jest.fn(() => Promise.resolve()),
    copyAsync: jest.fn(() => Promise.resolve()),
    makeDirectoryAsync: jest.fn(() => Promise.resolve()),
    readDirectoryAsync: jest.fn(() => Promise.resolve()),
    createDownloadResumable: jest.fn(() => Promise.resolve()),
    documentDirectory: 'file:///test-directory/',
    cacheDirectory: 'file://test-cache-directory/',
}));

jest.mock('expo-web-browser', () => ({
    openAuthSessionAsync: jest.fn().mockResolvedValue(({
        type: 'success',
        url: 'mmauthbeta://callback?MMAUTHTOKEN=123&MMCSRF=456',
    })),
}));

jest.mock('@react-native-camera-roll/camera-roll', () => ({}));

jest.mock('@mattermost/react-native-turbo-log', () => ({
    getLogPaths: jest.fn(),
}));

jest.mock('@nozbe/watermelondb/utils/common/randomId/randomId', () => ({}));
jest.mock('@nozbe/watermelondb/react/withObservables/garbageCollector', () => {
    return {
        __esModule: true,
        default: jest.fn(),
    };
});

/* eslint-disable no-console */
jest.mock('@database/manager');
jest.doMock('react-native', () => {
    const {
        AppState: RNAppState,
        Platform,
        StyleSheet,
        requireNativeComponent,
        Alert: RNAlert,
        InteractionManager: RNInteractionManager,
        NativeModules: RNNativeModules,
        Linking: RNLinking,
        Keyboard: RNKeyboard,
    } = ReactNative;

    const Alert = {
        ...RNAlert,
        alert: jest.fn(),
    };

    const AppState = {
        ...RNAppState,
        currentState: 'active',
        addEventListener: jest.fn(() => ({
            remove: jest.fn(),
        })),
    };

    let activeInteractions = 0;
    const pendingCallbacks: Array<() => void> = [];
    const InteractionManager = {
        ...RNInteractionManager,
        createInteractionHandle: jest.fn(() => {
            activeInteractions += 1;
            return activeInteractions;
        }),
        clearInteractionHandle: jest.fn(() => {
            activeInteractions = Math.max(0, activeInteractions - 1);
            if (activeInteractions === 0) {
                // Execute pending callbacks when interactions are cleared
                while (pendingCallbacks.length > 0) {
                    const cb = pendingCallbacks.shift();
                    cb?.();
                }
            }
        }),
        runAfterInteractions: jest.fn((callback) => {
            if (activeInteractions === 0) {
                callback();
            } else {
                pendingCallbacks.push(callback); // Delay execution until interactions finish
            }
        }),
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
        RNUtils: {
            getConstants: () => ({
                appGroupIdentifier: 'group.mattermost.rnbeta',
                appGroupSharedDirectory: {
                    sharedDirectory: '',
                    databasePath: '',
                },
            }),
            addListener: jest.fn(),
            removeListeners: jest.fn(),
            isRunningInSplitView: jest.fn().mockReturnValue({isSplit: false, isTablet: false}),
            getHasRegisteredLoad: jest.fn().mockReturnValue({hasRegisteredLoad: false}),
            setHasRegisteredLoad: jest.fn(),

            getDeliveredNotifications: jest.fn().mockResolvedValue([]),
            removeChannelNotifications: jest.fn().mockImplementation(),
            removeThreadNotifications: jest.fn().mockImplementation(),
            removeServerNotifications: jest.fn().mockImplementation(),

            createZipFile: jest.fn(),
            saveFile: jest.fn(),

            unlockOrientation: jest.fn(),
            getWindowDimensions: jest.fn().mockReturnValue({width: 426, height: 952}),
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

    const Keyboard = {
        ...RNKeyboard,
        dismiss: jest.fn(),
        addListener: jest.fn(() => ({
            remove: jest.fn(),
        })),
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
            select: jest.fn((dict) => dict.ios || dict.default),
        },
        StyleSheet,
        requireNativeComponent,
        Alert,
        AppState,
        InteractionManager,
        NativeModules,
        Linking,
        Keyboard,
        Animated: {
            ...ReactNative.Animated,
            timing: jest.fn(() => ({
                start: jest.fn((callback) => callback?.({finished: true})),
            })),
        },
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

jest.mock('../node_modules/react-native/Libraries/EventEmitter/NativeEventEmitter');

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
            updateProps: jest.fn(),
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
            postLocalNotification: jest.fn((notification) => notification),
        },
    };
});

jest.mock('react-native-share', () => ({
    default: jest.fn(),
}));

jest.mock('@screens/navigation', () => ({
    ...jest.requireActual('@screens/navigation'),
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
    dismissAllOverlays: jest.fn(() => Promise.resolve()),
    dismissBottomSheet: jest.fn(),
    openUserProfileModal: jest.fn(),
    popTo: jest.fn(),
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
    getOrCreateAPIClient: jest.fn((serverUrl: string) => Promise.resolve({client: {
        baseUrl: serverUrl,
        get: (url: string, options?: RequestOptions) => mockApiClient.get(`${serverUrl}${url}`, options),
        post: (url: string, options?: RequestOptions) => mockApiClient.post(`${serverUrl}${url}`, options),
        invalidate: jest.fn(),
    }})),
    RetryTypes: {
        EXPONENTIAL_RETRY: 'exponential',
    },
}));

jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);

require('@shopify/flash-list/jestSetup');

require('react-native-reanimated').setUpTests();
jest.mock('react-native-permissions', () => require('react-native-permissions/mock'));

jest.mock('react-native-haptic-feedback', () => {
    const RNHF = jest.requireActual('react-native-haptic-feedback/src/types');
    return {
        ...RNHF,
        trigger: () => '',
    };
});

jest.mock('@utils/log', () => ({
    logError: jest.fn(),
    logDebug: jest.fn(),
    logInfo: jest.fn(),
    logWarning: jest.fn(),
}));

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

const colors = {
    reset: '\x1b[0m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    blue: '\x1b[1;34m',
};

const filterStackTrace = (color: string, prefix: string) => {
    return (...args: unknown[]) => {
        const message = args.join(' ');
        process.stdout.write(`\n${color}${prefix} ${message}${colors.reset}\n`);
    };
};

// Override console methods globally
console.warn = filterStackTrace(colors.yellow, '⚠️  Warning:');
console.error = filterStackTrace(colors.red, '🚨 Error:');
console.log = filterStackTrace(colors.cyan, '📢 Log:');
console.debug = filterStackTrace(colors.blue, '🐞 Debug:');

// Silence warnings about missing EXPO_OS environment variable
// on tests
process.env.EXPO_OS = 'ios'; // eslint-disable-line no-process-env
