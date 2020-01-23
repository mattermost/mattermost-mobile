// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export function getDimensions(state) {
    return state.device.dimension;
}

export function getConnection(state) {
    return state.device.connection;
}

export function getStatusBarHeight(state) {
    return state.device.statusBarHeight;
}

export function isLandscape(state) {
    return state.device.dimension.deviceWidth > state.device.dimension.deviceHeight;
}

export function isTablet(state) {
    return state.device.isTablet;
}
