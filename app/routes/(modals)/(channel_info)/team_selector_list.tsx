// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import TeamSelectorScreen from '@screens/convert_gm_to_channel/team_selector_list';

type TeamSelectorProps = {
    teams: Team[];
}

export default function ConvertGMToChannelRoute() {
    const theme = useTheme();
    const intl = useIntl();
    const props = usePropsFromParams<TeamSelectorProps>();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: intl.formatMessage({id: 'channel_info.convert_gm_to_channel.screen_title', defaultMessage: 'Convert to Private Channel'}),
            ...getHeaderOptions(theme),
        },
    });

    return <TeamSelectorScreen {...props}/>;
}
