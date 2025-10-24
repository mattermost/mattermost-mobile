// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {DeviceEventEmitter, Keyboard, type EmitterSubscription} from 'react-native';
import {Navigation} from 'react-native-navigation';

import {Events, Preferences, Screens} from '@constants';
import NavigationStore from '@store/navigation_store';

jest.unmock('@screens/navigation');

import * as navigationModule from './navigation';
import {dismissAllOverlaysWithExceptions} from './navigation';

import type {FirstArgument} from '@typings/utils/utils';
import type {IntlShape} from 'react-intl';

const {registerNavigationListeners} = navigationModule;

function expectShowModalCalledWith(screen: string, title: string, props?: Record<string, unknown>) {
    expect(Navigation.showModal).toHaveBeenCalledWith({
        stack: {
            children: [{
                component: {
                    id: screen,
                    name: screen,
                    passProps: {
                        ...props,
                        isModal: true,
                    },
                    options: expect.any(Object),
                },
            }],
        },
    });
}

function expectShowModalOverCurrentContext(screen: string, props?: Record<string, unknown>) {
    expectShowModalCalledWith(screen, '', props);
}

function expectOpenAsBottomSheetCalledWith(props: FirstArgument<typeof navigationModule.openAsBottomSheet>, isTablet: boolean) {
    if (isTablet) {
        expectShowModalCalledWith(props.screen, props.title, {closeButtonId: props.closeButtonId, ...props.props});
    } else {
        expectShowModalOverCurrentContext(props.screen, props.props);
    }
}

function expectDismissBottomSheetCalledWith(screenToDismiss: string, listenerCallback: jest.Mock) {
    expect(listenerCallback).toHaveBeenCalled();
    expect(NavigationStore.waitUntilScreensIsRemoved).toHaveBeenCalledWith(screenToDismiss);
}

function expectNotDismissBottomSheetCalledWith(listenerCallback: jest.Mock) {
    expect(listenerCallback).not.toHaveBeenCalled();
    expect(NavigationStore.waitUntilScreensIsRemoved).not.toHaveBeenCalled();
}

describe('openUserProfileModal', () => {
    const intl = {
        formatMessage: jest.fn(({defaultMessage}) => defaultMessage),
    } as unknown as IntlShape;
    const theme = Preferences.THEMES.denim;
    const props = {
        userId: 'user123',
    };

    let eventSubscription: EmitterSubscription;
    const listenerCallback = jest.fn();

    const openUserProfileModal = jest.requireActual('./navigation').openUserProfileModal;

    beforeAll(() => {
        eventSubscription = DeviceEventEmitter.addListener(Events.CLOSE_BOTTOM_SHEET, listenerCallback);
        jest.spyOn(NavigationStore, 'waitUntilScreensIsRemoved').mockImplementation();
    });
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        eventSubscription.remove();
    });

    it('should dismiss the keyboard', () => {
        openUserProfileModal(intl, theme, props);
        expect(Keyboard.dismiss).toHaveBeenCalled();
    });

    it('should dismiss the bottom sheet if screenToDismiss is provided', async () => {
        const screenToDismiss = Screens.BOTTOM_SHEET;
        await openUserProfileModal(intl, theme, props, screenToDismiss);
        expectDismissBottomSheetCalledWith(screenToDismiss, listenerCallback);
        expectOpenAsBottomSheetCalledWith({
            screen: Screens.USER_PROFILE,
            title: 'Profile',
            closeButtonId: 'close-user-profile',
            theme,
            props,
        }, false);
    });

    it('should not call dismiss if no screenToDismiss is provided', async () => {
        await openUserProfileModal(intl, theme, props);
        expectNotDismissBottomSheetCalledWith(listenerCallback);
        expectOpenAsBottomSheetCalledWith({
            screen: Screens.USER_PROFILE,
            title: 'Profile',
            closeButtonId: 'close-user-profile',
            theme,
            props,
        }, false);
    });
});

describe('overlay command listeners', () => {
    let mockCommandListener: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        NavigationStore.reset();

        mockCommandListener = jest.fn();
        const mockEvents = {
            registerScreenPoppedListener: jest.fn(() => ({remove: jest.fn()})),
            registerCommandListener: jest.fn((listener) => {
                mockCommandListener = listener;
                return {remove: jest.fn()};
            }),
            registerComponentWillAppearListener: jest.fn(() => ({remove: jest.fn()})),
        };
        (Navigation.events as jest.Mock).mockReturnValue(mockEvents);

        registerNavigationListeners();
    });

    it('should call NavigationStore.addOverlayToStack when showOverlay command is received', () => {
        const overlayId = 'test-overlay-id';
        const params = {layout: {id: overlayId}};

        expect(NavigationStore.getOverlaysInStack()).toEqual([]);

        mockCommandListener('showOverlay', params);

        expect(NavigationStore.getOverlaysInStack()).toEqual([overlayId]);
    });

    it('should call NavigationStore.removeOverlayFromStack when dismissOverlay command is received', () => {
        const overlayId = 'test-overlay-id';
        NavigationStore.addOverlayToStack(overlayId);
        NavigationStore.addOverlayToStack('another-overlay');

        expect(NavigationStore.getOverlaysInStack()).toEqual(['another-overlay', overlayId]);

        mockCommandListener('dismissOverlay', {componentId: overlayId});

        expect(NavigationStore.getOverlaysInStack()).toEqual(['another-overlay']);
    });

    it('should call NavigationStore.removeAllOverlaysFromStack when dismissAllOverlays command is received', () => {
        NavigationStore.addOverlayToStack('overlay1');
        NavigationStore.addOverlayToStack('floating-banner-overlay');
        NavigationStore.addOverlayToStack('overlay2');

        expect(NavigationStore.getOverlaysInStack()).toEqual(['overlay2', 'floating-banner-overlay', 'overlay1']);

        mockCommandListener('dismissAllOverlays', {});

        expect(NavigationStore.getOverlaysInStack()).toEqual([]);
    });

    it('should not affect NavigationStore when unrecognized commands are received', () => {
        NavigationStore.addOverlayToStack('test-overlay');
        const initialOverlays = NavigationStore.getOverlaysInStack();

        mockCommandListener('someOtherCommand', {});

        expect(NavigationStore.getOverlaysInStack()).toEqual(initialOverlays);
    });
});

describe('showOverlay', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        NavigationStore.reset();
    });

    it('should call Navigation.showOverlay with correct parameters', () => {
        const screenName = Screens.USER_PROFILE;
        const passProps = {userId: 'user123'};
        const options = {overlay: {interceptTouchOutside: true}};
        const id = 'custom-overlay-id';

        navigationModule.showOverlay(screenName, passProps, options, id);

        expect(Navigation.showOverlay).toHaveBeenCalledWith({
            component: {
                id: 'custom-overlay-id',
                name: screenName,
                passProps,
                options: expect.objectContaining({
                    layout: {
                        backgroundColor: 'transparent',
                        componentBackgroundColor: 'transparent',
                    },
                    overlay: {
                        interceptTouchOutside: true,
                    },
                }),
            },
        });
    });

    it('should use default options when none provided', () => {
        const screenName = Screens.USER_PROFILE;

        navigationModule.showOverlay(screenName);

        expect(Navigation.showOverlay).toHaveBeenCalledWith({
            component: {
                id: undefined,
                name: screenName,
                passProps: {},
                options: {
                    layout: {
                        backgroundColor: 'transparent',
                        componentBackgroundColor: 'transparent',
                    },
                    overlay: {
                        interceptTouchOutside: false,
                    },
                },
            },
        });
    });

    it('should merge custom options with default options correctly', () => {
        const screenName = Screens.USER_PROFILE;
        const customOptions = {
            layout: {backgroundColor: 'red'},
            overlay: {interceptTouchOutside: true},
            customProperty: 'test',
        };

        navigationModule.showOverlay(screenName, {}, customOptions);

        expect(Navigation.showOverlay).toHaveBeenCalledWith({
            component: {
                id: undefined,
                name: screenName,
                passProps: {},
                options: expect.objectContaining({
                    layout: {
                        backgroundColor: 'red',
                        componentBackgroundColor: 'transparent',
                    },
                    overlay: {
                        interceptTouchOutside: true,
                    },
                    customProperty: 'test',
                }),
            },
        });
    });
});

describe('dismissOverlay', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        NavigationStore.reset();
    });

    it('should call Navigation.dismissOverlay with correct componentId', async () => {
        const componentId = 'overlay-123';

        await navigationModule.dismissOverlay(componentId);

        expect(Navigation.dismissOverlay).toHaveBeenCalledWith(componentId);
    });

    it('should handle Navigation.dismissOverlay rejection gracefully', async () => {
        const componentId = 'non-existent-overlay';

        (Navigation.dismissOverlay as jest.Mock).mockRejectedValueOnce(new Error('Overlay not found'));

        await expect(navigationModule.dismissOverlay(componentId)).resolves.not.toThrow();

        expect(Navigation.dismissOverlay).toHaveBeenCalledWith(componentId);
    });
});

describe('dismissAllOverlays', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        NavigationStore.reset();
    });

    it('should call Navigation.dismissAllOverlays', async () => {
        NavigationStore.addOverlayToStack('overlay1');
        NavigationStore.addOverlayToStack('floating-banner-overlay');
        NavigationStore.addOverlayToStack('overlay2');

        expect(NavigationStore.getOverlaysInStack()).toEqual(['overlay2', 'floating-banner-overlay', 'overlay1']);

        await navigationModule.dismissAllOverlays();

        expect(Navigation.dismissAllOverlays).toHaveBeenCalledTimes(1);
        expect(Navigation.dismissOverlay).not.toHaveBeenCalled();
    });

    it('should handle empty overlay stack gracefully', async () => {
        expect(NavigationStore.getOverlaysInStack()).toEqual([]);

        await navigationModule.dismissAllOverlays();

        expect(Navigation.dismissAllOverlays).toHaveBeenCalledTimes(1);
    });

    it('should handle only exception overlays in stack', async () => {
        NavigationStore.addOverlayToStack('floating-banner-overlay');

        expect(NavigationStore.getOverlaysInStack()).toEqual(['floating-banner-overlay']);

        await navigationModule.dismissAllOverlays();

        expect(Navigation.dismissAllOverlays).toHaveBeenCalledTimes(1);
    });

    it('should handle Navigation.dismissAllOverlays rejection gracefully', async () => {
        (Navigation.dismissAllOverlays as jest.Mock).mockRejectedValueOnce(new Error('Dismiss failed'));

        NavigationStore.addOverlayToStack('overlay1');
        NavigationStore.addOverlayToStack('overlay2');

        await expect(navigationModule.dismissAllOverlays()).resolves.not.toThrow();

        expect(Navigation.dismissAllOverlays).toHaveBeenCalledTimes(1);
    });

    it('should call Navigation.dismissAllOverlays once regardless of overlay count', async () => {
        NavigationStore.addOverlayToStack('overlay1');
        NavigationStore.addOverlayToStack('overlay2');
        NavigationStore.addOverlayToStack('overlay3');

        await navigationModule.dismissAllOverlays();

        expect(Navigation.dismissAllOverlays).toHaveBeenCalledTimes(1);
        expect(Navigation.dismissOverlay).not.toHaveBeenCalled();
    });
});

describe('dismissAllModalsAndPopToRoot', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        NavigationStore.reset();
    });

    it('should call dismissAllModals, dismissAllOverlaysWithExceptions, and popToRoot in sequence', async () => {
        NavigationStore.addModalToStack('AppForm');
        NavigationStore.addScreenToStack('Home');

        await navigationModule.dismissAllModalsAndPopToRoot();

        expect(Navigation.dismissModal).toHaveBeenCalledTimes(1);
        expect(Navigation.dismissModal).toHaveBeenCalledWith('AppForm', {animations: {dismissModal: {enabled: false}}});
        expect(Navigation.popToRoot).toHaveBeenCalledTimes(1);
        expect(Navigation.popToRoot).toHaveBeenCalledWith('Home');
    });

    it('should dismiss non-exception overlays via dismissAllOverlaysWithExceptions', async () => {
        NavigationStore.addOverlayToStack('overlay1');
        NavigationStore.addOverlayToStack('floating-banner-overlay');
        NavigationStore.addOverlayToStack('overlay2');

        expect(NavigationStore.getOverlaysInStack()).toEqual(['overlay2', 'floating-banner-overlay', 'overlay1']);

        await navigationModule.dismissAllModalsAndPopToRoot();

        expect(Navigation.dismissOverlay).toHaveBeenCalledTimes(2);
        expect(Navigation.dismissOverlay).toHaveBeenCalledWith('overlay2');
        expect(Navigation.dismissOverlay).toHaveBeenCalledWith('overlay1');
        expect(Navigation.dismissOverlay).not.toHaveBeenCalledWith('floating-banner-overlay');
    });

    it('should handle empty overlay stack gracefully', async () => {
        expect(NavigationStore.getOverlaysInStack()).toEqual([]);
        NavigationStore.addScreenToStack('Home');

        await navigationModule.dismissAllModalsAndPopToRoot();

        expect(Navigation.dismissModal).not.toHaveBeenCalled();
        expect(Navigation.dismissOverlay).not.toHaveBeenCalled();
        expect(Navigation.popToRoot).toHaveBeenCalledTimes(1);
        expect(Navigation.popToRoot).toHaveBeenCalledWith('Home');
    });

    it('should continue with popToRoot even if overlay dismissal fails', async () => {
        (Navigation.dismissOverlay as jest.Mock).mockRejectedValueOnce(new Error('Dismiss failed'));

        NavigationStore.addOverlayToStack('overlay1');
        NavigationStore.addScreenToStack('Home');

        await expect(navigationModule.dismissAllModalsAndPopToRoot()).resolves.not.toThrow();

        expect(Navigation.dismissModal).not.toHaveBeenCalled();
        expect(Navigation.dismissOverlay).toHaveBeenCalledWith('overlay1');
        expect(Navigation.popToRoot).toHaveBeenCalledTimes(1);
        expect(Navigation.popToRoot).toHaveBeenCalledWith('Home');
    });
});

describe('dismissAllOverlaysWithExceptions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        NavigationStore.reset();
    });

    it('should dismiss non-exception overlays individually', async () => {
        NavigationStore.addOverlayToStack('overlay1');
        NavigationStore.addOverlayToStack('floating-banner-overlay');
        NavigationStore.addOverlayToStack('overlay2');

        expect(NavigationStore.getOverlaysInStack()).toEqual(['overlay2', 'floating-banner-overlay', 'overlay1']);

        await dismissAllOverlaysWithExceptions();

        expect(Navigation.dismissOverlay).toHaveBeenCalledTimes(2);
        expect(Navigation.dismissOverlay).toHaveBeenCalledWith('overlay2');
        expect(Navigation.dismissOverlay).toHaveBeenCalledWith('overlay1');
        expect(Navigation.dismissOverlay).not.toHaveBeenCalledWith('floating-banner-overlay');
    });

    it('should handle empty overlay stack gracefully', async () => {
        expect(NavigationStore.getOverlaysInStack()).toEqual([]);

        await dismissAllOverlaysWithExceptions();

        expect(Navigation.dismissOverlay).not.toHaveBeenCalled();
    });

    it('should handle only exception overlays in stack', async () => {
        NavigationStore.addOverlayToStack('floating-banner-overlay');

        expect(NavigationStore.getOverlaysInStack()).toEqual(['floating-banner-overlay']);

        await dismissAllOverlaysWithExceptions();

        expect(Navigation.dismissOverlay).not.toHaveBeenCalled();
    });

    it('should use Promise.all for concurrent dismissals', async () => {
        const dismissalOrder: string[] = [];
        (Navigation.dismissOverlay as jest.Mock).mockImplementation((overlayId: string) => {
            dismissalOrder.push(overlayId);
            return Promise.resolve();
        });

        NavigationStore.addOverlayToStack('overlay1');
        NavigationStore.addOverlayToStack('overlay2');
        NavigationStore.addOverlayToStack('overlay3');

        await dismissAllOverlaysWithExceptions();

        expect(Navigation.dismissOverlay).toHaveBeenCalledTimes(3);
        expect(dismissalOrder).toContain('overlay1');
        expect(dismissalOrder).toContain('overlay2');
        expect(dismissalOrder).toContain('overlay3');
    });

    it('should continue dismissing even if one overlay dismissal fails', async () => {
        (Navigation.dismissOverlay as jest.Mock).
            mockImplementationOnce(() => Promise.reject(new Error('Dismiss failed'))).
            mockImplementationOnce(() => Promise.resolve());

        NavigationStore.addOverlayToStack('overlay1');
        NavigationStore.addOverlayToStack('overlay2');

        await expect(dismissAllOverlaysWithExceptions()).resolves.not.toThrow();

        expect(Navigation.dismissOverlay).toHaveBeenCalledTimes(2);
        expect(Navigation.dismissOverlay).toHaveBeenCalledWith('overlay2');
        expect(Navigation.dismissOverlay).toHaveBeenCalledWith('overlay1');
    });
});
