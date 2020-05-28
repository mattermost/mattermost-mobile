// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as ReactNative from 'react-native';
import MockAsyncStorage from 'mock-async-storage';
import {configure} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';

require('isomorphic-fetch');

configure({adapter: new Adapter()});

const mockImpl = new MockAsyncStorage();
jest.mock('@react-native-community/async-storage', () => mockImpl);
global.window = {};

/* eslint-disable no-console */

jest.doMock('react-native', () => {
    const {
        Platform,
        StyleSheet,
        ViewPropTypes,
        PermissionsAndroid,
        ImagePickerManager,
        requireNativeComponent,
        Alert: RNAlert,
        InteractionManager: RNInteractionManager,
        NativeModules: RNNativeModules,
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
        BlurAppScreen: () => true,
        MattermostManaged: {
            getConfig: jest.fn(),
        },
        MattermostShare: {
            close: jest.fn(),
            cacheDirName: 'mmShare',
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
        StatusBarManager: {
            getHeight: jest.fn(),
        },
        RNDocumentPicker: {
            pick: jest.fn(),
        },
        RNPermissions: {},
        RNFastStorage: {
            setupLibrary: jest.fn(),
            setStringAsync: jest.fn(),
        },
    };

    return Object.setPrototypeOf({
        Platform,
        StyleSheet,
        ViewPropTypes,
        PermissionsAndroid,
        ImagePickerManager,
        requireNativeComponent,
        Alert,
        InteractionManager,
        NativeModules,
    }, ReactNative);
});

jest.mock('react-native/Libraries/Animated/src/NativeAnimatedHelper');
jest.mock('../node_modules/react-native/Libraries/EventEmitter/NativeEventEmitter');

jest.mock('react-native-device-info', () => {
    return {
        getVersion: () => '0.0.0',
        getBuildNumber: () => '0',
        getModel: () => 'iPhone X',
        isTablet: () => false,
        getApplicationName: () => 'Mattermost',
    };
});

jest.mock('rn-fetch-blob', () => ({
    fs: {
        dirs: {
            DocumentDir: () => jest.fn(),
            CacheDir: '/data/com.mattermost.beta/cache',
        },
        exists: jest.fn(),
        existsWithDiffExt: jest.fn(),
        unlink: jest.fn(),
        mv: jest.fn(),
    },
    fetch: jest.fn(),
    config: jest.fn(),
}));

jest.mock('rn-fetch-blob/fs', () => ({
    dirs: {
        DocumentDir: () => jest.fn(),
        CacheDir: '/data/com.mattermost.beta/cache',
    },
    exists: jest.fn(),
    existsWithDiffExt: jest.fn(),
    unlink: jest.fn(),
    mv: jest.fn(),
}));

jest.mock('react-native-localize', () => ({
    getTimeZone: () => 'World/Somewhere',
    getLocales: () => ([
        {countryCode: 'GB', languageTag: 'en-GB', languageCode: 'en', isRTL: false},
        {countryCode: 'US', languageTag: 'en-US', languageCode: 'en', isRTL: false},
        {countryCode: 'FR', languageTag: 'fr-FR', languageCode: 'fr', isRTL: false},
    ]),
}));

jest.mock('@react-native-community/cookies', () => ({
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    openURL: jest.fn(),
    canOpenURL: jest.fn(),
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
    return {
        ...RNN,
        Navigation: {
            ...RNN.Navigation,
            events: () => ({
                registerAppLaunchedListener: jest.fn(),
                bindComponent: jest.fn(),
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

jest.mock('app/actions/navigation', () => ({
    resetToChannel: jest.fn(),
    resetToSelectServer: jest.fn(),
    resetToTeams: jest.fn(),
    goToScreen: jest.fn(),
    popTopScreen: jest.fn(),
    showModal: jest.fn(),
    showModalOverCurrentContext: jest.fn(),
    showSearchModal: jest.fn(),
    setButtons: jest.fn(),
    showOverlay: jest.fn(),
    mergeNavigationOptions: jest.fn(),
    popToRoot: jest.fn(() => Promise.resolve()),
    dismissModal: jest.fn(() => Promise.resolve()),
    dismissAllModals: jest.fn(() => Promise.resolve()),
    dismissOverlay: jest.fn(() => Promise.resolve()),
}));

let logs = [];
let warns = [];
let errors = [];
beforeAll(() => {
    console.originalLog = console.log;
    console.log = jest.fn((...params) => {
        console.originalLog(...params);
        logs.push(params);
    });

    console.originalWarn = console.warn;
    console.warn = jest.fn((...params) => {
        console.originalWarn(...params);
        warns.push(params);
    });

    console.originalError = console.error;
    console.error = jest.fn((...params) => {
        console.originalError(...params);
        errors.push(params);
    });
});

beforeEach(() => {
    logs = [];
    warns = [];
    errors = [];
});

global.requestAnimationFrame = (callback) => {
    setTimeout(callback, 0);
};
