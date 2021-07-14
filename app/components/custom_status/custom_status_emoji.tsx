// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';
import {Database} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import React from 'react';
import {Text, TextStyle} from 'react-native';

import Emoji from '@components/emoji';
import {queryCurrentUserId} from '@queries/servers/system';
import {queryUserById} from '@queries/servers/user';

import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

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

type CustomStatusEmojiInputProps = {
    emojiSize?: number;
    style?: TextStyle;
    testID?: string;
    userId?: string;
};

type CustomStatusEmojiProps = CustomStatusEmojiInputProps & {
    currentUserIdRecord: SystemModel;
    database: Database;
    userRecords: UserModel[];
};

const enhanceCurrentUserId = withObservables([], ({database}: { database: Database}) => ({
    currentUserIdRecord: queryCurrentUserId(database),
}),
);

const enhanceUserId = withObservables(['userId'], ({userId, currentUserIdRecord, database}: {userId: string; currentUserIdRecord: SystemModel; database: Database}) => ({
    userRecords: queryUserById({database, userId: userId ?? currentUserIdRecord?.value}).observe(),
}));

const CustomStatusEmoji: React.FunctionComponent<CustomStatusEmojiInputProps> = withDatabase(enhanceCurrentUserId(enhanceUserId(ConnectedCustomStatusEmoji)));

export default CustomStatusEmoji;
