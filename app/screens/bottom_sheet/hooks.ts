// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useMemo} from 'react';
import {type StyleProp, type ViewStyle} from 'react-native';

import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';

export function useBottomSheetStyle() {
    const theme = useTheme();
    const isTablet = useIsTablet();
    const style = useMemo<StyleProp<ViewStyle>>(() => ({
        width: isTablet ? '60%' : '100%',
        alignSelf: 'center',
        backgroundColor: theme.centerChannelBg,
    }), [isTablet, theme.centerChannelBg]);

    return style;
}
