// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import CompassIcon from '@components/compass_icon';
import {Theme} from '@mm-redux/types/preferences';

import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {preventDoubleTap} from '@utils/tap';
import {Platform, TouchableOpacity} from 'react-native';

interface Props {
    handlePress: () => void;
    size?: number;
    theme: Theme;
    testID?: string;
    iconName: string,
}

const ClearButton = (props: Props) => {
    // Note: We need a default iconName as the defaultProps
    // don't get applied initially when the value is undefined
    const {handlePress, iconName = 'close-circle', size, theme, testID} = props;
    const style = getStyleSheet(theme);

    return (
        <TouchableOpacity
            onPress={preventDoubleTap(handlePress)}
            style={style.container}
            testID={testID}
        >
            <CompassIcon
                name={iconName}
                size={size}
                style={style.button}
            />
        </TouchableOpacity>
    );
};

ClearButton.defaultProps = {
    size: 20,
    iconName: 'close-circle',
};

export default ClearButton;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            height: 40,
            width: 40,
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
        button: {
            borderRadius: 1000,
            ...Platform.select({
                ios: {
                    color: changeOpacity(theme.centerChannelColor, 0.52),
                },
                android: {
                    color: theme.centerChannelBg,
                    backgroundColor: changeOpacity(theme.centerChannelColor, 0.52),
                },
            }),
        },
    };
});
