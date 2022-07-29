// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import Modifiers from './modifiers';
import RecentSearches from './recent_searches';

import type TeamSearchHistoryModel from '@typings/database/models/servers/team_search_history';

type Props = {
    recentSearches: TeamSearchHistoryModel[];
    searchValue?: string;
    setRecentValue: (value: string) => void;
    setSearchValue: (value: string) => void;
    setTeamId: (value: string) => void;
    teamId: string;
    teamName: string;
}

const Initial = ({setRecentValue, recentSearches, searchValue, teamId, teamName, setTeamId, setSearchValue}: Props) => {
    return (
        <>
            <Modifiers
                searchValue={searchValue}
                setSearchValue={setSearchValue}
                setTeamId={setTeamId}
                teamId={teamId}
            />
            {Boolean(recentSearches.length) &&
                <RecentSearches
                    recentSearches={recentSearches}
                    setRecentValue={setRecentValue}
                    teamName={teamName}
                />
            }
        </>
    );
};

export default Initial;
