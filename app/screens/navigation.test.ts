// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {DeviceEventEmitter, Keyboard, type EmitterSubscription} from 'react-native';
import {Navigation} from 'react-native-navigation';

import {Events, Preferences, Screens} from '@constants';
import NavigationStore from '@store/navigation_store';
import {isTablet} from '@utils/helpers';

import {openAsBottomSheet, openAttachmentOptions} from './navigation';

import type {FirstArgument} from '@typings/utils/utils';
import type {IntlShape} from 'react-intl';

jest.mock('@utils/helpers', () => ({
    ...jest.requireActual('@utils/helpers'),
    isTablet: jest.fn(),
}));

jest.mock('@components/compass_icon', () => {
    function CompassIcon() {
        return null;
    }
    CompassIcon.getImageSourceSync = jest.fn().mockReturnValue({});
    return {
        __esModule: true,
        default: CompassIcon,
    };
});

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

function expectOpenAsBottomSheetCalledWith(props: FirstArgument<typeof openAsBottomSheet>, isTabletDevice: boolean) {
    if (isTabletDevice) {
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

describe('openAttachmentOptions', () => {
    const intl = {
        formatMessage: jest.fn(({defaultMessage}) => defaultMessage),
    } as unknown as IntlShape;
    const theme = Preferences.THEMES.denim;
    const mockOnUploadFiles = jest.fn();
    const props = {
        onUploadFiles: mockOnUploadFiles,
        maxFilesReached: false,
        canUploadFiles: true,
        testID: 'test-attachment',
        fileCount: 0,
        maxFileCount: 5,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(isTablet).mockReturnValue(false);
    });

    it('should call openAsBottomSheet with correct parameters on non-tablet', () => {
        openAttachmentOptions(intl, theme, props);

        expectOpenAsBottomSheetCalledWith({
            screen: Screens.ATTACHMENT_OPTIONS,
            title: 'Files and media',
            closeButtonId: 'attachment-close-id',
            theme,
            props,
        }, false);
    });

    it('should call openAsBottomSheet with correct parameters on tablet', () => {
        jest.mocked(isTablet).mockReturnValue(true);

        openAttachmentOptions(intl, theme, props);

        expectOpenAsBottomSheetCalledWith({
            screen: Screens.ATTACHMENT_OPTIONS,
            title: 'Files and media',
            closeButtonId: 'attachment-close-id',
            theme,
            props,
        }, true);
    });

    it('should handle optional props correctly', () => {
        const minimalProps = {
            onUploadFiles: mockOnUploadFiles,
            maxFilesReached: true,
            canUploadFiles: false,
        };

        openAttachmentOptions(intl, theme, minimalProps);

        expectOpenAsBottomSheetCalledWith({
            screen: Screens.ATTACHMENT_OPTIONS,
            title: 'Files and media',
            closeButtonId: 'attachment-close-id',
            theme,
            props: minimalProps,
        }, false);
    });
});
