// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from 'react-native';

import {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import {Screens, ServerErrors} from '@constants';
import AttachmentOptions from '@screens/attachment_options';
import {bottomSheet, navigateToScreen} from '@screens/navigation';
import CallbackStore from '@store/callback_store';
import {isErrorWithMessage, isServerError} from '@utils/errors';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {dismissKeyboard} from '@utils/keyboard';

import type {UserProfileProps} from '@screens/user_profile';
import type {GalleryItemType} from '@typings/screens/gallery';
import type {AvailableScreens} from '@typings/screens/navigation';
import type {IntlShape} from 'react-intl';
import type {Asset} from 'react-native-image-picker';

export const appearanceControlledScreens = new Set<AvailableScreens>([
    Screens.ONBOARDING,
    Screens.SERVER,
    Screens.LOGIN,
    Screens.FORGOT_PASSWORD,
    Screens.MFA,
    Screens.SSO,
]);

export function alertTeamRemove(displayName: string, intl: IntlShape) {
    Alert.alert(
        intl.formatMessage({
            id: 'alert.removed_from_team.title',
            defaultMessage: 'Removed from team',
        }),
        intl.formatMessage({
            id: 'alert.removed_from_team.description',
            defaultMessage: 'You have been removed from team {displayName}.',
        }, {displayName}),
        [{
            style: 'cancel',
            text: intl.formatMessage({id: 'mobile.oauth.something_wrong.okButton', defaultMessage: 'OK'}),
        }],
    );
}

export function alertChannelRemove(displayName: string, intl: IntlShape) {
    Alert.alert(
        intl.formatMessage({
            id: 'alert.removed_from_channel.title',
            defaultMessage: 'Removed from channel',
        }),
        intl.formatMessage({
            id: 'alert.removed_from_channel.description',
            defaultMessage: 'You have been removed from channel {displayName}.',
        }, {displayName}),
        [{
            style: 'cancel',
            text: intl.formatMessage({id: 'mobile.oauth.something_wrong.okButton', defaultMessage: 'OK'}),
        }],
    );
}

export function alertChannelArchived(displayName: string, intl: IntlShape) {
    Alert.alert(
        intl.formatMessage({
            id: 'alert.channel_deleted.title',
            defaultMessage: 'Archived channel',
        }),
        intl.formatMessage({
            id: 'alert.channel_deleted.description',
            defaultMessage: 'The channel {displayName} has been archived.',
        }, {displayName}),
        [{
            style: 'cancel',
            text: intl.formatMessage({id: 'mobile.oauth.something_wrong.okButton', defaultMessage: 'OK'}),
        }],
    );
}

export function alertTeamAddError(error: unknown, intl: IntlShape) {
    let errMsg = intl.formatMessage({id: 'join_team.error.message', defaultMessage: 'There has been an error joining the team'});

    if (isServerError(error)) {
        if (error.server_error_id === ServerErrors.TEAM_MEMBERSHIP_DENIAL_ERROR_ID) {
            errMsg = intl.formatMessage({
                id: 'join_team.error.group_error',
                defaultMessage: 'You need to be a member of a linked group to join this team.',
            });
        } else if (isErrorWithMessage(error) && error.message) {
            errMsg = error.message;
        }
    }

    Alert.alert(
        intl.formatMessage({id: 'join_team.error.title', defaultMessage: 'Error joining a team'}),
        errMsg,
    );
}

export function previewPdf(item: FileInfo | GalleryItemType, path: string, theme: Theme, onDismiss?: () => void) {
    CallbackStore.setCallback(onDismiss);
    navigateToScreen(Screens.PDF_VIEWER, {
        title: item.name,
        allowPdfLinkNavigation: false,
        fileId: item.id,
        filePath: path,
    });
}

export async function openUserProfile(props: UserProfileProps) {
    const screen = Screens.USER_PROFILE;

    await dismissKeyboard();
    navigateToScreen(screen, props);
}

export function openAttachmentOptions(
    props: {
        onUploadFiles: (files: Asset[]) => void;
        maxFilesReached: boolean;
        canUploadFiles: boolean;
        testID?: string;
        fileCount?: number;
        maxFileCount?: number;
    }) {

    const TITLE_HEIGHT = 54;
    const renderContent = () => (<AttachmentOptions {...props}/>);
    const componentHeight = TITLE_HEIGHT + bottomSheetSnapPoint(4, ITEM_HEIGHT);
    bottomSheet(renderContent, [1, componentHeight]);
}
