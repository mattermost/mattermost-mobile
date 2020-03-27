// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';

import deepFreezeAndThrowOnMutation from '@mm-redux/utils/deep_freeze';
import TestHelper from 'test/test_helper';
import * as Selectors from '@mm-redux/selectors/entities/search';

describe('Selectors.Search', () => {
    const team1 = TestHelper.fakeTeamWithId();

    const team1CurrentSearch = {params: {page: 0, per_page: 20}, isEnd: true};

    const testState = deepFreezeAndThrowOnMutation({
        entities: {
            teams: {
                currentTeamId: team1.id,
            },
            search: {
                current: {[team1.id]: team1CurrentSearch},
            },
        },
    });

    it('should return current search for current team', () => {
        assert.deepEqual(Selectors.getCurrentSearchForCurrentTeam(testState), team1CurrentSearch);
    });
});
