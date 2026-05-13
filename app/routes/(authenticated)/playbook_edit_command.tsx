// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import NavigationHeaderTitle from '@components/navigation_header_title';
import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import PlaybookEditCommandScreen from '@playbooks/screens/edit_command';

type Props = {
    channelId: string;
    savedCommand?: string;
    subtitle: string;
}

export default function PlaybooksEditCommandRoute() {
    const intl = useIntl();
    const theme = useTheme();
    const {subtitle, ...props} = usePropsFromParams<Props>();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: () => {
                return (
                    <NavigationHeaderTitle
                        title={intl.formatMessage({id: 'playbooks.edit_command.title', defaultMessage: 'Slash command'})}
                        subtitle={subtitle}
                    />
                );
            },
            ...getHeaderOptions(theme),
        },
    });

    return <PlaybookEditCommandScreen {...props}/>;
}
