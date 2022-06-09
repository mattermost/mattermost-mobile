// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Platform} from 'react-native';

import {t} from '@app/i18n';
import {goToScreen} from '@app/screens/navigation';
import OptionItem from '@components/option_item';
import {NotificationLevel, Screens} from '@constants';
import {preventDoubleTap} from '@utils/tap';

type Props = {
    channelId: string;
    notifyLevel: NotificationLevel;
}

const NotificationPreference = ({channelId, notifyLevel}: Props) => {
    const {formatMessage} = useIntl();
    const title = formatMessage({id: 'channel_info.mobile_notifications', defaultMessage: 'Mobile Notifications'});

    const goToMentions = preventDoubleTap(() => {
        goToScreen(Screens.CHANNEL_MENTION, title, {channelId});
    });

    const notificationLevelToText = () => {
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

        return formatMessage({id, defaultMessage});
    };

    return (
        <OptionItem
            action={goToMentions}
            label={title}
            icon='cellphone'
            type={Platform.select({ios: 'arrow', default: 'default'})}
            info={notificationLevelToText()}
        />
    );
};

export default NotificationPreference;
