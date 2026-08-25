// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetFooter, type BottomSheetFooterProps} from '@gorhom/bottom-sheet';
import React, {useMemo} from 'react';
import {View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useTheme} from '@context/theme';

const EmptyBottomSheetFooter = (props: BottomSheetFooterProps) => {
    const {bottom} = useSafeAreaInsets();
    const theme = useTheme();

    const bottomViewStyle = useMemo(() => {
        return {
            height: bottom,
            top: bottom, // translate down the same amount as the height
            backgroundColor: theme.centerChannelBg,
        };
    }, [bottom, theme.centerChannelBg]);

    return (
        <BottomSheetFooter {...props}>
            <View style={bottomViewStyle}/>
        </BottomSheetFooter>
    );
};

export default EmptyBottomSheetFooter;
