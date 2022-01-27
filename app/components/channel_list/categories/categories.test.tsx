// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import Category from './index';

const userId = 'myUser';
const teamId = 'myTeam';

test('Category List Component should match snapshot', () => {
    const {toJSON} = renderWithIntlAndTheme(
        <Category
            currentUserId={userId}
            currentTeamId={teamId}
        />,
    );

    expect(toJSON()).toMatchSnapshot();
});
