// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import CustomListRow from '.';

import type Database from '@nozbe/watermelondb/Database';

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
            >
                <View>
                    <View>
                        <CompassIcon
                            name={'globe'}
                        />
                        <Text>
                            {'My channel'}
                        </Text>
                    </View>
                </View>
            </CustomListRow>,
            {database},
        );

        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
