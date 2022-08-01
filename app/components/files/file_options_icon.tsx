// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {TouchableOpacity} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    onPress: () => void;
    selected?: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        threeDotContainer: {
            alignItems: 'flex-end',
            borderRadius: 4,
            marginHorizontal: 20,
            padding: 7,
        },
        selected: {
            backgroundColor: changeOpacity(theme.buttonBg, 0.08),
        },
    };
});

export default function FileOptionsIcon({onPress, selected = false}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    return (
        <TouchableOpacity
            onPress={onPress}
            style={[styles.threeDotContainer, selected ? styles.selected : null]}
        >
            <CompassIcon
                name='dots-horizontal'
                color={changeOpacity(theme.centerChannelColor, 0.56)}
                size={18}
            />
        </TouchableOpacity>
    );
}
