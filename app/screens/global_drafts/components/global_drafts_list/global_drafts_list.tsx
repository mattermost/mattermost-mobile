// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import Drafts from '@app/components/drafts';

import type DraftModel from '@typings/database/models/servers/draft';

type Props = {
    allDrafts: DraftModel[];
}

const GlobalDraftsList: React.FC<Props> = ({
    allDrafts,
}) => {
    return (
        <View>
            {allDrafts.map((draft) => {
                return (
                    <Drafts
                        key={draft.id}
                        channelId={draft.channelId}
                        draft={draft}
                    />
                );
            })}
        </View>);
};

export default GlobalDraftsList;
