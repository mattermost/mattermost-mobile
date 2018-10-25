// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export function getChannelFromChannelName(name, channelsByName) {
    let channelName = name;

    while (channelName.length > 0) {
        if (channelsByName[channelName]) {
            return channelsByName[channelName];
        }

        // Repeatedly trim off trailing punctuation in case this is at the end of a sentence
        if ((/[_-]$/).test(channelName)) {
            channelName = channelName.substring(0, channelName.length - 1);
        } else {
            break;
        }
    }

    return null;
}
