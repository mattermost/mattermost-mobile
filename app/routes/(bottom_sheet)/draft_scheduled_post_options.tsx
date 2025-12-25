// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import {useEffect} from 'react';
import {useIntl} from 'react-intl';

import {DRAFT_TYPE_DRAFT} from '@constants/draft';
import {useIsTablet} from '@hooks/device';
import {usePropsFromParams} from '@hooks/props_from_params';
import DraftScheduledPostScreen, {type DraftScheduledPostProps} from '@screens/draft_scheduled_post_options';

export default function DraftScheduledPostOptionsRoute() {
    const navigation = useNavigation();
    const props = usePropsFromParams<DraftScheduledPostProps>();
    const isTablet = useIsTablet();
    const intl = useIntl();

    let headerTitle = '';
    if (props.draftType === DRAFT_TYPE_DRAFT) {
        headerTitle = intl.formatMessage({id: 'draft.options.title', defaultMessage: 'Draft Options'});
    } else {
        headerTitle = intl.formatMessage({id: 'scheduled_post.options.title', defaultMessage: 'Message actions'});
    }

    useEffect(() => {
        navigation.setOptions({
            animation: 'none',
            headerOptions: {
                headerTitle,
                headerShown: isTablet,
            },
        });
    }, [headerTitle, isTablet, navigation]);
    return <DraftScheduledPostScreen {...props}/>;
}
