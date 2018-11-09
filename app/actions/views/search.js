// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {ViewTypes} from 'app/constants';

export function handleSearchDraftChanged(text) {
    return async (dispatch, getState) => {
        dispatch({
            type: ViewTypes.SEARCH_DRAFT_CHANGED,
            text,
        }, getState);
    };
}

export function showSearchModal(navigator, initialValue = '') {
    return (dispatch, getState) => {
        const theme = getTheme(getState());

        const options = {
            screen: 'Search',
            animated: true,
            backButtonTitle: '',
            overrideBackPress: true,
            passProps: {
                initialValue,
            },
            navigatorStyle: {
                navBarHidden: true,
                screenBackgroundColor: theme.centerChannelBg,
            },
        };

        navigator.showModal(options);
    };
}
