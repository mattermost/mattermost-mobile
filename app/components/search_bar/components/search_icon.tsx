// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform, TouchableWithoutFeedback, ViewStyle} from 'react-native';

import CompassIcon from '@components/compass_icon';

type SearchIconProps = {
    backArrowSize: number;
    clearIconColorAndroid: string;
    iOSStyle: ViewStyle;
    onCancel: () => void;
    searchCancelButtonTestID: string;
    searchIconColor: string;
    searchIconSize: number;
    showArrow: boolean;
}

const SearchIcon = ({backArrowSize, clearIconColorAndroid, iOSStyle, onCancel, searchCancelButtonTestID, searchIconColor, searchIconSize, showArrow}: SearchIconProps) => {
    if (Platform.OS === 'ios') {
        return (
            <CompassIcon
                name='magnify'
                size={24}
                style={iOSStyle}
            />
        );
    }

    if (showArrow) {
        return (
            <TouchableWithoutFeedback onPress={onCancel}>
                <CompassIcon
                    testID={searchCancelButtonTestID}
                    name='arrow-left'
                    size={backArrowSize}
                    color={clearIconColorAndroid}
                />
            </TouchableWithoutFeedback>
        );
    }

    return (
        <CompassIcon
            name='magnify'
            size={searchIconSize}
            color={searchIconColor}
        />
    );
};

export default SearchIcon;
