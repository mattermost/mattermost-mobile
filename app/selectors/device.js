// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

export function getDimensions(state) {
    return state.device.dimension;
}

export function getConnection(state) {
    return state.device.connection;
}

export function getStatusBarHeight(state) {
    return state.device.statusBarHeight;
}
