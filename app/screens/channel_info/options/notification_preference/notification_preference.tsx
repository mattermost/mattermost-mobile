// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Platform} from 'react-native';

import OptionItem from '@components/option_item';
import {NotificationLevel, Screens} from '@constants';
import {usePreventDoubleTap} from '@hooks/utils';
import {navigateToChannelInfoScreen} from '@screens/navigation';
import {isTypeDMorGM} from '@utils/channel';

type Props = {
    channelId: string;
    displayName: string;
    notifyLevel: NotificationLevel;
    userNotifyLevel: NotificationLevel;
    channelType: ChannelType;
    hasGMasDMFeature: boolean;
}

const messages = defineMessages({
    notificationAll: {
        id: 'channel_info.notification.all',
        defaultMessage: 'All',
    },
    notificationMention: {
        id: 'channel_info.notification.mention',
        defaultMessage: 'Mentions',
    },
    notificationNone: {
        id: 'channel_info.notification.none',
        defaultMessage: 'Never',
    },
    notificationDefault: {
        id: 'channel_info.notification.default',
        defaultMessage: 'Default',
    },
});

const notificationLevel = (notifyLevel: NotificationLevel) => {
    let message;
    switch (notifyLevel) {
        case NotificationLevel.ALL: {
            message = messages.notificationAll;
            break;
        }
        case NotificationLevel.MENTION: {
            message = messages.notificationMention;
            break;
        }
        case NotificationLevel.NONE: {
            message = messages.notificationNone;
            break;
        }
        default:
            message = messages.notificationDefault;
            break;
    }

    return message;
};

const NotificationPreference = ({
    channelId,
    displayName,
    notifyLevel,
    userNotifyLevel,
    channelType,
    hasGMasDMFeature,
}: Props) => {
    const {formatMessage} = useIntl();
    const title = formatMessage({id: 'channel_info.mobile_notifications', defaultMessage: 'Mobile Notifications'});

    const goToChannelNotificationPreferences = usePreventDoubleTap(useCallback(() => {
        navigateToChannelInfoScreen(Screens.CHANNEL_NOTIFICATION_PREFERENCES, {channelId, displayName});
    }, [channelId, displayName]));

    const notificationLevelToText = () => {
        let notifyLevelToUse = notifyLevel;
        if (notifyLevelToUse === NotificationLevel.DEFAULT) {
            notifyLevelToUse = userNotifyLevel;
        }

        if (hasGMasDMFeature) {
            if (notifyLevel === NotificationLevel.DEFAULT && notifyLevelToUse === NotificationLevel.MENTION && isTypeDMorGM(channelType)) {
                notifyLevelToUse = NotificationLevel.ALL;
            }
        }

        const messageDescriptor = notificationLevel(notifyLevelToUse);
        return formatMessage(messageDescriptor);
    };

    return (
        <OptionItem
            action={goToChannelNotificationPreferences}
            label={title}
            icon='cellphone'
            type={Platform.select({ios: 'arrow', default: 'default'})}
            info={notificationLevelToText()}
            testID='channel_info.options.notification_preference.option'
        />
    );
};

export default NotificationPreference;
