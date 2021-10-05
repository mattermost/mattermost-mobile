// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import {useTheme} from '@app/context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@app/utils/theme';
import CompassIcon from '@components/compass_icon';

// TODO PLACEHOLDER
export default function ServerIcon() {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    return (
        <View style={styles.container}>
            <CompassIcon
                size={24}
                name='server-variant'
                color={changeOpacity(theme.buttonColor, 0.56)}
            />
        </View>
    );
}

const getStyleSheet = makeStyleSheetFromTheme(() => {
    return {
        container: {
            flex: 0,
            borderRadius: 10,
            height: 60,
            width: '100%',
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
        },
    };
});
