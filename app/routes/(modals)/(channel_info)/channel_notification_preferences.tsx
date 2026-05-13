// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import NavigationHeaderTitle from '@components/navigation_header_title';
import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import ChannelNotificationPreferencesScreen from '@screens/channel_notification_preferences';

type ChannelNotificationPreferencesProps = {
    channelId: string;
    displayName?: string;
}

export default function ChannelNotificationPreferencesRoute() {
    const theme = useTheme();
    const intl = useIntl();
    const {channelId, displayName} = usePropsFromParams<ChannelNotificationPreferencesProps>();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: () => (
                <NavigationHeaderTitle
                    title={intl.formatMessage({id: 'channel_info.mobile_notifications', defaultMessage: 'Mobile Notifications'})}
                    subtitle={displayName}
                />
            ),
            ...getHeaderOptions(theme),
        },
    });

    return <ChannelNotificationPreferencesScreen channelId={channelId}/>;
}
