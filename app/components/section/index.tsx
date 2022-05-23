// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MessageDescriptor} from '@formatjs/intl/src/types';
import React from 'react';
import {
    View,
} from 'react-native';

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

type SectionProps = {
    children: React.ReactNode;
    disableHeader?: boolean;
    disableFooter?: boolean;
    footerDefaultMessage?: string;
    footerId?: string;
    headerDefaultMessage: string;
    headerId: string;
    headerValues?: MessageDescriptor;
    footerValues?: MessageDescriptor;
}

const Section = ({
    children,
    disableHeader,
    disableFooter,
    footerDefaultMessage,
    footerId,
    headerDefaultMessage,
    headerId,
    headerValues,
    footerValues,
}: SectionProps) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    return (
        <View style={style.container}>
            {(headerId && !disableHeader) &&
                <FormattedText
                    id={headerId}
                    defaultMessage={headerDefaultMessage}
                    values={headerValues}
                    style={style.header}
                />
            }
            <View style={style.items}>
                {children}
            </View>
            {(footerId && !disableFooter) &&
                <FormattedText
                    id={footerId}
                    defaultMessage={footerDefaultMessage}
                    values={footerValues}
                    style={style.footer}
                />
            }
        </View>
    );
};

export default Section;
