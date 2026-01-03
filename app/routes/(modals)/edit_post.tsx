// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getModalHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import EditPostScreen, {type EditPostProps} from '@screens/edit_post';
import {navigateBack} from '@screens/navigation';

export default function EditPostRoute() {
    const intl = useIntl();
    const theme = useTheme();
    const props = usePropsFromParams<EditPostProps>();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: intl.formatMessage({id: 'mobile.edit_post.title', defaultMessage: 'Editing Message'}),
            ...getModalHeaderOptions(theme, navigateBack, 'close.edit_post.button'),
        },
    });

    return (<EditPostScreen {...props}/>);
}
