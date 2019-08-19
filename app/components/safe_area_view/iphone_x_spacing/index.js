// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceTypes, ViewTypes} from 'app/constants';

export const paddingHorizontal = (isLandscape, modifier = 0) => {
    return DeviceTypes.IS_IPHONE_X && isLandscape ? {paddingHorizontal: ViewTypes.IOS_HORIZONTAL_LANDSCAPE + modifier} : null;
};

export const paddingLeft = (isLandscape, modifier = 0) => {
    return DeviceTypes.IS_IPHONE_X && isLandscape ? {paddingLeft: ViewTypes.IOS_HORIZONTAL_LANDSCAPE + modifier} : null;
};

export const paddingRight = (isLandscape, modifier = 0) => {
    return DeviceTypes.IS_IPHONE_X && isLandscape ? {paddingRight: ViewTypes.IOS_HORIZONTAL_LANDSCAPE + modifier} : null;
};

export const marginHorizontal = (isLandscape, modifier = 0) => {
    return DeviceTypes.IS_IPHONE_X && isLandscape ? {marginHorizontal: ViewTypes.IOS_HORIZONTAL_LANDSCAPE + modifier} : null;
};