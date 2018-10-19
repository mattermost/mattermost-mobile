// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getChannelOrUserFromMention} from './mention';

describe('should match return value on getChannelOrUserFromMention', () => {
    const channelsByName = {
        first_channel: {id: 'channel_id_1', name: 'first_channel', display_name: 'First Channel'},
        second_channel: {id: 'channel_id_2', name: 'second_channel', display_name: 'Second Channel'},
    };

    const testCases = [
        {
            name: 'regular mention',
            input: {channelName: 'first_channel', channelsByName},
            output: channelsByName.first_channel,
        },
        {
            name: 'another mention',
            input: {channelName: 'second_channel', channelsByName},
            output: channelsByName.second_channel,
        },
        {
            name: 'channel mention with trailing punctuation',
            input: {channelName: 'first_channel-', channelsByName},
            output: channelsByName.first_channel,
        },
        {
            name: 'channel mention with trailing punctuations',
            input: {channelName: 'first_channel-_.', channelsByName},
            output: channelsByName.first_channel,
        },
        {
            name: 'channel mention not found in channelsByName',
            input: {channelName: 'otherChannel', channelsByName},
            output: null,
        },
    ];

    for (const testCase of testCases) {
        const {name, input, output} = testCase;
        test(name, () => {
            expect(getChannelOrUserFromMention(input.channelName, input.channelsByName)).toEqual(output);
        });
    }
});
