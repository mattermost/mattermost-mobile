// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';
import {Navigation} from 'react-native-navigation';
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import merge from 'deepmerge';

import EventEmitter from '@mm-redux/utils/event_emitter';

import * as NavigationActions from '@actions/navigation';
import Preferences from '@mm-redux/constants/preferences';
import EphemeralStore from '@store/ephemeral_store';
import intitialState from '@store/initial_state';
import Store from '@store/store';
import {NavigationTypes} from '@constants';

jest.unmock('@actions/navigation');
jest.mock('@store/ephemeral_store', () => ({
    getNavigationTopComponentId: jest.fn(),
    clearNavigationComponents: jest.fn(),
    addNavigationModal: jest.fn(),
    hasModalsOpened: jest.fn().mockReturnValue(true),
}));

const mockStore = configureMockStore([thunk]);
const store = mockStore(intitialState);
Store.redux = store;

describe('@actions/navigation', () => {
    const topComponentId = 'top-component-id';
    const name = 'name';
    const title = 'title';
    const theme = Preferences.THEMES.default;
    const passProps = {
        testProp: 'prop',
    };
    const options = {
        testOption: 'test',
    };
    EphemeralStore.getNavigationTopComponentId.mockReturnValue(topComponentId);

    test('resetToChannel should call Navigation.setRoot', () => {
        const setRoot = jest.spyOn(Navigation, 'setRoot');

        const expectedLayout = {
            root: {
                stack: {
                    children: [{
                        component: {
                            id: 'Channel',
                            name: 'Channel',
                            passProps,
                            options: {
                                layout: {
                                    componentBackgroundColor: theme.centerChannelBg,
                                },
                                statusBar: {
                                    visible: true,
                                },
                                topBar: {
                                    visible: false,
                                    height: 0,
                                    backButton: {
                                        visible: false,
                                        enableMenu: false,
                                        color: theme.sidebarHeaderTextColor,
                                    },
                                    background: {
                                        color: theme.sidebarHeaderBg,
                                    },
                                },
                            },
                        },
                    }],
                },
            },
        };

        NavigationActions.resetToChannel(passProps);
        expect(setRoot).toHaveBeenCalledWith(expectedLayout);
    });

    test('resetToSelectServer should call Navigation.setRoot', () => {
        const setRoot = jest.spyOn(Navigation, 'setRoot');

        const allowOtherServers = false;
        const expectedLayout = {
            root: {
                stack: {
                    children: [{
                        component: {
                            id: 'SelectServer',
                            name: 'SelectServer',
                            passProps: {
                                allowOtherServers,
                            },
                            options: {
                                layout: {
                                    backgroundColor: theme.centerChannelBg,
                                    componentBackgroundColor: theme.centerChannelBg,
                                },
                                statusBar: {
                                    visible: true,
                                },
                                topBar: {
                                    backButton: {
                                        color: theme.sidebarHeaderTextColor,
                                        enableMenu: false,
                                        title: '',
                                    },
                                    background: {
                                        color: theme.sidebarHeaderBg,
                                    },
                                    visible: false,
                                    height: 0,
                                },
                            },
                        },
                    }],
                },
            },
        };

        NavigationActions.resetToSelectServer(allowOtherServers);
        expect(setRoot).toHaveBeenCalledWith(expectedLayout);
    });

    test('resetToTeams should call Navigation.setRoot', () => {
        const setRoot = jest.spyOn(Navigation, 'setRoot');

        const defaultOptions = {
            layout: {
                componentBackgroundColor: theme.centerChannelBg,
            },
            statusBar: {
                visible: true,
            },
            topBar: {
                visible: true,
                title: {
                    color: theme.sidebarHeaderTextColor,
                    text: title,
                },
                backButton: {
                    color: theme.sidebarHeaderTextColor,
                    enableMenu: false,
                    title: '',
                },
                background: {
                    color: theme.sidebarHeaderBg,
                },
            },
        };

        const expectedLayout = {
            root: {
                stack: {
                    children: [{
                        component: {
                            id: name,
                            name,
                            passProps,
                            options: merge(defaultOptions, options),
                        },
                    }],
                },
            },
        };

        NavigationActions.resetToTeams(name, title, passProps, options);
        expect(setRoot).toHaveBeenCalledWith(expectedLayout);
    });

    test('goToScreen should call Navigation.push', () => {
        const push = jest.spyOn(Navigation, 'push');

        const defaultOptions = {
            layout: {
                componentBackgroundColor: theme.centerChannelBg,
            },
            popGesture: true,
            sideMenu: {
                left: {enabled: false},
                right: {enabled: false},
            },
            topBar: {
                animate: true,
                visible: true,
                backButton: {
                    color: theme.sidebarHeaderTextColor,
                    enableMenu: false,
                    title: '',
                    testID: 'screen.back.button',
                },
                background: {
                    color: theme.sidebarHeaderBg,
                },
                title: {
                    color: theme.sidebarHeaderTextColor,
                    text: title,
                },
            },
        };

        const expectedLayout = {
            component: {
                id: name,
                name,
                passProps,
                options: merge(defaultOptions, options),
            },
        };

        NavigationActions.goToScreen(name, title, passProps, options);
        expect(push).toHaveBeenCalledWith(topComponentId, expectedLayout);
    });

    test('popTopScreen should call Navigation.pop', () => {
        const pop = jest.spyOn(Navigation, 'pop');

        NavigationActions.popTopScreen();
        expect(pop).toHaveBeenCalledWith(topComponentId);

        const otherComponentId = `other-${topComponentId}`;
        NavigationActions.popTopScreen(otherComponentId);
        expect(pop).toHaveBeenCalledWith(otherComponentId);
    });

    test('popToRoot should call Navigation.popToRoot', async () => {
        const popToRoot = jest.spyOn(Navigation, 'popToRoot');

        await NavigationActions.popToRoot();
        expect(popToRoot).toHaveBeenCalledWith(topComponentId);
    });

    test('showModal should call Navigation.showModal', () => {
        const showModal = jest.spyOn(Navigation, 'showModal');

        const defaultOptions = {
            modalPresentationStyle: Platform.select({ios: 'pageSheet', android: 'none'}),
            layout: {
                componentBackgroundColor: theme.centerChannelBg,
            },
            statusBar: {
                visible: true,
            },
            topBar: {
                animate: true,
                visible: true,
                backButton: {
                    color: theme.sidebarHeaderTextColor,
                    enableMenu: false,
                    title: '',
                },
                background: {
                    color: theme.sidebarHeaderBg,
                },
                title: {
                    color: theme.sidebarHeaderTextColor,
                    text: title,
                },
                leftButtonColor: theme.sidebarHeaderTextColor,
                rightButtonColor: theme.sidebarHeaderTextColor,
            },
        };

        const expectedLayout = {
            stack: {
                children: [{
                    component: {
                        id: name,
                        name,
                        passProps,
                        options: merge(defaultOptions, options),
                    },
                }],
            },
        };

        NavigationActions.showModal(name, title, passProps, options);
        expect(showModal).toHaveBeenCalledWith(expectedLayout);
    });

    test('showModalOverCurrentContext should call Navigation.showModal', () => {
        const showModal = jest.spyOn(Navigation, 'showModal');

        const animationsEnabled = (Platform.OS === 'android').toString();
        const showModalOverCurrentContextTitle = '';
        const showModalOverCurrentContextOptions = {
            modalPresentationStyle: 'overCurrentContext',
            layout: {
                backgroundColor: 'transparent',
                componentBackgroundColor: 'transparent',
            },
            topBar: {
                visible: false,
                height: 0,
            },
            animations: {
                showModal: {
                    waitForRender: true,
                    enabled: animationsEnabled,
                    alpha: {
                        from: 0,
                        to: 1,
                        duration: 250,
                    },
                },
                dismissModal: {
                    enabled: animationsEnabled,
                    alpha: {
                        from: 1,
                        to: 0,
                        duration: 250,
                    },
                },
            },
        };
        const showModalOptions = {
            modalPresentationStyle: Platform.select({ios: 'fullScreen', android: 'none'}),
            layout: {
                componentBackgroundColor: theme.centerChannelBg,
            },
            statusBar: {
                visible: true,
            },
            topBar: {
                animate: true,
                visible: true,
                backButton: {
                    color: theme.sidebarHeaderTextColor,
                    enableMenu: false,
                    title: '',
                },
                background: {
                    color: theme.sidebarHeaderBg,
                },
                title: {
                    color: theme.sidebarHeaderTextColor,
                    text: showModalOverCurrentContextTitle,
                },
                leftButtonColor: theme.sidebarHeaderTextColor,
                rightButtonColor: theme.sidebarHeaderTextColor,
            },
        };
        const defaultOptions = merge(showModalOverCurrentContextOptions, options);

        const expectedLayout = {
            stack: {
                children: [{
                    component: {
                        id: name,
                        name,
                        passProps,
                        options: merge(showModalOptions, defaultOptions),
                    },
                }],
            },
        };

        NavigationActions.showModalOverCurrentContext(name, passProps, options);
        expect(showModal).toHaveBeenCalledWith(expectedLayout);
    });

    test('showSearchModal should call Navigation.showModal', () => {
        const showModal = jest.spyOn(Navigation, 'showModal');

        const showSearchModalName = 'Search';
        const showSearchModalTitle = '';
        const initialValue = 'initial-value';
        const showSearchModalPassProps = {initialValue};
        const showSearchModalOptions = {
            topBar: {
                visible: false,
                height: 0,
            },
        };
        const defaultOptions = {
            modalPresentationStyle: Platform.select({ios: 'pageSheet', android: 'none'}),
            layout: {
                componentBackgroundColor: theme.centerChannelBg,
            },
            statusBar: {
                visible: true,
            },
            topBar: {
                animate: true,
                visible: true,
                backButton: {
                    color: theme.sidebarHeaderTextColor,
                    enableMenu: false,
                    title: '',
                },
                background: {
                    color: theme.sidebarHeaderBg,
                },
                title: {
                    color: theme.sidebarHeaderTextColor,
                    text: showSearchModalTitle,
                },
                leftButtonColor: theme.sidebarHeaderTextColor,
                rightButtonColor: theme.sidebarHeaderTextColor,
            },
        };

        const expectedLayout = {
            stack: {
                children: [{
                    component: {
                        id: showSearchModalName,
                        name: showSearchModalName,
                        passProps: showSearchModalPassProps,
                        options: merge(defaultOptions, showSearchModalOptions),
                    },
                }],
            },
        };

        NavigationActions.showSearchModal(initialValue);
        expect(showModal).toHaveBeenCalledWith(expectedLayout);
    });

    test('dismissModal should call Navigation.dismissModal', async () => {
        const dismissModal = jest.spyOn(Navigation, 'dismissModal');

        await NavigationActions.dismissModal(options);
        expect(dismissModal).toHaveBeenCalledWith(topComponentId, options);
    });

    test('dismissAllModals should call Navigation.dismissAllModals', async () => {
        const dismissAllModals = jest.spyOn(Navigation, 'dismissAllModals');

        await NavigationActions.dismissAllModals(options);
        expect(dismissAllModals).toHaveBeenCalledWith(options);
    });

    test('mergeNavigationOptions should call Navigation.mergeOptions', () => {
        const mergeOptions = jest.spyOn(Navigation, 'mergeOptions');

        NavigationActions.mergeNavigationOptions(topComponentId, options);
        expect(mergeOptions).toHaveBeenCalledWith(topComponentId, options);
    });

    test('setButtons should call Navigation.mergeOptions', () => {
        const mergeOptions = jest.spyOn(Navigation, 'mergeOptions');

        const buttons = {
            leftButtons: ['left-button'],
            rightButtons: ['right-button'],
        };
        const setButtonsOptions = {
            topBar: {
                ...buttons,
            },
        };

        NavigationActions.setButtons(topComponentId, buttons);
        expect(mergeOptions).toHaveBeenCalledWith(topComponentId, setButtonsOptions);
    });

    test('showOverlay should call Navigation.showOverlay', () => {
        const showOverlay = jest.spyOn(Navigation, 'showOverlay');

        const defaultOptions = {
            layout: {
                backgroundColor: 'transparent',
                componentBackgroundColor: 'transparent',
            },
            overlay: {
                interceptTouchOutside: false,
            },
        };

        const expectedLayout = {
            component: {
                name,
                passProps,
                options: merge(defaultOptions, options),
            },
        };

        NavigationActions.showOverlay(name, passProps, options);
        expect(showOverlay).toHaveBeenCalledWith(expectedLayout);
    });

    test('dismissOverlay should call Navigation.dismissOverlay', async () => {
        const dismissOverlay = jest.spyOn(Navigation, 'dismissOverlay');

        await NavigationActions.dismissOverlay(topComponentId);
        expect(dismissOverlay).toHaveBeenCalledWith(topComponentId);
    });

    test('dismissAllModalsAndPopToRoot should call Navigation.dismissAllModals, Navigation.popToRoot, and emit event', async () => {
        const dismissAllModals = jest.spyOn(Navigation, 'dismissAllModals');
        const popToRoot = jest.spyOn(Navigation, 'popToRoot');
        EventEmitter.emit = jest.fn();

        await NavigationActions.dismissAllModalsAndPopToRoot();
        expect(dismissAllModals).toHaveBeenCalled();
        expect(popToRoot).toHaveBeenCalledWith(topComponentId);
        expect(EventEmitter.emit).toHaveBeenCalledWith(NavigationTypes.NAVIGATION_DISMISS_AND_POP_TO_ROOT);
    });
});
