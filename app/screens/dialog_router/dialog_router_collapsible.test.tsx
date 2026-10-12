// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// End-to-end cover for collapsible dialogs: the payload the demo plugin's
// `/dialog collapsible` sample sends goes through the real adapter, conversion
// and form, and the test asserts what the server receives back. Only the
// network call is mocked.

import {act, fireEvent} from '@testing-library/react-native';
import React from 'react';

import DatabaseManager from '@database/manager';
import {renderWithEverything} from '@test/intl-test-helper';

import {DialogRouter} from './dialog_router';

import type {Database} from '@nozbe/watermelondb';

jest.mock('@actions/remote/integrations', () => ({
    submitInteractiveDialog: jest.fn(),
    lookupInteractiveDialog: jest.fn(),
}));

jest.mock('@screens/navigation', () => ({
    navigateBack: jest.fn(),
}));

jest.mock('@actions/remote/command', () => ({
    handleGotoLocation: jest.fn(),
}));

const mockSetOptions = jest.fn();
jest.mock('expo-router', () => ({
    useNavigation: jest.fn(() => ({
        setOptions: mockSetOptions,
        addListener: jest.fn(() => jest.fn()),
    })),
}));

const {submitInteractiveDialog} = require('@actions/remote/integrations');

const serverUrl = 'http://localhost:8065';

// Transcribed from getDialogWithCollapsibleElements in the demo plugin
// (server/dialog_samples.go): three sections, nested one, two and three deep.
const text = (name: string, displayName: string, overrides: Partial<DialogElement> = {}): DialogElement => ({
    name,
    display_name: displayName,
    type: 'text',
    optional: false,
    default: '',
    placeholder: '',
    help_text: '',
    min_length: 0,
    max_length: 0,
    data_source: '',
    options: [],
    ...overrides,
}) as DialogElement;

const section = (name: string, displayName: string, elements: DialogElement[], config: Partial<DialogCollapsibleConfig> = {}): DialogElement => ({
    ...text(name, displayName),
    type: 'collapsible',
    collapsible_config: {elements, ...config},
}) as DialogElement;

const collapsibleDemoConfig: InteractiveDialogConfig = {
    app_id: 'com.mattermost.demo-plugin',
    trigger_id: 'trigger',
    url: 'http://localhost:8065/plugins/com.mattermost.demo-plugin/dialog/1',
    dialog: {
        callback_id: 'collapsiblecallbackid',
        title: 'Collapsible Sections Demo',
        introduction_text: '**Collapsible Sections Demo**',
        elements: [
            section('level1_section', 'Level 1 — Flat section', [
                text('first_name', 'First Name'),
                text('last_name', 'Last Name'),
            ]),
            section('level2_section', 'Level 2 — One level of nesting (no border)', [
                text('company', 'Company', {optional: true}),
                section('level2_inner_section', 'Contact Details', [
                    text('email', 'Email', {subtype: 'email'}),
                    text('phone', 'Phone', {optional: true}),
                ], {borderless: true}),
            ], {collapsed: true, borderless: true}),
            section('level3_section', 'Level 3 — Two levels of nesting', [
                text('project_name', 'Project Name', {optional: true}),
                section('level3_inner_section', 'Advanced', [
                    text('environment', 'Environment', {optional: true}),
                    section('level3_innermost_section', 'Experimental', [
                        text('custom_settings', 'Custom Settings', {type: 'textarea', optional: true, max_length: 500}),
                        text('enable_beta', 'Enable Beta Features', {type: 'bool', optional: true}),
                    ]),
                ], {collapsed: true}),
            ], {collapsed: true}),
        ],
        submit_label: 'Submit',
        notify_on_cancel: true,
        state: 'somestate',
    },
} as InteractiveDialogConfig;

function headerSubmit() {
    const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1];
    return lastCall?.[0]?.headerRight?.();
}

describe('DialogRouter with collapsible sections', () => {
    let database: Database;

    beforeEach(async () => {
        jest.clearAllMocks();
        submitInteractiveDialog.mockResolvedValue({data: {}});
        await DatabaseManager.init([serverUrl]);
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    const renderDialog = () => renderWithEverything(
        <DialogRouter
            config={collapsibleDemoConfig}
            channelId='channel-id'
        />,
        {database, serverUrl},
    );

    it('renders every section, with only the expanded one mounting its fields', () => {
        const {getByText, getByTestId, queryByTestId} = renderDialog();

        expect(getByText('Level 1 — Flat section')).toBeTruthy();
        expect(getByText('Level 2 — One level of nesting (no border)')).toBeTruthy();
        expect(getByText('Level 3 — Two levels of nesting')).toBeTruthy();

        // Level 1 is expanded by default, the other two start collapsed.
        expect(getByTestId('AppFormElement.first_name')).toBeTruthy();
        expect(getByTestId('AppFormElement.last_name')).toBeTruthy();
        expect(queryByTestId('AppFormElement.company')).toBeNull();
        expect(queryByTestId('AppFormElement.project_name')).toBeNull();
    });

    it('opens nested sections three levels deep', () => {
        const {getByTestId, getByText, queryByTestId} = renderDialog();

        fireEvent.press(getByTestId('interactive_dialog.collapsible.level3_section.toggle'));
        expect(getByTestId('AppFormElement.project_name')).toBeTruthy();
        expect(queryByTestId('AppFormElement.environment')).toBeNull();

        fireEvent.press(getByTestId('interactive_dialog.collapsible.level3_inner_section.toggle'));
        expect(getByTestId('AppFormElement.environment')).toBeTruthy();

        // The innermost section defaults to expanded, so its fields come with it.
        expect(getByTestId('AppFormElement.custom_settings')).toBeTruthy();
        expect(getByText('Enable Beta Features')).toBeTruthy();
    });

    it('submits nested values flat, keyed by element name', async () => {
        const {getByTestId} = renderDialog();

        fireEvent.changeText(getByTestId('AppFormElement.first_name.input'), 'Ada');
        fireEvent.changeText(getByTestId('AppFormElement.last_name.input'), 'Lovelace');

        // A value typed into a section that is then closed still submits.
        fireEvent.press(getByTestId('interactive_dialog.collapsible.level2_section.toggle'));
        fireEvent.changeText(getByTestId('AppFormElement.email.input'), 'ada@example.com');
        fireEvent.press(getByTestId('interactive_dialog.collapsible.level2_section.toggle'));

        await act(async () => {
            headerSubmit().props.onPress();
        });

        expect(submitInteractiveDialog).toHaveBeenCalledTimes(1);
        const [calledServerUrl, submission] = submitInteractiveDialog.mock.calls[0];

        expect(calledServerUrl).toBe(serverUrl);
        expect(submission.callback_id).toBe('collapsiblecallbackid');
        expect(submission.state).toBe('somestate');
        expect(submission.submission).toMatchObject({
            first_name: 'Ada',
            last_name: 'Lovelace',
            email: 'ada@example.com',
        });

        // Containers are not fields: they must not appear in the submission.
        expect(submission.submission.level1_section).toBeUndefined();
        expect(submission.submission.level2_section).toBeUndefined();
        expect(submission.submission.level2_inner_section).toBeUndefined();
    });

    it('blocks submission when a required field inside a section is empty', async () => {
        const {getByTestId} = renderDialog();

        fireEvent.changeText(getByTestId('AppFormElement.first_name.input'), 'Ada');

        await act(async () => {
            headerSubmit().props.onPress();
        });

        // last_name and email are required and still empty.
        expect(submitInteractiveDialog).not.toHaveBeenCalled();
    });
});
