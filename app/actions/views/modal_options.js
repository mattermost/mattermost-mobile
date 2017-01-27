// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {ViewTypes} from 'app/constants';

export function openModal(title, options) {
    return async (dispatch, getState) => {
        dispatch({
            type: ViewTypes.MODAL_OPTIONS_CHANGED,
            data: {
                title,
                options,
                visible: true
            }
        }, getState);
    };
}

export function closeModal() {
    return async (dispatch, getState) => {
        dispatch({
            type: ViewTypes.MODAL_OPTIONS_CHANGED,
            data: {
                title: '',
                options: [],
                visible: false
            }
        }, getState);
    };
}
