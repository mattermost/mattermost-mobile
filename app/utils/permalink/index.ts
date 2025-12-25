// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Keyboard} from 'react-native';

import {Screens} from '@constants';
import {dismissAllModals, navigateToScreen} from '@utils/navigation/adapter';

let showingPermalink = false;

export const displayPermalink = async (teamName: string, postId: string) => {
    Keyboard.dismiss();
    if (showingPermalink) {
        await dismissAllModals();
    }

    const screen = Screens.PERMALINK;
    const passProps = {
        teamName,
        postId,
    };

    showingPermalink = true;
    navigateToScreen(screen, passProps);
};

export const closePermalink = () => {
    showingPermalink = false;
    return showingPermalink;
};
