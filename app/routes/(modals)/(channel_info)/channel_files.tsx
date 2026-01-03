// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import NavigationHeaderTitle from '@components/navigation_header_title';
import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import ChannelFilesScreen from '@screens/channel_files';

type ChannelFilesProps = {
    channelId: string;
    displayName?: string;
}

export default function ChannelFilesRoute() {
    const theme = useTheme();
    const intl = useIntl();
    const {channelId, displayName} = usePropsFromParams<ChannelFilesProps>();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: () => (
                <NavigationHeaderTitle
                    title={intl.formatMessage({id: 'channel_info.channel_files', defaultMessage: 'Files'})}
                    subtitle={displayName}
                />
            ),
            ...getHeaderOptions(theme),
        },
    });

    return <ChannelFilesScreen channelId={channelId}/>;
}
