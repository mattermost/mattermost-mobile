// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import DraftPost from '@app/components/draft_post/';

import type DraftModel from '@typings/database/models/servers/draft';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    allDrafts: DraftModel[];
    currentUser: UserModel;
}

const GlobalDraftsList: React.FC<Props> = ({
    allDrafts,
    currentUser,
}) => {
    return (
        <View>
            {allDrafts.map((draft) => {
                return (
                    <DraftPost
                        key={draft.id}
                        channelId={draft.channelId}
                        draft={draft}
                        currentUser={currentUser}
                    />
                );
            })}
        </View>);
};

export default GlobalDraftsList;
