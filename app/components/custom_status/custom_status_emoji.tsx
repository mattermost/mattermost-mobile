// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';
import {Database} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import System from '@typings/database/models/servers/system';
import React from 'react';
import {Text, TextStyle} from 'react-native';

import Emoji from '@components/emoji';
import {queryCurrentUserId} from '@queries/servers/system';
import {queryUserById} from '@queries/servers/user';

import type UserModel from '@typings/database/models/servers/user';

type CustomStatusEmojiInputProps = {
    emojiSize?: number;
    style?: TextStyle;
    testID?: string;
    userId?: string;
};

type CustomStatusEmojiProps = CustomStatusEmojiInputProps & {
    currentUserId: string;
    userRecords: UserModel[];
};

const ConnectedCustomStatusEmoji = ({emojiSize = 16, style, testID, userRecords}: CustomStatusEmojiProps) => {
    //todo: ensure that we are storing the custom status in there
    const customStatus = userRecords?.[0]?.props?.customStatus;
    if (!customStatus?.emoji) {
        return null;
    }

    const testIdPrefix = testID ? `${testID}.` : '';
    return (
        <Text
            style={style}
            testID={`${testIdPrefix}custom_status_emoji.${customStatus.emoji}`}
        >
            <Emoji
                size={emojiSize}
                emojiName={customStatus.emoji}
            />
        </Text>
    );
};

type ObservableUserId = {
    currentUserIdRecord: System;
    database: Database;
    userId?: string;
};

const enhanceCurrentUserId = withObservables([], ({database}: ObservableUserId) => ({
    currentUserIdRecord: queryCurrentUserId(database),
}),
);

const enhanceUserId = withObservables(['userId'], ({userId, currentUserIdRecord, database}: ObservableUserId) => ({
    userRecords: queryUserById({database, userId: userId ?? currentUserIdRecord?.value}).observe(),
}));

const CustomStatusEmoji: React.FunctionComponent<CustomStatusEmojiInputProps> = withDatabase(enhanceCurrentUserId(enhanceUserId(ConnectedCustomStatusEmoji)));

export default CustomStatusEmoji;
