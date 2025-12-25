// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import {useEffect} from 'react';
import {useIntl} from 'react-intl';

import {useIsTablet} from '@hooks/device';
import {usePropsFromParams} from '@hooks/props_from_params';
import EmojiPickereScreen, {type EmojiPickerProps} from '@screens/emoji_picker';

export default function EmojiPickereRoute() {
    const navigation = useNavigation();
    const props = usePropsFromParams<EmojiPickerProps & {title?: string}>();
    const isTablet = useIsTablet();
    const intl = useIntl();

    const headerTitle = props.title ?? intl.formatMessage({id: 'mobile.post_info.add_reaction', defaultMessage: 'Add Reaction'});

    useEffect(() => {
        navigation.setOptions({
            animation: 'none',
            headerOptions: {
                headerTitle,
                headerShown: isTablet,
            },
        });
    }, [headerTitle, intl, isTablet, navigation]);
    return <EmojiPickereScreen {...props}/>;
}
