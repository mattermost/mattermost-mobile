// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import NavigationHeaderTitle from '@components/navigation_header_title';
import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import PlaybookSelectPlaybooksScreen from '@playbooks/screens/select_playbook';

type Props = {
    channelId?: string;
    subtitle: string;
}

export default function PlaybookSelectPlaybookRoute() {
    const intl = useIntl();
    const theme = useTheme();
    const {subtitle, ...props} = usePropsFromParams<Props>();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: () => {
                return (
                    <NavigationHeaderTitle
                        title={intl.formatMessage({id: 'playbooks.select_playbook.title', defaultMessage: 'New'})}
                        subtitle={subtitle}
                    />
                );
            },
            ...getHeaderOptions(theme),
        },
    });

    return <PlaybookSelectPlaybooksScreen {...props}/>;
}
