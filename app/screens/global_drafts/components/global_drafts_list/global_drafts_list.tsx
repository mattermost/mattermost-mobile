// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View, Text} from 'react-native';

import type DraftModel from '@typings/database/models/servers/draft';

type Props = {
    allDrafts: DraftModel[];
}

const GlobalDraftsList: React.FC<Props> = () => {
    return (
        <View>
            <Text>{'Global Draft List'}</Text>
        </View>);
};

export default GlobalDraftsList;
