// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Platform} from 'react-native';

import OptionItem from '@components/option_item';
import {NotificationLevel, Screens} from '@constants';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {goToScreen} from '@screens/navigation';
import {isTypeDMorGM} from '@utils/channel';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity} from '@utils/theme';

import type {Options} from 'react-native-navigation';

type Props = {
    channelId: string;
    displayName: string;
    notifyLevel: NotificationLevel;
    userNotifyLevel: NotificationLevel;
    channelType: ChannelType;
    hasGMasDMFeature: boolean;
}

const notificationLevel = (notifyLevel: NotificationLevel) => {
    let id = '';
    let defaultMessage = '';
    switch (notifyLevel) {
        case NotificationLevel.ALL: {
            id = t('channel_info.notification.all');
            defaultMessage = 'All';
            break;
        }
        case NotificationLevel.MENTION: {
            id = t('channel_info.notification.mention');
            defaultMessage = 'Mentions';
            break;
        }
        case NotificationLevel.NONE: {
            id = t('channel_info.notification.none');
            defaultMessage = 'Never';
            break;
        }
        default:
            id = t('channel_info.notification.default');
            defaultMessage = 'Default';
            break;
    }

    return {id, defaultMessage};
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
    const theme = useTheme();
    const title = formatMessage({id: 'channel_info.mobile_notifications', defaultMessage: 'Mobile Notifications'});

    const goToChannelNotificationPreferences = preventDoubleTap(() => {
        const options: Options = {
            topBar: {
                title: {
                    text: title,
                },
                subtitle: {
                    color: changeOpacity(theme.sidebarHeaderTextColor, 0.72),
                    text: displayName,
                },
                backButton: {
                    popStackOnPress: false,
                },
            },
        };
        goToScreen(Screens.CHANNEL_NOTIFICATION_PREFERENCES, title, {channelId}, options);
    });

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
