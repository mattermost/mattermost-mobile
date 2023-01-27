// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {Preferences} from '@constants';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import OptionListRow from '.';

import type Database from '@nozbe/watermelondb/Database';

describe('components/integration_selector/option_list_row', () => {
    let database: Database;
    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    it('should match snapshot for option', () => {
        const myItem = {
            value: '1',
            text: 'my text',
        };
        const wrapper = renderWithEverything(
            <OptionListRow
                enabled={true}
                selectable={false}
                selected={false}
                theme={Preferences.THEMES.denim}
                item={myItem}
                id='1'
                onPress={() => {
                    // noop
                }}
            >
                <br/>
            </OptionListRow>,
            {database},
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
