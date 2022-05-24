// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MessageDescriptor} from '@formatjs/intl/src/types';
import React from 'react';
import {StyleProp, View, ViewStyle} from 'react-native';

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
}

const Section = ({
    children,
    containerStyles,
    disableFooter,
    disableHeader,
    footerText,
    headerText,
}: SectionProps) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    return (
        <View style={style.container}>
            {(headerText && !disableHeader) &&
                <FormattedText
                    defaultMessage={headerText.defaultMessage}
                    id={headerText.id}
                    style={style.header}
                    values={headerText.values}
                />
            }
            <View style={[style.items, containerStyles]}>
                {children}
            </View>
            {(footerText && !disableFooter) &&
                <FormattedText
                    defaultMessage={footerText.defaultMessage}
                    id={footerText.id}
                    style={style.footer}
                    values={footerText.values}
                />
            }
        </View>
    );
};

export default Section;
