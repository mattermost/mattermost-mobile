// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';
import {Navigation} from 'react-native-navigation';

import merge from 'deepmerge';

import Preferences from 'mattermost-redux/constants/preferences';

import EphemeralStore from 'app/store/ephemeral_store';
import * as NavigationActions from 'app/actions/navigation';
import {getColorStyles} from 'app/utils/appearance';

jest.unmock('app/actions/navigation');
jest.mock('app/store/ephemeral_store', () => ({
    getNavigationTopComponentId: jest.fn(),
}));

describe('app/actions/navigation', () => {
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
                            name: 'Channel',
                            passProps,
                            options: {
                                layout: {
                                    backgroundColor: 'transparent',
                                },
                                statusBar: {
                                    visible: true,
                                },
                                topBar: {
                                    visible: false,
                                    height: 0,
                                    backButton: {
                                        color: theme.sidebarHeaderTextColor,
                                        title: '',
                                    },
                                    background: {
                                        color: theme.sidebarHeaderBg,
                                    },
                                    title: {
                                        color: theme.sidebarHeaderTextColor,
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
        const colorStyles = getColorStyles('dark');

        const allowOtherServers = false;
        const expectedLayout = {
            root: {
                stack: {
                    children: [{
                        component: {
                            name: 'SelectServer',
                            passProps: {
                                allowOtherServers,
                            },
                            options: {
                                statusBar: {
                                    visible: true,
                                },
                                topBar: {
                                    backButton: {
                                        color: colorStyles.navigation.color,
                                        title: '',
                                    },
                                    background: {
                                        color: colorStyles.navigation.backgroundColor,
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
                backgroundColor: theme.centerChannelBg,
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
                backgroundColor: theme.centerChannelBg,
            },
            topBar: {
                animate: true,
                visible: true,
                backButton: {
                    color: theme.sidebarHeaderTextColor,
                    title: '',
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
            layout: {
                backgroundColor: theme.centerChannelBg,
            },
            statusBar: {
                visible: true,
            },
            topBar: {
                animate: true,
                visible: true,
                backButton: {
                    color: theme.sidebarHeaderTextColor,
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
            },
            topBar: {
                visible: false,
                height: 0,
            },
            animations: {
                showModal: {
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
            layout: {
                backgroundColor: theme.centerChannelBg,
            },
            statusBar: {
                visible: true,
            },
            topBar: {
                animate: true,
                visible: true,
                backButton: {
                    color: theme.sidebarHeaderTextColor,
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
            layout: {
                backgroundColor: theme.centerChannelBg,
            },
            statusBar: {
                visible: true,
            },
            topBar: {
                animate: true,
                visible: true,
                backButton: {
                    color: theme.sidebarHeaderTextColor,
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

    test('peek should call Navigation.push', async () => {
        const push = jest.spyOn(Navigation, 'push');

        const defaultOptions = {
            preview: {
                commit: false,
            },
        };

        const expectedLayout = {
            component: {
                name,
                passProps,
                options: merge(defaultOptions, options),
            },
        };

        await NavigationActions.peek(name, passProps, options);
        expect(push).toHaveBeenCalledWith(topComponentId, expectedLayout);
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
});