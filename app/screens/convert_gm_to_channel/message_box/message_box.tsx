// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import CompassIcon from '@app/components/compass_icon';
import {useTheme} from '@app/context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@app/utils/theme';
import {typography} from '@app/utils/typography';

type MessageBoxTypes = 'default' | 'danger'

type Props = {
    header: string;
    body: string;
    type?: MessageBoxTypes;
}

const getBaseStyles = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            backgroundColor: changeOpacity(theme.sidebarTextActiveBorder, 0.08),
            borderWidth: 1,
            borderRadius: 8,
            borderColor: changeOpacity(theme.sidebarTextActiveBorder, 0.16),
            display: 'flex',
            flexDirection: 'row',
            padding: 16,
            gap: 12,
        },
        icon: {
            marginTop: 5,
            fontSize: 20,
            width: 28,
            height: 28,
            borderWidth: 3,
            color: theme.sidebarTextActiveBorder,
            borderColor: theme.sidebarTextActiveBorder,
            borderRadius: 14,
            textAlign: 'center',
        },
        iconContainer: {},
        textContainer: {
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            flex: 1,
        },
        heading: {
            color: theme.centerChannelColor,
            ...typography('Body', 100, 'SemiBold'),
        },
        body: {
            color: theme.centerChannelColor,
            ...typography('Body', 100),
        },
    };
});

const getDefaultStylesFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            backgroundColor: changeOpacity(theme.sidebarTextActiveBorder, 0.08),
            borderColor: changeOpacity(theme.sidebarTextActiveBorder, 0.16),
        },
        icon: {
            color: theme.sidebarTextActiveBorder,
            borderColor: theme.sidebarTextActiveBorder,
        },
    };
});

const getDangerStylesFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            backgroundColor: changeOpacity(theme.dndIndicator, 0.08),
            borderColor: changeOpacity(theme.dndIndicator, 0.16),
        },
        icon: {
            color: theme.dndIndicator,
            borderColor: theme.dndIndicator,
        },
    };
});

const getStyleFromTheme = (theme: Theme, kind: MessageBoxTypes | undefined) => {
    const baseStyles = getBaseStyles(theme);

    let kindStyles;
    switch (kind) {
        case 'danger': {
            kindStyles = getDangerStylesFromTheme(theme);
            break;
        }
        default: {
            kindStyles = getDefaultStylesFromTheme(theme);
            break;
        }
    }

    return {
        ...baseStyles,
        ...kindStyles,
    };
};

const MessageBox = ({
    header,
    body,
    type,
}: Props) => {
    const theme = useTheme();
    const styles = getBaseStyles(theme);
    const foo = getStyleFromTheme(theme, type);


    return (
        <View style={[styles.container, foo.container]}>
            <View style={styles.iconContainer}>
                <CompassIcon
                    name='exclamation-thick'
                    style={[styles.icon, foo.icon]}
                />
            </View>
            <View style={styles.textContainer}>
                <View>
                    <Text style={[styles.heading, foo.heading]}>
                        {header}
                    </Text>
                </View>
                <View>
                    <Text style={[styles.body, foo.body]}>
                        {body}
                    </Text>
                </View>
            </View>
        </View>
    );
};

export default MessageBox;
