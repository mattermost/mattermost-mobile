// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {getModalHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import EditServerScreen, {type EditServerProps} from '@screens/edit_server';
import {navigateBack} from '@utils/navigation/adapter';

export default function EditServerRoute() {
    const intl = useIntl();
    const theme = useTheme();
    const isTablet = useIsTablet();
    const props = usePropsFromParams<EditServerProps>();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: isTablet ? intl.formatMessage({id: 'edit_server.title', defaultMessage: 'Edit Server'}) : '',
            ...getModalHeaderOptions(theme, navigateBack, 'close.edit_server.button'),
            headerTransparent: !isTablet,
            headerStyle: {
                backgroundColor: isTablet ? theme.sidebarBg : 'transparent',
            },
        },
    });

    return (<EditServerScreen {...props}/>);
}
