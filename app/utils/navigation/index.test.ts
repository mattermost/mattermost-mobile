// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {router} from 'expo-router';
import {createIntl} from 'react-intl';
import {Alert} from 'react-native';

import {ServerErrors} from '@constants';
import {DEFAULT_LOCALE, getTranslations} from '@i18n';
import CallbackStore from '@store/callback_store';
import {dismissKeyboard} from '@utils/keyboard';

import {alertTeamRemove, alertChannelRemove, alertChannelArchived, alertTeamAddError, previewPdf, openUserProfile} from './index';

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

jest.mock('@utils/keyboard', () => ({
    dismissKeyboard: jest.fn().mockResolvedValue(undefined),
}));

describe('Navigation utils', () => {
    const displayName = 'Test Display Name';
    const serverError = {server_error_id: ServerErrors.TEAM_MEMBERSHIP_DENIAL_ERROR_ID};
    const genericServerError = {server_error_id: 'api.some_server_error.id', message: 'Generic error message'};
    const intl = createIntl({locale: DEFAULT_LOCALE, messages: getTranslations(DEFAULT_LOCALE)});

    describe('Alert functions', () => {
        afterEach(() => {
            jest.clearAllMocks();
        });

        it('should display alert when a user is removed from a team', () => {
            alertTeamRemove(displayName, intl);
            expect(Alert.alert).toHaveBeenCalledWith(
                'Removed from team',
                'You have been removed from team Test Display Name.',
                [{style: 'cancel', text: 'OK'}],
            );
        });

        it('should display alert when a user is removed from a channel', () => {
            alertChannelRemove(displayName, intl);
            expect(Alert.alert).toHaveBeenCalledWith(
                'Removed from channel',
                'You have been removed from channel Test Display Name.',
                [{style: 'cancel', text: 'OK'}],
            );
        });

        it('should display alert when a channel is archived', () => {
            alertChannelArchived(displayName, intl);
            expect(Alert.alert).toHaveBeenCalledWith(
                'Archived channel',
                'The channel Test Display Name has been archived.',
                [{style: 'cancel', text: 'OK'}],
            );
        });

        it('should display alert for team add error with default message', () => {
            alertTeamAddError({}, intl);
            expect(Alert.alert).toHaveBeenCalledWith(
                'Error joining a team',
                'There has been an error joining the team',
            );
        });

        it('should display alert for team add error with specific server error message', () => {
            alertTeamAddError(serverError, intl);
            expect(Alert.alert).toHaveBeenCalledWith(
                'Error joining a team',
                'You need to be a member of a linked group to join this team.',
            );
        });

        it('should display alert for team add error with generic error message', () => {
            alertTeamAddError(genericServerError, intl);
            expect(Alert.alert).toHaveBeenCalledWith(
                'Error joining a team',
                'Generic error message',
            );
        });
    });

    describe('previewPdf', () => {
        it('should set callback and navigate to PDF viewer with file info', () => {
            const onDismiss = jest.fn();
            const item = {
                id: 'file123',
                name: 'document.pdf',
            } as FileInfo;
            const path = '/path/to/document.pdf';
            const theme = {centerChannelBg: '#fff'} as Theme;

            previewPdf(item, path, theme, onDismiss);

            expect(CallbackStore.getCallback()).toBe(onDismiss);
            expect(router.push).toHaveBeenCalledWith({
                pathname: '/(modals)/pdf_viewer',
                params: {
                    title: 'document.pdf',
                    allowPdfLinkNavigation: 'false',
                    fileId: 'file123',
                    filePath: '/path/to/document.pdf',
                },
            });
        });

        it('should navigate without onDismiss callback', () => {
            const item = {
                id: 'file456',
                name: 'report.pdf',
            } as FileInfo;
            const path = '/path/to/report.pdf';
            const theme = {centerChannelBg: '#fff'} as Theme;

            previewPdf(item, path, theme);

            expect(CallbackStore.getCallback()).toBeUndefined();
            expect(router.push).toHaveBeenCalledWith({
                pathname: '/(modals)/pdf_viewer',
                params: {
                    title: 'report.pdf',
                    allowPdfLinkNavigation: 'false',
                    fileId: 'file456',
                    filePath: '/path/to/report.pdf',
                },
            });
        });

        it('should work with GalleryItemType', () => {
            const item = {
                id: 'gallery123',
                name: 'image.pdf',
            } as any;
            const path = '/gallery/image.pdf';
            const theme = {centerChannelBg: '#fff'} as Theme;

            previewPdf(item, path, theme);

            expect(router.push).toHaveBeenCalledWith({
                pathname: '/(modals)/pdf_viewer',
                params: {
                    title: 'image.pdf',
                    allowPdfLinkNavigation: 'false',
                    fileId: 'gallery123',
                    filePath: '/gallery/image.pdf',
                },
            });
        });
    });

    describe('openUserProfile', () => {
        it('should dismiss keyboard when visible and navigate to user profile', async () => {
            const props = {userId: 'user123', username: 'johndoe'};
            await openUserProfile(props);

            expect(dismissKeyboard).toHaveBeenCalled();
            expect(router.push).toHaveBeenCalledWith({
                pathname: '/(bottom_sheet)/user_profile',
                params: {userId: 'user123', username: 'johndoe'},
            });
        });
    });
});
