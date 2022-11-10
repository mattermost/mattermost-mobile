// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Database from '@nozbe/watermelondb/Database';
import React from 'react';

import {Preferences} from '@app/constants';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import CustomListRow from '.';

describe('components/integration_selector/custom_list_row', () => {
    let database: Database;
    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    it('should render', () => {
        const wrapper = renderWithEverything(
            <CustomListRow
                id='1'
                onPress={null}
                enabled={true}
                selectable={true}
                selected={true}
                theme={Preferences.THEMES.denim}
            />,
            {database},
        );

        expect(wrapper.toJSON()).toBeTruthy();
    });
});
