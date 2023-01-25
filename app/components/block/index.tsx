// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleProp, TextStyle, View, ViewProps, ViewStyle} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {MessageDescriptor} from '@formatjs/intl/src/types';

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
        footer: {
            marginTop: 10,
            marginHorizontal: 15,
            fontSize: 12,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
    };
});

export type SectionText = {
    id: string;
    defaultMessage: string;
    values?: MessageDescriptor;
}

export type BlockProps = ViewProps & {
    children: React.ReactNode;
    disableFooter?: boolean;
    disableHeader?: boolean;
    footerText?: SectionText;
    headerText?: SectionText;
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
    ...props
}: BlockProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <View
            style={styles.container}
            {...props}
        >
            {(headerText && !disableHeader) &&
                <FormattedText
                    defaultMessage={headerText.defaultMessage}
                    id={headerText.id}
                    values={headerText.values}
                    style={[styles.header, headerStyles]}
                />
            }
            <View style={containerStyles}>
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
