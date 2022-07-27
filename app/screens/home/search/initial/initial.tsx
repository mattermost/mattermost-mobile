// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import Modifiers from '../modifiers';
import RecentSearches from '../recent_searches';

import type TeamSearchHistoryModel from '@typings/database/models/servers/team_search_history';

type Props = {
    recentSearches: TeamSearchHistoryModel[];
    teamId: string;
    searchValue?: string;
    setRecentValue: (value: string) => void;
    setSearchValue: (value: string) => void;
    setTeamId: (value: string) => void;
}

const Initial = ({setRecentValue, recentSearches, searchValue, teamId, setTeamId, setSearchValue}: Props) => {
    return (
        <>
            <Modifiers
                setSearchValue={setSearchValue}
                searchValue={searchValue}
                teamId={teamId}
                setTeamId={setTeamId}
            />
            {Boolean(recentSearches?.length) &&
                <RecentSearches
                    recentSearches={recentSearches}
                    setRecentValue={setRecentValue}
                    teamId={teamId}
                />
            }
        </>
    );
};

export default Initial;
