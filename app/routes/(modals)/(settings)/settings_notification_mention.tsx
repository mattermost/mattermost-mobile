// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import SettingsNotificationMentionsScreen from '@screens/settings/notification_mention';

type Props = {
    title: string;
}

export default function SettingsNotificationMentionRoute() {
    const theme = useTheme();
    const {title} = usePropsFromParams<Props>();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: title,
            ...getHeaderOptions(theme),
        },
    });

    return (<SettingsNotificationMentionsScreen/>);
}
