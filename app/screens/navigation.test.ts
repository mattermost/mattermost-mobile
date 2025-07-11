// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {DeviceEventEmitter, Keyboard, type EmitterSubscription} from 'react-native';
import {Navigation} from 'react-native-navigation';

import {Events, Preferences, Screens} from '@constants';
import NavigationStore from '@store/navigation_store';

import {openAsBottomSheet} from './navigation';

import type {FirstArgument} from '@typings/utils/utils';
import type {IntlShape} from 'react-intl';

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

function expectOpenAsBottomSheetCalledWith(props: FirstArgument<typeof openAsBottomSheet>, isTablet: boolean) {
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
