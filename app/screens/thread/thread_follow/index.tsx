// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {IntlShape} from 'react-intl';

import {Theme} from '@mm-redux/types/preferences';
import {changeOpacity} from '@mm-redux/utils/theme_utils';
import {preventDoubleTap} from '@utils/tap';
import {makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    active: boolean;
    intl: typeof IntlShape;
    onPress: () => void;
    theme: Theme
};

function ThreadFollow({active, intl, onPress, theme}: Props) {
    const styles = getStyleSheet(theme);
    const [containerStyle] = React.useMemo(() => {
        let container = styles.container;
        if (active) {
            container = [container, styles.containerActive];
        }
        return [container];
    }, [active, styles]);

    return (
        <TouchableOpacity
            onPress={preventDoubleTap(onPress)}
        >
            <View style={containerStyle}>
                <Text style={styles.text}>
                    {
                        active ? intl.formatMessage({
                            id: 'threads.following',
                            defaultMessage: 'Following',
                        }) : intl.formatMessage({
                            id: 'threads.follow',
                            defaultMessage: 'Follow',
                        })
                    }
                </Text>
            </View>
        </TouchableOpacity>
    );
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            borderColor: theme.centerChannelColor,
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: 4,
            paddingVertical: 4.5,
            paddingHorizontal: 10,
            opacity: 0.72,
        },
        containerActive: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.24),
            borderColor: 'transparent',
            opacity: 1,
        },
        text: {
            color: theme.centerChannelColor,
            fontWeight: '600',
            fontSize: 12,
        },
    };
});

export default ThreadFollow;
