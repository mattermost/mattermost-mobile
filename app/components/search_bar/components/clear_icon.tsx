// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo, useCallback} from 'react';
import {Platform} from 'react-native';

import CompassIcon from '@components/compass_icon';

type ClearIconProps = {
    deleteIconSizeAndroid: number;
    onClear: () => void;
    placeholderTextColor: string;
    searchClearButtonTestID: string;
    tintColorDelete: string;
    titleCancelColor: string;
}

const ClearIcon = ({deleteIconSizeAndroid, onClear, placeholderTextColor, searchClearButtonTestID, tintColorDelete, titleCancelColor}: ClearIconProps) => {
    const onPressClear = useCallback(() => onClear(), []);

    if (Platform.OS === 'ios') {
        return (
            <CompassIcon
                testID={searchClearButtonTestID}
                name='close-circle'
                size={18}
                style={{color: tintColorDelete || 'grey'}}
                onPress={onPressClear}
            />
        );
    }

    return (
        <CompassIcon
            testID={searchClearButtonTestID}
            name='close'
            size={deleteIconSizeAndroid}
            color={titleCancelColor || placeholderTextColor}
            onPress={onPressClear}
        />
    );
};

export default memo(ClearIcon);
