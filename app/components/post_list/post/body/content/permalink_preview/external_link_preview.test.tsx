// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import * as UrlUtils from '@utils/url';

import ExternalLinkPreview from './external_link_preview';

describe('components/post_list/post/body/content/permalink_preview/ExternalLinkPreview', () => {
    const mockTryOpenURL = jest.spyOn(UrlUtils, 'tryOpenURL').mockImplementation(() => {});

    beforeEach(() => {
        mockTryOpenURL.mockClear();
    });

    it('should not render when no embeds are provided', () => {
        const {queryByTestId} = renderWithIntlAndTheme(
            <ExternalLinkPreview embeds={undefined}/>,
        );

        expect(queryByTestId('external-link-preview')).toBeNull();
    });

    it('should not render when embeds array is empty', () => {
        const {queryByTestId} = renderWithIntlAndTheme(
            <ExternalLinkPreview embeds={[]}/>,
        );

        expect(queryByTestId('external-link-preview')).toBeNull();
    });

    it('should not render when no opengraph embed is present', () => {
        const embeds = [{
            type: 'image' as PostEmbedType,
            url: 'https://example.com/image.jpg',
            data: {},
        }];

        const {queryByTestId} = renderWithIntlAndTheme(
            <ExternalLinkPreview embeds={embeds}/>,
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

        const {getByTestId, getByText} = renderWithIntlAndTheme(
            <ExternalLinkPreview embeds={embeds}/>,
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

        const {getByText} = renderWithIntlAndTheme(
            <ExternalLinkPreview embeds={embeds}/>,
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

        const {getByText, queryByText} = renderWithIntlAndTheme(
            <ExternalLinkPreview embeds={embeds}/>,
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

        const {getByText} = renderWithIntlAndTheme(
            <ExternalLinkPreview embeds={embeds}/>,
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

        const {getByText} = renderWithIntlAndTheme(
            <ExternalLinkPreview embeds={embeds}/>,
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
            },
        }];

        const {getByTestId} = renderWithIntlAndTheme(
            <ExternalLinkPreview embeds={embeds}/>,
        );

        const linkContainer = getByTestId('external-link-preview');
        fireEvent.press(linkContainer);

        expect(mockTryOpenURL).toHaveBeenCalledWith('https://example.com', expect.any(Function));
    });

    it('should use custom testID when provided', () => {
        const embeds = [{
            type: 'opengraph' as PostEmbedType,
            url: 'https://example.com',
            data: {
                title: 'Example Website',
            },
        }];

        const {getByTestId, queryByTestId} = renderWithIntlAndTheme(
            <ExternalLinkPreview
                embeds={embeds}
                testID='custom-test-id'
            />,
        );

        expect(getByTestId('custom-test-id')).toBeTruthy();
        expect(queryByTestId('external-link-preview')).toBeNull();
    });
});
