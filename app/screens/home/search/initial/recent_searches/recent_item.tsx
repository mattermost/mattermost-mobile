// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import {removeSearchFromTeamSearchHistory} from '@actions/local/team';
import OptionItem from '@components/option_item';
import {useServerUrl} from '@context/server';

import type TeamSearchHistoryModel from '@typings/database/models/servers/team_search_history';

type Props = {
    setRecentValue: (value: string) => void;
    item: TeamSearchHistoryModel;
}

const RecentItem = ({item, setRecentValue}: Props) => {
    const serverUrl = useServerUrl();

    const handlePress = useCallback(() => {
        setRecentValue(item.term);
    }, [item, setRecentValue]);

    const handleRemove = useCallback(async () => {
        await removeSearchFromTeamSearchHistory(serverUrl, item.id);
    }, [item.id, serverUrl]);

    return (
        <OptionItem
            action={handlePress}
            icon={'clock-outline'}
            inline={true}
            label={item.term}
            onRemove={handleRemove}
            testID={`search.recent_item.${item.term}`}
            type='remove'
        />
    );
};

export default RecentItem;
