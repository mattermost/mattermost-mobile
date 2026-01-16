// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetFooter, type BottomSheetFooterProps} from '@gorhom/bottom-sheet';
import React from 'react';
import {View} from 'react-native';

import {useBottomSheetFooterStyles} from './hooks';

const EmptyBottomSheetFooter = (props: BottomSheetFooterProps) => {
    const style = useBottomSheetFooterStyles();

    return (
        <BottomSheetFooter {...props}>
            <View style={style}/>
        </BottomSheetFooter>
    );
};

export default EmptyBottomSheetFooter;
