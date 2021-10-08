// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleProp, View, ViewStyle} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type TagProps = {
    id: string;
    defaultMessage: string;
    inTitle?: boolean;
    show?: boolean;
    style?: StyleProp<ViewStyle>;
    testID?: string;
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            alignSelf: 'center',
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.15),
            borderRadius: 2,
            marginRight: 2,
            marginBottom: 1,
            marginLeft: 2,
            paddingVertical: 2,
            paddingHorizontal: 4,
        },
        text: {
            color: theme.centerChannelColor,
            fontSize: 10,
            fontWeight: '600',
        },
        title: {
            backgroundColor: changeOpacity(theme.sidebarHeaderTextColor, 0.15),
            color: changeOpacity(theme.sidebarHeaderTextColor, 0.6),
        },
    };
});

export function BotTag(props: Omit<TagProps, 'id' | 'defaultMessage'>) {
    const id = t('post_info.bot');
    const defaultMessage = 'BOT';

    return (
        <Tag
            {...props}
            id={id}
            defaultMessage={defaultMessage}
        />
    );
}

export function GuestTag(props: Omit<TagProps, 'id' | 'defaultMessage'>) {
    const id = t('post_info.guest');
    const defaultMessage = 'GUEST';

    return (
        <Tag
            {...props}
            id={id}
            defaultMessage={defaultMessage}
        />
    );
}

const Tag = ({id, defaultMessage, inTitle, show = true, style, testID}: TagProps) => {
    const theme = useTheme();

    if (!show) {
        return null;
    }

    const styles = getStyleFromTheme(theme);

    return (
        <View style={[styles.container, style]}>
            <FormattedText
                id={id}
                defaultMessage={defaultMessage}
                style={[styles.text, inTitle ? styles.title : null]}
                testID={testID}
            />
        </View>
    );
};

export default Tag;
