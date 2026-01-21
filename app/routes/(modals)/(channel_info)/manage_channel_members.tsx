// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import NavigationHeaderTitle from '@components/navigation_header_title';
import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import ManageChannelMembersScreen from '@screens/manage_channel_members';

type ManageChannelMembersProps = {
    channelId: string;
    displayName?: string;
}

export default function ManageChannelMembersRoute() {
    const theme = useTheme();
    const intl = useIntl();
    const {channelId, displayName} = usePropsFromParams<ManageChannelMembersProps>();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: () => (
                <NavigationHeaderTitle
                    title={intl.formatMessage({id: 'channel_info.members', defaultMessage: 'Members'})}
                    subtitle={displayName}
                />
            ),
            ...getHeaderOptions(theme),
        },
    });

    return <ManageChannelMembersScreen channelId={channelId}/>;
}
