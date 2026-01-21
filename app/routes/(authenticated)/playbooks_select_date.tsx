// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import NavigationHeaderTitle from '@components/navigation_header_title';
import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import PlaybooksSelectDateScreen from '@playbooks/screens/select_date';

type Props = {
    selectedDate?: number;
    subtitle: string;
}

export default function PlaybooksSelectDateRoute() {
    const intl = useIntl();
    const theme = useTheme();
    const {subtitle, ...props} = usePropsFromParams<Props>();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: () => {
                return (
                    <NavigationHeaderTitle
                        title={intl.formatMessage({id: 'playbooks.select_date.title', defaultMessage: 'Due date'})}
                        subtitle={subtitle}
                    />
                );
            },
            ...getHeaderOptions(theme),
        },
    });

    return <PlaybooksSelectDateScreen {...props}/>;
}
