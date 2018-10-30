// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {selectFirstAvailableTeam} from 'app/utils/teams';

describe('selectFirstAvailableTeam', () => {
    const myTeams = [{
        id: 'team-id-1',
        display_name: 'Zeta Team',
        name: 'zeta-team',
    }, {
        id: 'team-id-2',
        display_name: 'Alpha Team',
        name: 'alpha-team',
    }];

    it('should return the primary team', () => {
        const defaultTeam = selectFirstAvailableTeam(myTeams, 'zeTa-teAM');
        expect(defaultTeam).toBe(myTeams[0]);
    });

    it('should return the first team ordered by display_name', () => {
        const defaultTeam = selectFirstAvailableTeam(myTeams);
        expect(defaultTeam).toBe(myTeams[1]);
    });

    it('should return the first team ordered by display_name if primary team is not found', () => {
        const defaultTeam = selectFirstAvailableTeam(myTeams, 'non-existent-team');
        expect(defaultTeam).toBe(myTeams[1]);
    });

    it('should return undefined is no team is found', () => {
        const defaultTeam = selectFirstAvailableTeam([]);
        expect(defaultTeam).toBe(undefined); //eslint-disable-line no-undefined
    });
});
