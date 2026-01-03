// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import CreateOrEditChannelScreen, {type CreateOrEditChannelProps} from '@screens/create_or_edit_channel';

export default function CreateOrEditChannelFromBrowseChannelsRoute() {
    const intl = useIntl();
    const theme = useTheme();
    const {title, ...props} = usePropsFromParams<CreateOrEditChannelProps & {title?: string}>();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: title ?? intl.formatMessage({id: 'mobile.create_channel.title', defaultMessage: 'New channel'}),
            ...getHeaderOptions(theme),
        },
    });

    return (<CreateOrEditChannelScreen {...props}/>);
}
