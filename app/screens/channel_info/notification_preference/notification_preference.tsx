// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {intlShape} from 'react-intl';

import {goToScreen} from '@actions/navigation';
import {ViewTypes} from '@constants';
import {ChannelNotifyProps} from '@mm-redux/types/channels';
import {Theme} from '@mm-redux/types/preferences';
import ChannelInfoRow from '@screens/channel_info/channel_info_row';
import {t} from '@utils/i18n';
import {preventDoubleTap} from '@utils/tap';

interface NotificationPreferenceProps {
    testID?: string;
    channelId: string;
    userId: string;
    notifyProps: ChannelNotifyProps;
    theme: Theme;
}

export default class NotificationPreference extends PureComponent<NotificationPreferenceProps> {
    static contextTypes = {
        intl: intlShape.isRequired,
    };

    goToChannelNotificationPreference = preventDoubleTap(() => {
        const {intl} = this.context;
        const screen = 'ChannelNotificationPreference';
        const title = intl.formatMessage({id: 'channel_header.notificationPreference', defaultMessage: 'Mobile Notifications'});

        goToScreen(screen, title, this.props);
    });

    notificationLevelToText = (notifyLevel: string) => {
        const {intl} = this.context;

        let textId = '';
        let defaultMsg = '';
        switch (notifyLevel) {
        case ViewTypes.NotificationLevels.DEFAULT: {
            textId = t('channel_header.notificationPreference.default');
            defaultMsg = 'Default';
            break;
        }
        case ViewTypes.NotificationLevels.ALL: {
            textId = t('channel_header.notificationPreference.all');
            defaultMsg = 'All';
            break;
        }
        case ViewTypes.NotificationLevels.MENTION: {
            textId = t('channel_header.notificationPreference.mention');
            defaultMsg = 'Mentions';
            break;
        }
        case ViewTypes.NotificationLevels.NONE: {
            textId = t('channel_header.notificationPreference.none');
            defaultMsg = 'Never';
            break;
        }
        }

        return intl.formatMessage({id: textId, defaultMessage: defaultMsg});
    }

    render() {
        const {testID, theme, notifyProps, userId, channelId} = this.props;
        const pushNotifyLevel = notifyProps.push || ViewTypes.NotificationLevels.DEFAULT;

        if (!userId || !channelId) {
            return null;
        }

        return (
            <ChannelInfoRow
                testID={testID}
                action={this.goToChannelNotificationPreference}
                defaultMessage='Mobile Notifications'
                detail={this.notificationLevelToText(pushNotifyLevel)}
                icon='cellphone'
                textId={t('channel_header.notificationPreference')}
                theme={theme}
            />
        );
    }
}
