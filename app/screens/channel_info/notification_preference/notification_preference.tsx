// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {intlShape} from 'react-intl';

import {goToScreen} from '@actions/navigation';
import {ViewTypes} from '@constants';
import {ChannelMembership} from '@mm-redux/types/channels';
import {Theme} from '@mm-redux/types/preferences';
import ChannelInfoRow from '@screens/channel_info/channel_info_row';
import Separator from '@screens/channel_info/separator';
import {t} from '@utils/i18n';
import {preventDoubleTap} from '@utils/tap';

interface NotificationPreferenceProps {
     channelMember: ChannelMembership;
     isLandscape: boolean;
     theme: Theme;
}

export default class NotificationPreference extends PureComponent<NotificationPreferenceProps> {
    static contextTypes = {
        intl: intlShape.isRequired,
    };

    goToChannelNotificationPreference = preventDoubleTap(() => {
        const {intl} = this.context;
        const {channelMember} = this.props;
        const screen = 'ChannelNotificationPreference';
        const title = intl.formatMessage({id: 'channel_header.notificationPreference', defaultMessage: 'Mobile notifications'});

        goToScreen(screen, title, {channelMember});
    });

    notificationLevelToText = (notifyLevel: string) => {
        const {intl} = this.context;

        let textId = '';
        let defaultMsg = '';
        switch (notifyLevel) {
        case ViewTypes.NotificationLevels.DEFAULT: {
            textId = 'channel_header.notificationPreference.default';
            defaultMsg = 'Default';
            break;
        }
        case ViewTypes.NotificationLevels.ALL: {
            textId = 'channel_header.notificationPreference.all';
            defaultMsg = 'All';
            break;
        }
        case ViewTypes.NotificationLevels.MENTION: {
            textId = 'channel_header.notificationPreference.mention';
            defaultMsg = 'Mentions';
            break;
        }
        case ViewTypes.NotificationLevels.NONE: {
            textId = 'channel_header.notificationPreference.none';
            defaultMsg = 'Never';
            break;
        }
        }

        return intl.formatMessage({id: textId, defaultMessage: defaultMsg});
    }

    render() {
        const {isLandscape, theme, channelMember} = this.props;

        const pushNotifyProps = channelMember && channelMember.notify_props;
        const pushNotifyLevel = pushNotifyProps.push || ViewTypes.NotificationLevels.DEFAULT;

        return (
            <>
                <Separator theme={theme}/>
                <ChannelInfoRow
                    action={this.goToChannelNotificationPreference}
                    defaultMessage='Mobile notifications'
                    detail={this.notificationLevelToText(pushNotifyLevel)}
                    icon='mobile-phone'
                    textId={t('channel_header.notificationPreference')}
                    theme={theme}
                    isLandscape={isLandscape}
                />
            </>
        );
    }
}
