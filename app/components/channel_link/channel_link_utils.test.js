// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getChannelFromChannelName} from './channel_link_utils';

describe('should match return value on getChannelFromChannelName', () => {
    const channelsByName = {
        firstChannel: {id: 'channel_id_1', name: 'firstChannel', display_name: 'First Channel'},
        secondChannel: {id: 'channel_id_2', name: 'secondChannel', display_name: 'Second Channel'},
    };

    const testCases = [
        {
            name: 'regular mention',
            input: {channelName: 'firstChannel', channelsByName},
            output: channelsByName.firstChannel,
        },
        {
            name: 'another mention',
            input: {channelName: 'secondChannel', channelsByName},
            output: channelsByName.secondChannel,
        },
        {
            name: 'channel mention with trailing punctuation',
            input: {channelName: 'firstChannel-', channelsByName},
            output: channelsByName.firstChannel,
        },
        {
            name: 'channel mention with trailing punctuations',
            input: {channelName: 'firstChannel-_', channelsByName},
            output: channelsByName.firstChannel,
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
            expect(getChannelFromChannelName(input.channelName, input.channelsByName)).toEqual(output);
        });
    }
});
