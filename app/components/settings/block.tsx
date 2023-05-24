// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {type LayoutChangeEvent, type StyleProp, type TextStyle, View, type ViewStyle} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {MessageDescriptor} from 'react-intl';

type SectionText = {
    id: string;
    defaultMessage: string;
    values?: MessageDescriptor;
}

type SettingBlockProps = {
    children: React.ReactNode;
    containerStyles?: StyleProp<ViewStyle>;
    disableFooter?: boolean;
    disableHeader?: boolean;
    footerStyles?: StyleProp<TextStyle>;
    footerText?: SectionText;
    headerStyles?: StyleProp<TextStyle>;
    headerText?: SectionText;
    onLayout?: (event: LayoutChangeEvent) => void;
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            marginBottom: 30,
        },
        contentContainerStyle: {
            marginBottom: 0,
        },
        header: {
            color: theme.centerChannelColor,
            ...typography('Heading', 300, 'SemiBold'),
            marginBottom: 8,
            marginLeft: 20,
            marginTop: 12,
            marginRight: 15,
        },
        footer: {
            marginTop: 10,
            marginHorizontal: 15,
            fontSize: 12,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
    };
});

const SettingBlock = ({
    children, containerStyles, disableFooter, disableHeader,
    footerStyles, footerText, headerStyles, headerText, onLayout,
}: SettingBlockProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <View
            style={styles.container}
            onLayout={onLayout}
        >
            {(headerText && !disableHeader) &&
            <FormattedText
                defaultMessage={headerText.defaultMessage}
                id={headerText.id}
                values={headerText.values}
                style={[styles.header, headerStyles]}
            />
            }
            <View style={[styles.contentContainerStyle, containerStyles]}>
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

export default SettingBlock;
