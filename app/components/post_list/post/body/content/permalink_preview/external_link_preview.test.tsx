// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React from 'react';

import DatabaseManager from '@database/manager';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';
import * as UrlLinks from '@utils/url/links';

import ExternalLinkPreview from './external_link_preview';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

describe('components/post_list/post/body/content/permalink_preview/ExternalLinkPreview', () => {
    const serverUrl = 'http://localhost:8065';
    let database: Database;
    let operator: ServerDataOperator;
    const mockOpenLink = jest.spyOn(UrlLinks, 'openLink').mockImplementation(() => Promise.resolve());

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;

        // Add a current user
        const currentUser = TestHelper.fakeUser({id: 'current-user', locale: 'en'});
        await operator.handleUsers({users: [currentUser], prepareRecordsOnly: false});
        await operator.handleSystem({
            systems: [{id: 'currentUserId', value: currentUser.id}],
            prepareRecordsOnly: false,
        });
        mockOpenLink.mockClear();
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should not render when no embeds are provided', () => {
        const {queryByTestId} = renderWithEverything(
            <ExternalLinkPreview embeds={undefined}/>,
            {database, serverUrl},
        );

        expect(queryByTestId('external-link-preview')).toBeNull();
    });

    it('should not render when embeds array is empty', () => {
        const {queryByTestId} = renderWithEverything(
            <ExternalLinkPreview embeds={[]}/>,
            {database, serverUrl},
        );

        expect(queryByTestId('external-link-preview')).toBeNull();
    });

    it('should not render when no opengraph embed is present', () => {
        const embeds = [{
            type: 'image' as PostEmbedType,
            url: 'https://example.com/image.jpg',
            data: {},
        }];

        const {queryByTestId} = renderWithEverything(
            <ExternalLinkPreview embeds={embeds}/>,
            {database, serverUrl},
        );

        expect(queryByTestId('external-link-preview')).toBeNull();
    });

    it('should render external link when opengraph embed is present', () => {
        const embeds = [{
            type: 'opengraph' as PostEmbedType,
            url: 'https://example.com',
            data: {
                title: 'Example Website',
                description: 'This is an example website',
                site_name: 'Example',
            },
        }];

        const {getByTestId, getByText} = renderWithEverything(
            <ExternalLinkPreview embeds={embeds}/>,
            {database, serverUrl},
        );

        expect(getByTestId('external-link-preview')).toBeTruthy();
        expect(getByText('Example Website')).toBeTruthy();
        expect(getByText('This is an example website')).toBeTruthy();
    });

    it('should show fallback text when link data is incomplete', () => {
        const embeds = [{
            type: 'opengraph' as PostEmbedType,
            url: 'https://example.com',
            data: {},
        }];

        const {getByText} = renderWithEverything(
            <ExternalLinkPreview embeds={embeds}/>,
            {database, serverUrl},
        );

        expect(getByText('External Link')).toBeTruthy();
        expect(getByText('https://example.com')).toBeTruthy();
    });

    it('should prioritize title over site_name', () => {
        const embeds = [{
            type: 'opengraph' as PostEmbedType,
            url: 'https://example.com',
            data: {
                title: 'Page Title',
                site_name: 'Site Name',
                description: 'Description text',
            },
        }];

        const {getByText, queryByText} = renderWithEverything(
            <ExternalLinkPreview embeds={embeds}/>,
            {database, serverUrl},
        );

        expect(getByText('Page Title')).toBeTruthy();
        expect(queryByText('Site Name')).toBeNull();
        expect(getByText('Description text')).toBeTruthy();
    });

    it('should use site_name when title is not available', () => {
        const embeds = [{
            type: 'opengraph' as PostEmbedType,
            url: 'https://example.com',
            data: {
                site_name: 'Site Name',
                description: 'Description text',
            },
        }];

        const {getByText} = renderWithEverything(
            <ExternalLinkPreview embeds={embeds}/>,
            {database, serverUrl},
        );

        expect(getByText('Site Name')).toBeTruthy();
        expect(getByText('Description text')).toBeTruthy();
    });

    it('should show URL when description is not available', () => {
        const embeds = [{
            type: 'opengraph' as PostEmbedType,
            url: 'https://example.com',
            data: {
                title: 'Page Title',
            },
        }];

        const {getByText} = renderWithEverything(
            <ExternalLinkPreview embeds={embeds}/>,
            {database, serverUrl},
        );

        expect(getByText('Page Title')).toBeTruthy();
        expect(getByText('https://example.com')).toBeTruthy();
    });

    it('should handle press event and open URL', () => {
        const embeds = [{
            type: 'opengraph' as PostEmbedType,
            url: 'https://example.com',
            data: {
                title: 'Example Website',
                description: 'Example description',
            },
        }];

        const {getByTestId} = renderWithEverything(
            <ExternalLinkPreview embeds={embeds}/>,
            {database, serverUrl},
        );

        const linkContainer = getByTestId('external-link-preview');
        fireEvent.press(linkContainer);

        expect(mockOpenLink).toHaveBeenCalledWith('https://example.com', 'http://localhost:8065', '', expect.any(Object));
    });

    it('should use custom testID when provided', () => {
        const embeds = [{
            type: 'opengraph' as PostEmbedType,
            url: 'https://example.com',
            data: {
                title: 'Example Website',
            },
        }];

        const {getByTestId, queryByTestId} = renderWithEverything(
            <ExternalLinkPreview
                embeds={embeds}
                testID='custom-test-id'
            />,
            {database, serverUrl},
        );

        expect(getByTestId('custom-test-id')).toBeTruthy();
        expect(queryByTestId('external-link-preview')).toBeNull();
    });
});
