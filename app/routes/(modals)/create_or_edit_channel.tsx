// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getModalHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import CreateOrEditChannelScreen, {type CreateOrEditChannelProps} from '@screens/create_or_edit_channel';
import {navigateBack} from '@utils/navigation/adapter';

export default function CreateOrEditChannelRoute() {
    const intl = useIntl();
    const theme = useTheme();
    const props = usePropsFromParams<CreateOrEditChannelProps>();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: intl.formatMessage({id: 'mobile.create_channel.title', defaultMessage: 'New channel'}),
            ...getModalHeaderOptions(theme, navigateBack, 'close.create_or_edit_channel.button'),
        },
    });

    return (<CreateOrEditChannelScreen {...props}/>);
}
