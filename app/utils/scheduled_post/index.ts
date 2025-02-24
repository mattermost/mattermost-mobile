// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {defineMessages, type IntlShape} from 'react-intl';
import {Alert} from 'react-native';

import {deleteScheduledPost} from '@actions/remote/scheduled_post';

import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';
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
        await deleteScheduledPost(serverUrl, scheduledPostId);
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

export const isScheduledPostModel = (obj: any): obj is ScheduledPostModel =>
    obj && typeof obj.toApi === 'function';

export const hasScheduledPostError = (scheduledPosts: ScheduledPostModel[]) =>
    scheduledPosts.some((post) => post.errorCode !== '');

export type ScheduledPostErrorCode = 'unknown' | 'channel_archived' | 'channel_not_found' | 'user_missing' | 'user_deleted' | 'no_channel_permission' | 'no_channel_member' | 'thread_deleted' | 'unable_to_send' | 'invalid_post';

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
});

export function getErrorStringFromCode(intl: IntlShape, errorCode: ScheduledPostErrorCode = 'unknown') {
    const textDefinition = errorCodeToErrorMessage[errorCode] ?? errorCodeToErrorMessage.unknown;
    return intl.formatMessage(textDefinition).toUpperCase();
}
