// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, waitFor} from '@testing-library/react-native';
import React, {type ComponentProps, useState} from 'react';

import {Screens, View as ViewConstants} from '@constants';
import DatabaseManager from '@database/manager';
import {navigateToScreen} from '@screens/navigation';
import SettingsStore from '@store/settings_store';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import AutoCompleteSelector, {type Selection} from './index';

import type {Database} from '@nozbe/watermelondb';

jest.mock('@screens/navigation', () => ({
    navigateToScreen: jest.fn(),
    navigateToSettingsScreen: jest.fn(),
}));

describe('AutoCompleteSelector', () => {
    let database: Database;
    const serverUrl = 'https://server-url.com';

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
        SettingsStore.removeIntegrationsSelectCallback();
        SettingsStore.removeIntegrationsDynamicOptionsCallback();
        jest.clearAllMocks();
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    function getBaseProps(): Omit<ComponentProps<typeof AutoCompleteSelector>, 'teammateNameDisplay'> {
        return {
            testID: 'autocomplete.selector',
            location: Screens.CHANNEL,
            options: [
                {value: 'a', text: 'Option A'},
                {value: 'b', text: 'Option B'},
            ],
        };
    }

    describe('omitMargins', () => {
        it('should apply default container margins when omitMargins is false', () => {
            const {root} = renderWithEverything(
                <AutoCompleteSelector {...getBaseProps()}/>,
                {database, serverUrl},
            );

            expect(root).toHaveStyle({
                marginTop: 10,
                marginBottom: 2,
                marginRight: 8,
            });
        });

        it('should zero out container margins when omitMargins is true', () => {
            const {root} = renderWithEverything(
                <AutoCompleteSelector
                    {...getBaseProps()}
                    omitMargins={true}
                />,
                {database, serverUrl},
            );

            expect(root).toHaveStyle({
                marginTop: 0,
                marginBottom: 0,
                marginRight: 0,
            });
        });
    });

    describe('dynamic select display', () => {
        function DynamicHarness() {
            const [selected, setSelected] = useState<string | undefined>();

            return (
                <AutoCompleteSelector
                    testID='autocomplete.selector'
                    location={Screens.CHANNEL}
                    dataSource={ViewConstants.DATA_SOURCE_DYNAMIC}
                    getDynamicOptions={async () => [{value: 'gamma', text: 'Gamma'}]}
                    selected={selected}
                    onSelected={(option: DialogOption) => {
                        if (option && !Array.isArray(option)) {
                            setSelected(option.value);
                        }
                    }}
                    placeholder='Pick one'
                />
            );
        }

        it('should keep the selected option label after the form updates selected', async () => {
            const {getByTestId, getByText, queryByText} = renderWithEverything(
                <DynamicHarness/>,
                {database, serverUrl},
            );

            expect(getByText('Pick one')).toBeTruthy();

            fireEvent.press(getByTestId('autocomplete.selector.select.button'));
            expect(navigateToScreen).toHaveBeenCalled();

            const selectCallback = SettingsStore.getIntegrationsSelectCallback();
            expect(selectCallback).toBeDefined();

            await act(async () => {
                selectCallback?.({value: 'gamma', text: 'Gamma'} as Selection);
            });

            await waitFor(() => {
                expect(getByTestId('autocomplete.selector.option_chip.gamma')).toBeTruthy();
                expect(getByText('Gamma')).toBeTruthy();
                expect(queryByText('Pick one')).toBeNull();
            });
        });
    });

    describe('option pills', () => {
        it('should render simple option chips and clear on remove', async () => {
            function OptionHarness() {
                const [selected, setSelected] = useState<string[] | undefined>(['a']);
                return (
                    <AutoCompleteSelector
                        {...getBaseProps()}
                        selected={selected}
                        isMultiselect={true}
                        onSelected={(option: DialogOption) => {
                            if (!option) {
                                setSelected(undefined);
                                return;
                            }
                            const next = Array.isArray(option) ? option : [option];
                            setSelected(next.map((item) => item.value));
                        }}
                        placeholder='Select options...'
                    />
                );
            }

            const {getByTestId, getByText, queryByTestId} = renderWithEverything(
                <OptionHarness/>,
                {database, serverUrl},
            );

            await waitFor(() => {
                expect(getByTestId('autocomplete.selector.option_chip.a')).toBeTruthy();
                expect(getByText('Option A')).toBeTruthy();
            });

            fireEvent.press(getByTestId('autocomplete.selector.option_chip.a.remove.button'));

            await waitFor(() => {
                expect(queryByTestId('autocomplete.selector.option_chip.a')).toBeNull();
            });
        });
    });

    describe('user and channel pills', () => {
        it('should render user chips for selected users and clear on remove', async () => {
            const user = TestHelper.fakeUser({id: 'user-1', username: 'leonard', first_name: 'Leonard', last_name: 'Riley'});
            const operator = DatabaseManager.getServerDatabaseAndOperator(serverUrl).operator;
            await operator.handleUsers({users: [user], prepareRecordsOnly: false});

            function UserHarness() {
                const [selected, setSelected] = useState<string[] | undefined>(['user-1']);
                return (
                    <AutoCompleteSelector
                        {...getBaseProps()}
                        options={undefined}
                        dataSource={ViewConstants.DATA_SOURCE_USERS}
                        selected={selected}
                        isMultiselect={true}
                        onSelected={(option: DialogOption) => {
                            if (!option) {
                                setSelected(undefined);
                                return;
                            }
                            const next = Array.isArray(option) ? option : [option];
                            setSelected(next.map((item) => item.value));
                        }}
                        placeholder='Select users...'
                    />
                );
            }

            const {getByTestId, queryByTestId} = renderWithEverything(
                <UserHarness/>,
                {database, serverUrl},
            );

            await waitFor(() => {
                expect(getByTestId('autocomplete.selector.user_chip.user-1')).toBeTruthy();
            });

            fireEvent.press(getByTestId('autocomplete.selector.user_chip.user-1.remove.button'));

            await waitFor(() => {
                expect(queryByTestId('autocomplete.selector.user_chip.user-1')).toBeNull();
            });
        });

        it('should render channel chips for selected channels and clear on remove', async () => {
            function ChannelHarness() {
                const [selected, setSelected] = useState<string[] | undefined>();
                return (
                    <AutoCompleteSelector
                        {...getBaseProps()}
                        options={undefined}
                        dataSource={ViewConstants.DATA_SOURCE_CHANNELS}
                        selected={selected}
                        isMultiselect={true}
                        onSelected={(option: DialogOption) => {
                            if (!option) {
                                setSelected(undefined);
                                return;
                            }
                            const next = Array.isArray(option) ? option : [option];
                            setSelected(next.map((item) => item.value));
                        }}
                        placeholder='Select a channel...'
                    />
                );
            }

            const {getByTestId, getByText, queryByTestId} = renderWithEverything(
                <ChannelHarness/>,
                {database, serverUrl},
            );

            fireEvent.press(getByTestId('autocomplete.selector.select.button'));
            const selectCallback = SettingsStore.getIntegrationsSelectCallback();
            await act(async () => {
                selectCallback?.([{id: 'channel-1', display_name: 'Off-Topic'}] as unknown as Selection);
            });

            await waitFor(() => {
                expect(getByTestId('autocomplete.selector.channel_chip.channel-1')).toBeTruthy();
                expect(getByText('Off-Topic')).toBeTruthy();
            });

            fireEvent.press(getByTestId('autocomplete.selector.channel_chip.channel-1.remove.button'));

            await waitFor(() => {
                expect(queryByTestId('autocomplete.selector.channel_chip.channel-1')).toBeNull();
            });
        });
    });
});
