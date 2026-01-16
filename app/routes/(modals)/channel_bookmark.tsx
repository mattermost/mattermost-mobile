// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getModalHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import ChannelBookmarkScreen, {type ChannelBookmarkScreenProps} from '@screens/channel_bookmark';
import {navigateBack} from '@screens/navigation';

export default function CreateOrEditChannelRoute() {
    const intl = useIntl();
    const theme = useTheme();
    const {title, ...props} = usePropsFromParams<ChannelBookmarkScreenProps & {title?: string}>();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: title ?? intl.formatMessage({id: 'screens.channel_bookmark_add', defaultMessage: 'Add a bookmark'}),
            ...getModalHeaderOptions(theme, navigateBack, 'close.channel_bookmark.button'),
        },
    });

    return (<ChannelBookmarkScreen {...props}/>);
}
