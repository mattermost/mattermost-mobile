// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import ShowTranslationScreen from '@screens/show_translation';

type Props = {
    postId: string;
}

export default function IntegrationSelectorRoute() {
    const intl = useIntl();
    const theme = useTheme();
    const {postId} = usePropsFromParams<Props>();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: intl.formatMessage({id: 'mobile.post_info.show_translation', defaultMessage: 'Show Translation'}),
            ...getHeaderOptions(theme),
        },
    });

    return (<ShowTranslationScreen postId={postId}/>);
}
