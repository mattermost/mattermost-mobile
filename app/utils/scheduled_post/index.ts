// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from 'react-native';

import {deleteScheduledPost} from '@actions/remote/scheduled_post';

import type {IntlShape} from 'react-intl';
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
