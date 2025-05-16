// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {type StyleProp, type TextStyle, View, type ViewStyle} from 'react-native';

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
    textStyle?: StyleProp<TextStyle>;
    isAbacTag?: boolean;
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            alignSelf: 'center',
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            borderRadius: 4,
            paddingVertical: 2,
            paddingHorizontal: 4,
        },
        text: {
            color: theme.centerChannelColor,
            fontFamily: 'OpenSans-SemiBold',
            fontSize: 10,
            textTransform: 'uppercase',
        },
        title: {
            backgroundColor: changeOpacity(theme.sidebarHeaderTextColor, 0.15),
            color: changeOpacity(theme.sidebarHeaderTextColor, 0.6),
        },

        // Special styles for ABAC tags
        abacTagContainer: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            borderWidth: 0,
            borderRadius: 6,
            paddingVertical: 4,
            paddingHorizontal: 8,
            marginRight: 4,
        },
        abacTagText: {
            color: theme.centerChannelColor,
            fontSize: 12,
            textTransform: 'none',
        },
    };
});

export function BotTag(props: Omit<TagProps, 'id' | 'defaultMessage'>) {
    const id = t('post_info.bot');
    const defaultMessage = 'Bot';

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
    const defaultMessage = 'Guest';

    return (
        <Tag
            {...props}
            id={id}
            defaultMessage={defaultMessage}
        />
    );
}

const Tag = ({id, defaultMessage, inTitle, show = true, style, testID, textStyle, isAbacTag}: TagProps) => {
    const theme = useTheme();

    if (!show) {
        return null;
    }

    const styles = getStyleFromTheme(theme);

    return (
        <View
            style={[
                styles.container,
                isAbacTag && styles.abacTagContainer,
                style,
            ]}
        >
            <FormattedText
                id={id}
                defaultMessage={defaultMessage}
                style={[
                    styles.text,
                    inTitle ? styles.title : null,
                    isAbacTag && styles.abacTagText,
                    textStyle,
                ]}
                testID={testID}
            />
        </View>
    );
};

export default Tag;
