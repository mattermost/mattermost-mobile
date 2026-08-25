// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import {useIntl} from 'react-intl';

import NavigationHeaderTitle from '@components/navigation_header_title';
import {useTheme} from '@context/theme';
import {getHeaderOptions, getModalHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import ChannelAddMembersScreen from '@screens/channel_add_members';

type ChannelAddMembersRouteProps = {
    inModal?: boolean;
    channelId: string;
    displayName?: string;
}

export default function ChannelAddMembersRoute() {
    const navigation = useNavigation();
    const theme = useTheme();
    const intl = useIntl();
    const {inModal, channelId, displayName} = usePropsFromParams<ChannelAddMembersRouteProps>();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: () => (
                <NavigationHeaderTitle
                    title={intl.formatMessage({id: 'intro.add_members', defaultMessage: 'Add members'})}
                    subtitle={displayName}
                />
            ),
            ...(inModal ? getHeaderOptions(theme) : getModalHeaderOptions(theme, navigation.goBack, 'close.channel_add_members.button')),
        },
    });

    return <ChannelAddMembersScreen channelId={channelId}/>;
}
