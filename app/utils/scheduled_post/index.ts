// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {defineMessages, type IntlShape} from 'react-intl';
import {Alert} from 'react-native';

import {deleteScheduledPost} from '@actions/remote/scheduled_post';
import {SNACK_BAR_TYPE} from '@constants/snack_bar';
import DatabaseManager from '@database/manager';
import {getPostById} from '@queries/servers/post';
import {getErrorMessage} from '@utils/errors';
import {showSnackBar} from '@utils/snack_bar';

import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';
import type {ScheduledPostErrorCode} from '@typings/utils/scheduled_post';
import type {SwipeableMethods} from 'react-native-gesture-handler/lib/typescript/components/ReanimatedSwipeable';

export function deleteScheduledPostConfirmation({
    intl,
    serverUrl,
    scheduledPostId,
    swipeable,
}: {
    intl: IntlShape;
    serverUrl: string;
    scheduledPostId: string;
    swipeable?: React.RefObject<SwipeableMethods>;
}) {
    const deleteScheduledPostOnConfirm = async () => {
        const res = await deleteScheduledPost(serverUrl, scheduledPostId);
        if (res?.error) {
            showSnackBar({
                barType: SNACK_BAR_TYPE.DELETE_SCHEDULED_POST_ERROR,
                customMessage: getErrorMessage(res.error),
                type: 'error',
            });
        }
    };

    const onDismiss = () => {
        swipeable?.current?.close();
    };

    Alert.alert(
        intl.formatMessage({
            id: 'schedule_post.options.delete.title',
            defaultMessage: 'Delete scheduled post',
        }),
        intl.formatMessage({
            id: 'scheduled_post.options.delete.confirmation',
            defaultMessage: 'Are you sure you want to delete this scheduled post?',
        }),
        [
            {
                text: intl.formatMessage({
                    id: 'scheduled_post.options.delete.cancel',
                    defaultMessage: 'Cancel',
                }),
                style: 'cancel',
                onPress: onDismiss,
            },
            {
                text: intl.formatMessage({
                    id: 'scheduled_post.options.delete.confirm',
                    defaultMessage: 'Delete',
                }),
                onPress: deleteScheduledPostOnConfirm,
            },
        ],
    );
}

export const hasScheduledPostError = (scheduledPosts: ScheduledPostModel[]) =>
    scheduledPosts.some((post) => post.errorCode !== '');

const errorCodeToErrorMessage = defineMessages<ScheduledPostErrorCode>({
    unknown: {
        id: 'scheduled_post.error_code.unknown_error',
        defaultMessage: 'Unknown Error',
    },
    channel_archived: {
        id: 'scheduled_post.error_code.channel_archived',
        defaultMessage: 'Channel Archived',
    },
    channel_not_found: {
        id: 'scheduled_post.error_code.channel_removed',
        defaultMessage: 'Channel Removed',
    },
    user_missing: {
        id: 'scheduled_post.error_code.user_missing',
        defaultMessage: 'User Deleted',
    },
    user_deleted: {
        id: 'scheduled_post.error_code.user_deleted',
        defaultMessage: 'User Deleted',
    },
    no_channel_permission: {
        id: 'scheduled_post.error_code.no_channel_permission',
        defaultMessage: 'Missing Permission',
    },
    no_channel_member: {
        id: 'scheduled_post.error_code.no_channel_member',
        defaultMessage: 'Not In Channel',
    },
    thread_deleted: {
        id: 'scheduled_post.error_code.thread_deleted',
        defaultMessage: 'Thread Deleted',
    },
    unable_to_send: {
        id: 'scheduled_post.error_code.unable_to_send',
        defaultMessage: 'Unable to Send',
    },
    invalid_post: {
        id: 'scheduled_post.error_code.invalid_post',
        defaultMessage: 'Invalid Post',
    },
    post_send_success_delete_failed: {
        id: 'scheduled_post.error_code.post_send_success_delete_failed',
        defaultMessage: 'Please delete as this was posted',
    },
});

export function getErrorStringFromCode(intl: IntlShape, errorCode: ScheduledPostErrorCode = 'unknown') {
    const textDefinition = errorCodeToErrorMessage[errorCode] ?? errorCodeToErrorMessage.unknown;
    return intl.formatMessage(textDefinition).toUpperCase();
}
export const isScheduledPostModel = (obj: ScheduledPostModel | ScheduledPost): obj is ScheduledPostModel => {
    return 'toApi' in obj && typeof (obj as ScheduledPostModel).toApi === 'function';
};

type CanPostDraftInChannelOrThreadProps = {
    intl: IntlShape;
    serverUrl: string;
    rootId?: string;
    canPost?: boolean;
    channelIsArchived?: boolean;
    channelIsReadOnly?: boolean;
    deactivatedChannel?: boolean;
}

export async function canPostDraftInChannelOrThread({
    serverUrl,
    rootId,
    intl,
    canPost,
    channelIsArchived,
    channelIsReadOnly,
    deactivatedChannel,
}: CanPostDraftInChannelOrThreadProps) {
    if (rootId) {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const rootPost = await getPostById(database, rootId);
        if (!rootPost) {
            Alert.alert(
                intl.formatMessage({id: 'scheduled_post.root_post_not_exist', defaultMessage: 'Sending post failed'}),
                intl.formatMessage({
                    id: 'scheduled_post.root_post_not_exist.message',
                    defaultMessage: 'Someone delete the message on which you tried to post a comment.',
                }),
                [{
                    text: intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'}),
                    style: 'cancel',
                },
                ], {cancelable: false},
            );
            return false;
        }
    }

    if (channelIsArchived) {
        Alert.alert(
            intl.formatMessage({id: 'scheduled_post.channel_archived', defaultMessage: 'Sending post failed'}),
            intl.formatMessage({
                id: 'scheduled_post.channel_archived.message',
                defaultMessage: 'You cannot post to an archived channel.',
            }),
            [{
                text: intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'}),
                style: 'cancel',
            },
            ], {cancelable: false},
        );
        return false;
    }

    if (channelIsReadOnly) {
        Alert.alert(
            intl.formatMessage({id: 'scheduled_post.channel_read_only', defaultMessage: 'Sending post failed'}),
            intl.formatMessage({
                id: 'scheduled_post.channel_read_only.message',
                defaultMessage: 'You cannot post to a read-only channel.',
            }),
            [{
                text: intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'}),
                style: 'cancel',
            },
            ], {cancelable: false},
        );
        return false;
    }

    if (deactivatedChannel) {
        Alert.alert(
            intl.formatMessage({id: 'scheduled_post.channel_deactivated', defaultMessage: 'Sending post failed'}),
            intl.formatMessage({
                id: 'scheduled_post.channel_deactivated.message',
                defaultMessage: 'You cannot post to a deactivated channel.',
            }),
            [{
                text: intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'}),
                style: 'cancel',
            },
            ], {cancelable: false},
        );
        return false;
    }

    if (!canPost) {
        Alert.alert(
            intl.formatMessage({id: 'scheduled_post.no_permission', defaultMessage: 'Sending post failed'}),
            intl.formatMessage({
                id: 'scheduled_post.no_permission.message',
                defaultMessage: 'You do not have permission to post in this channel.',
            }),
            [{
                text: intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'}),
                style: 'cancel',
            },
            ], {cancelable: false},
        );
        return false;
    }

    return true;
}
