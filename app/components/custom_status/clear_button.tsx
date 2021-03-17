// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import CompassIcon from '@components/compass_icon';
import {Theme} from '@mm-redux/types/preferences';

import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {preventDoubleTap} from '@utils/tap';
import {View} from 'react-native';

interface Props {
    handlePress: () => void;
    size?: number;
    theme: Theme;
    testID?: string;
}

const ClearButton = (props: Props) => {
    const {handlePress, size, theme, testID} = props;
    const style = getStyleSheet(theme);

    return (
        <View
            style={style.container}
            testID={testID}
        >
            <CompassIcon
                onPress={preventDoubleTap(handlePress)}
                name='close'
                size={size}
                color={theme.centerChannelBg}
                style={style.button}
            />
        </View>
    );
};

ClearButton.defaultProps = {
    size: 20,
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
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.52),
            borderRadius: 1000,
            overflow: 'hidden',
        },
    };
});
