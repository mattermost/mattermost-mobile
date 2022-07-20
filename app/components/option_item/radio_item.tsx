// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        ring: {
            height: 24,
            width: 24,
            borderRadius: 12,
            marginRight: 16,
            borderWidth: 4,
            borderColor: theme.buttonBg,
            alignItems: 'center',
            justifyContent: 'center',
        },
        inActive: {
            borderColor: changeOpacity(theme.centerChannelColor, 0.56),
        },
        center: {
            height: 12,
            width: 12,
            borderRadius: 6,
            backgroundColor: theme.buttonBg,
        },
    };
});
type RadioItemProps = {
    selected: boolean;
}
const RadioItem = ({selected}: RadioItemProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <View style={[styles.ring, !selected && styles.inActive]}>
            {selected && (<View style={styles.center}/>)}
        </View>
    );
};

export default RadioItem;
