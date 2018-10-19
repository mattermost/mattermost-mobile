// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export function getChannelOrUserFromMention(mention, channelsOrUsersByName = {}) {
    let newMention = mention.toLowerCase();

    while (newMention.length > 0) {
        if (channelsOrUsersByName.hasOwnProperty(newMention)) {
            return channelsOrUsersByName[newMention];
        }

        // Repeatedly trim off trailing punctuation in case this is at the end of a sentence
        if ((/[._-]$/).test(newMention)) {
            newMention = newMention.substring(0, newMention.length - 1);
        } else {
            break;
        }
    }

    return null;
}
