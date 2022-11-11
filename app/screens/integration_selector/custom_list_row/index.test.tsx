// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Database from '@nozbe/watermelondb/Database';
import React from 'react';

import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import CustomListRow from '.';

describe('components/integration_selector/custom_list_row', () => {
    let database: Database;
    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    it('should match snapshot', () => {
        const wrapper = renderWithEverything(
            <CustomListRow
                id='1'
                onPress={() => {
                    // noop
                }}
                enabled={true}
                selectable={true}
                selected={true}
            ><></></CustomListRow>,
            {database},
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
