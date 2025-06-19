// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useMemo} from 'react';
import {View, type ViewStyle, type StyleProp} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    progressBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: 2,
        backgroundColor: theme.onlineIndicator,
        borderRadius: 2,
    },
}));

type Props = {
    progress: number;
    isActive: boolean;
    testID?: string;
}

function ProgressBar({progress, isActive, testID}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const style = useMemo<StyleProp<ViewStyle>>(() => [
        styles.progressBar,
        {
            width: `${progress}%`,
            backgroundColor: isActive ? theme.onlineIndicator : changeOpacity(theme.centerChannelColor, 0.4),
        },
    ], [styles.progressBar, progress, isActive, theme.onlineIndicator, theme.centerChannelColor]);

    return (
        <View
            style={style}
            testID={testID}
        />
    );
}

export default ProgressBar;
