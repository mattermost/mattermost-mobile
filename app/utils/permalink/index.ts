// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {Events, Screens} from '@constants';
import {dismissToStackRoot, navigateToScreen} from '@screens/navigation';

let showingPermalink = false;

export const displayPermalink = async (teamName: string, postId: string) => {
    DeviceEventEmitter.emit(Events.BLUR_AND_DISMISS_KEYBOARD);
    if (showingPermalink) {
        await dismissToStackRoot();
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
