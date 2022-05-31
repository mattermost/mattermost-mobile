// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MessageDescriptor} from '@formatjs/intl/src/types';
import React from 'react';
import {StyleProp, TextStyle, View, ViewStyle} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            marginBottom: 30,
        },
        header: {
            marginHorizontal: 15,
            marginBottom: 10,
            fontSize: 13,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
        items: {
            backgroundColor: theme.centerChannelBg,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
        },
        footer: {
            marginTop: 10,
            marginHorizontal: 15,
            fontSize: 12,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
    };
});

type SectionText = {
    id: string;
    defaultMessage: string;
    values?: MessageDescriptor;
}

type SectionProps = {
    children: React.ReactNode;
    disableFooter?: boolean;
    disableHeader?: boolean;
    footerText?: SectionText;
    headerText: SectionText;
    containerStyles?: StyleProp<ViewStyle>;
    headerStyles?: StyleProp<TextStyle>;
    footerStyles?: StyleProp<TextStyle>;
}

const Block = ({
    children,
    containerStyles,
    disableFooter,
    disableHeader,
    footerText,
    headerStyles,
    headerText,
    footerStyles,
}: SectionProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <View style={styles.container}>
            {(headerText && !disableHeader) &&
                <FormattedText
                    defaultMessage={headerText.defaultMessage}
                    id={headerText.id}
                    values={headerText.values}
                    style={[styles.header, headerStyles]}
                />
            }
            <View style={[styles.items, containerStyles]}>
                {children}
            </View>
            {(footerText && !disableFooter) &&
                <FormattedText
                    defaultMessage={footerText.defaultMessage}
                    id={footerText.id}
                    style={[styles.footer, footerStyles]}
                    values={footerText.values}
                />
            }
        </View>
    );
};

export default Block;
