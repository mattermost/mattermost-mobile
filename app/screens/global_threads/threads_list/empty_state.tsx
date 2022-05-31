// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

import EmptyStateIllustration from './illustrations/empty_state';

type Props = {
    isUnreads: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            alignItems: 'center',
            flexGrow: 1,
            justifyContent: 'center',
        },
        textContainer: {
            padding: 32,
        },
        title: {
            color: theme.centerChannelColor,
            fontSize: 20,
            fontWeight: '600',
            textAlign: 'center',
        },
        subTitle: {
            color: theme.centerChannelColor,
            fontSize: 16,
            fontWeight: '400',
            lineHeight: 24,
            marginTop: 16,
            textAlign: 'center',
        },
    };
});

function EmptyState({isUnreads}: Props) {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    let title;
    let subTitle;
    if (isUnreads) {
        title = intl.formatMessage({
            id: 'global_threads.emptyUnreads.title',
            defaultMessage: 'No unread threads',
        });
        subTitle = intl.formatMessage({
            id: 'global_threads.emptyUnreads.message',
            defaultMessage: "Looks like you're all caught up.",
        });
    } else {
        title = intl.formatMessage({
            id: 'global_threads.emptyThreads.title',
            defaultMessage: 'No followed threads yet',
        });
        subTitle = intl.formatMessage({
            id: 'global_threads.emptyThreads.message',
            defaultMessage: 'Any threads you are mentioned in or have participated in will show here along with any threads you have followed.',
        });
    }
    return (
        <View
            style={style.container}
            testID='global_threads.threads_list.empty_state'
        >
            <EmptyStateIllustration theme={theme}/>
            <View style={style.textContainer}>
                <Text style={style.title}>
                    {title}
                </Text>
                <Text style={style.subTitle}>
                    {subTitle}
                </Text>
            </View>
        </View>
    );
}

export default EmptyState;
