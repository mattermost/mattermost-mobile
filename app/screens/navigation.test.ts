// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {router} from 'expo-router';
import {DeviceEventEmitter} from 'react-native';

import {Events, Screens} from '@constants';
import BottomSheetStore from '@store/bottom_sheet_store';
import CallbackStore from '@store/callback_store';
import {NavigationStore} from '@store/navigation_store';
import {logError} from '@utils/log';

import {
    bottomSheet,
    dismissAllRoutesAndPopToScreen,
    dismissAllRoutesAndResetToRootRoute,
    dismissBottomSheet,
    dismissToStackRoot,
    navigateBack,
    navigateToChannelInfoScreen,
    navigateToScreen,
    navigateToScreenWithBaseRoute,
    navigateToSettingsScreen,
    propsToParams,
    resetToRootRoute,
    updateParams,
} from './navigation';

jest.mock('@utils/log');

// Mock router functions to return immediately resolved promises
jest.mock('expo-router', () => ({
    router: {
        push: jest.fn(),
        replace: jest.fn(),
        back: jest.fn(),
        canGoBack: jest.fn(() => true),
        canDismiss: jest.fn(() => true),
        dismiss: jest.fn(),
        dismissAll: jest.fn(),
        dismissTo: jest.fn(),
        setParams: jest.fn(),
        navigate: jest.fn(),
    },
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        back: jest.fn(),
        canGoBack: jest.fn(() => true),
        navigate: jest.fn(),
    }),
}));

describe('navigation', () => {
// Reset all mocks before each test
    beforeEach(() => {
        jest.clearAllMocks();

        // Reset stores to clean state
        BottomSheetStore.reset();
        CallbackStore.removeCallback();
    });

    describe('propsToParams', () => {
        it('should convert string props to params unchanged', () => {
            const props = {name: 'test', id: '123'};
            const result = propsToParams(props);

            expect(result).toEqual({name: 'test', id: '123'});
        });

        it('should convert non-string props to JSON strings', () => {
            const props = {
                count: 42,
                active: true,
                data: {key: 'value'},
                items: ['a', 'b'],
            };
            const result = propsToParams(props);

            expect(result).toEqual({
                count: '42',
                active: 'true',
                data: '{"key":"value"}',
                items: '["a","b"]',
            });
        });

        it('should handle empty props', () => {
            const result = propsToParams({});
            expect(result).toEqual({});
        });

        it('should handle null/undefined props', () => {
            const result = propsToParams(null);
            expect(result).toEqual({});
        });

        it('should handle mixed types', () => {
            const props = {
                string: 'value',
                number: 123,
                boolean: false,
                object: {nested: true},
            };
            const result = propsToParams(props);

            expect(result).toEqual({
                string: 'value',
                number: '123',
                boolean: 'false',
                object: '{"nested":true}',
            });
        });
    });

    describe('updateParams', () => {
        it('should call router.setParams with converted params', () => {
            const props = {theme: 'dark', userId: '123'};
            updateParams(props);

            expect(router.setParams).toHaveBeenCalledWith({
                theme: 'dark',
                userId: '123',
            });
        });

        it('should handle complex props', () => {
            const props = {count: 5, active: true};
            updateParams(props);

            expect(router.setParams).toHaveBeenCalledWith({
                count: '5',
                active: 'true',
            });
        });

        it('should handle empty props', () => {
            updateParams({});
            expect(router.setParams).toHaveBeenCalledWith({});
        });
    });

    describe('navigateToScreen', () => {
        it('should navigate to unauthenticated screen', () => {
            navigateToScreen(Screens.LOGIN, {serverUrl: 'https://example.com'});

            expect(router.push).toHaveBeenCalledWith({
                pathname: '/(unauthenticated)/login',
                params: {serverUrl: 'https://example.com'},
            });
        });

        it('should navigate to unauthenticated screen as modal when isModal prop is true', () => {
            navigateToScreen(Screens.LOGIN, {isModal: true, serverUrl: 'https://example.com'});

            expect(router.push).toHaveBeenCalledWith({
                pathname: '/(modals)/(add-server)/login',
                params: {isModal: 'true', serverUrl: 'https://example.com'},
            });
        });

        it('should navigate to home tab screen', () => {
            navigateToScreen(Screens.CHANNEL_LIST);

            expect(router.push).toHaveBeenCalledWith({
                pathname: '/(authenticated)/(home)/channel_list',
                params: {},
            });
        });

        it('should navigate to bottom sheet screen', () => {
            navigateToScreen(Screens.GENERIC_BOTTOM_SHEET, {content: 'test'});

            expect(router.push).toHaveBeenCalledWith({
                pathname: '/(bottom_sheet)/generic_bottom_sheet',
                params: {content: 'test'},
            });
        });

        it('should navigate to modal screen', () => {
            navigateToScreen(Screens.SETTINGS, {section: 'display'});

            expect(router.push).toHaveBeenCalledWith({
                pathname: '/(modals)/(settings)',
                params: {section: 'display'},
            });
        });

        it('should navigate to authenticated screen by default', () => {
            navigateToScreen(Screens.CHANNEL, {channelId: 'abc123'});

            expect(router.push).toHaveBeenCalledWith({
                pathname: '/(authenticated)/channel',
                params: {channelId: 'abc123'},
            });
        });

        it('should use router.replace when reset is true', () => {
            navigateToScreen(Screens.LOGIN, {serverUrl: 'https://example.com'}, true);

            expect(router.replace).toHaveBeenCalledWith({
                pathname: '/(unauthenticated)/login',
                params: {serverUrl: 'https://example.com'},
            });
            expect(router.push).not.toHaveBeenCalled();
        });

        it('should handle navigation without props', () => {
            navigateToScreen(Screens.CHANNEL_LIST);

            expect(router.push).toHaveBeenCalledWith({
                pathname: '/(authenticated)/(home)/channel_list',
                params: {},
            });
        });

        it('should log error if navigation fails', () => {
            jest.mocked(router.push).mockImplementationOnce(() => {
                throw new Error('Navigation failed');
            });

            navigateToScreen(Screens.CHANNEL_LIST);

            expect(logError).toHaveBeenCalledWith(
                'navigateToScreen: Expo Router navigation failed',
                expect.any(Error),
            );
        });
    });

    describe('navigateToScreenWithBaseRoute', () => {
        it('should navigate with base route and screen', () => {
            navigateToScreenWithBaseRoute('/base', Screens.ACCOUNT, {section: 'profile'});

            expect(router.push).toHaveBeenCalledWith({
                pathname: '/base/account',
                params: {section: 'profile'},
            });
        });

        it('should use router.replace when reset is true', () => {
            navigateToScreenWithBaseRoute('/base', Screens.ACCOUNT, {section: 'profile'}, true);

            expect(router.replace).toHaveBeenCalledWith({
                pathname: '/base/account',
                params: {section: 'profile'},
            });
            expect(router.push).not.toHaveBeenCalled();
        });

        it('should handle navigation without props', () => {
            navigateToScreenWithBaseRoute('/base', Screens.ACCOUNT);

            expect(router.push).toHaveBeenCalledWith({
                pathname: '/base/account',
                params: {},
            });
        });

        it('should log error if navigation fails', () => {
            jest.mocked(router.push).mockImplementationOnce(() => {
                throw new Error('Navigation failed');
            });

            navigateToScreenWithBaseRoute('/base', Screens.ACCOUNT);

            expect(logError).toHaveBeenCalledWith(
                'navigateToScreenWithBaseRoute: Expo Router navigation failed',
                expect.any(Error),
            );
        });
    });

    describe('navigateBack', () => {
        it('should navigate back when router can go back', async () => {
            jest.mocked(router.canGoBack).mockReturnValue(true);

            await navigateBack();

            expect(router.canGoBack).toHaveBeenCalled();
            expect(router.back).toHaveBeenCalled();
        });

        it('should not navigate back when router cannot go back', async () => {
            jest.mocked(router.canGoBack).mockReturnValue(false);

            await navigateBack();
            expect(router.canGoBack).toHaveBeenCalled();
            expect(router.back).not.toHaveBeenCalled();
        });
    });

    describe('dismissToStackRoot', () => {
        it('should dismiss all when router can dismiss', async () => {
            jest.mocked(router.canDismiss).mockReturnValue(true);

            await dismissToStackRoot();

            expect(router.canDismiss).toHaveBeenCalled();
            expect(router.dismissAll).toHaveBeenCalled();
        });

        it('should not dismiss when router cannot dismiss', async () => {
            jest.mocked(router.canDismiss).mockReturnValue(false);

            await dismissToStackRoot();

            expect(router.canDismiss).toHaveBeenCalled();
            expect(router.dismissAll).not.toHaveBeenCalled();
        });
    });

    describe('bottomSheet', () => {
        it('should configure bottom sheet store and navigate', () => {
            const renderContent = jest.fn();
            const snapPoints = ['50%', '90%'];
            const footerComponent = jest.fn();

            bottomSheet(renderContent, snapPoints, footerComponent);

            expect(BottomSheetStore.getSnapPoints()).toEqual(snapPoints);
            expect(BottomSheetStore.getRenderContentCallback()).toBe(renderContent);
            expect(BottomSheetStore.getFooterComponent()).toBe(footerComponent);
            expect(router.push).toHaveBeenCalledWith({
                pathname: '/(bottom_sheet)/generic_bottom_sheet',
                params: {},
            });
        });

        it('should configure bottom sheet without footer component', () => {
            const renderContent = jest.fn();
            const snapPoints = ['50%'];

            bottomSheet(renderContent, snapPoints);

            expect(BottomSheetStore.getSnapPoints()).toEqual(snapPoints);
            expect(BottomSheetStore.getRenderContentCallback()).toBe(renderContent);
            expect(BottomSheetStore.getFooterComponent()).toBeUndefined();
        });
    });

    describe('dismissBottomSheet', () => {
        it('should emit close event, wait for removal, reset store, and wait', async () => {
            const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');
            const waitSpy = jest.spyOn(NavigationStore, 'waitUntilScreensIsRemoved').mockResolvedValue();
            jest.spyOn(NavigationStore, 'isScreenInStack').mockReturnValue(true);

            await dismissBottomSheet();

            expect(emitSpy).toHaveBeenCalledWith(Events.CLOSE_BOTTOM_SHEET);
            expect(waitSpy).toHaveBeenCalledWith(Screens.BOTTOM_SHEET);
            expect(BottomSheetStore.getRenderContentCallback()).toBeUndefined();
            expect(BottomSheetStore.getFooterComponent()).toBeUndefined();
            expect(BottomSheetStore.getSnapPoints()).toBeUndefined();
        });

        it('should return early if bottom sheet is not in stack', async () => {
            const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');
            jest.spyOn(NavigationStore, 'isScreenInStack').mockReturnValue(false);

            await dismissBottomSheet();

            expect(NavigationStore.isScreenInStack).toHaveBeenCalledWith(Screens.BOTTOM_SHEET);
            expect(emitSpy).not.toHaveBeenCalled();
        });
    });

    describe('resetToRootRoute', () => {
        it('should reset to root route with pathname and params', async () => {
            const rootRouteInfo = {
                pathname: '/(authenticated)/(home)/channel_list',
                params: {teamId: 'team123'},
            };
            jest.spyOn(NavigationStore, 'getRootRouteInfo').mockReturnValue(rootRouteInfo);

            await resetToRootRoute();

            expect(router.replace).toHaveBeenCalledWith({
                pathname: '/(authenticated)/(home)/channel_list',
                params: {teamId: 'team123'},
            });
        });

        it('should handle missing root route info', async () => {
            jest.spyOn(NavigationStore, 'getRootRouteInfo').mockReturnValue(undefined);

            await resetToRootRoute();

            expect(router.replace).not.toHaveBeenCalled();
        });
    });

    describe('dismissAllRoutesAndResetToRootRoute', () => {
        it('should dismiss to stack root and then reset to root route', async () => {
            jest.mocked(router.canDismiss).mockReturnValue(true);
            jest.spyOn(NavigationStore, 'getRootRouteInfo').mockReturnValue({
                pathname: '/(authenticated)/(home)/channel_list',
                params: {},
            });

            await dismissAllRoutesAndResetToRootRoute();
            expect(router.dismissAll).toHaveBeenCalled();
            expect(router.replace).toHaveBeenCalled();
        });
    });

    describe('dismissAllRoutesAndPopToScreen', () => {
        it('should navigate to screen when it is in stack', async () => {
            jest.spyOn(NavigationStore, 'isScreenInStack').mockReturnValue(true);

            await dismissAllRoutesAndPopToScreen(Screens.CHANNEL, {channelId: 'abc'});

            expect(router.dismissTo).toHaveBeenCalledWith(Screens.CHANNEL);
            expect(router.setParams).toHaveBeenCalledWith({channelId: 'abc'});
        });

        it('should reset and push when screen is not in stack', async () => {
            jest.spyOn(NavigationStore, 'isScreenInStack').mockReturnValue(false);
            jest.spyOn(NavigationStore, 'getRootRouteInfo').mockReturnValue({
                pathname: '/(authenticated)/(home)/channel_list',
                params: {},
            });
            jest.mocked(router.canDismiss).mockReturnValue(true);

            await dismissAllRoutesAndPopToScreen(Screens.CHANNEL, {channelId: 'abc'});

            expect(router.dismissAll).toHaveBeenCalled();
            expect(router.replace).toHaveBeenCalled();
            expect(router.push).toHaveBeenCalledWith({
                pathname: '/(authenticated)/channel',
                params: {channelId: 'abc'},
            });
        });

        it('should navigate when router is available but screen not in stack', async () => {
            jest.spyOn(NavigationStore, 'isScreenInStack').mockReturnValue(false);
            jest.spyOn(NavigationStore, 'getRootRouteInfo').mockReturnValue({
                pathname: '/(authenticated)/(home)/channel_list',
                params: {},
            });
            jest.mocked(router.canDismiss).mockReturnValue(true);

            await dismissAllRoutesAndPopToScreen(Screens.MENTIONS);

            expect(router.dismissAll).toHaveBeenCalled();
            expect(router.push).toHaveBeenCalled();
        });

        it('should log error if navigation fails', async () => {
            jest.spyOn(NavigationStore, 'isScreenInStack').mockReturnValue(true);
            jest.mocked(router.dismissTo).mockImplementationOnce(() => {
                throw new Error('Navigation failed');
            });

            await dismissAllRoutesAndPopToScreen(Screens.CHANNEL);

            expect(logError).toHaveBeenCalledWith(
                'dismissAllRoutesAndPopToScreen: Expo Router navigation failed',
                expect.any(Error),
            );
        });
    });

    describe('navigateToSettingsScreen', () => {
        it('should navigate to settings screen with base route', () => {
            navigateToSettingsScreen(Screens.SETTINGS_DISPLAY, {theme: 'dark'});

            expect(router.push).toHaveBeenCalledWith({
                pathname: '/(modals)/(settings)/settings_display',
                params: {theme: 'dark'},
            });
        });

        it('should navigate without props', () => {
            navigateToSettingsScreen(Screens.SETTINGS_DISPLAY);

            expect(router.push).toHaveBeenCalledWith({
                pathname: '/(modals)/(settings)/settings_display',
                params: {},
            });
        });
    });

    describe('navigateToChannelInfoScreen', () => {
        it('should navigate to channel info screen with base route', () => {
            navigateToChannelInfoScreen(Screens.CHANNEL_NOTIFICATION_PREFERENCES, {channelId: 'ch123'});

            expect(router.push).toHaveBeenCalledWith({
                pathname: '/(modals)/(channel_info)/channel_notification_preferences',
                params: {channelId: 'ch123'},
            });
        });

        it('should navigate without props', () => {
            navigateToChannelInfoScreen(Screens.CHANNEL_NOTIFICATION_PREFERENCES);

            expect(router.push).toHaveBeenCalledWith({
                pathname: '/(modals)/(channel_info)/channel_notification_preferences',
                params: {},
            });
        });
    });
});
