// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import {fireEvent, renderWithIntlAndTheme} from '@test/intl-test-helper';
import {tryOpenURL} from '@utils/url';

import CitationsList from './index';

import type {Annotation} from '@agents/types';

jest.mock('@utils/url', () => ({
    tryOpenURL: jest.fn(),
    getUrlDomain: jest.fn((url: string) => {
        try {
            return new URL(url).hostname;
        } catch {
            return url;
        }
    }),
}));

describe('CitationsList', () => {
    const createMockAnnotation = (overrides: Partial<Annotation> = {}): Annotation => ({
        type: 'url_citation',
        start_index: 0,
        end_index: 10,
        url: 'https://example.com/article',
        title: 'Example Article',
        index: 1,
        ...overrides,
    });

    const getBaseProps = (): ComponentProps<typeof CitationsList> => ({
        annotations: [createMockAnnotation()],
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('header rendering', () => {
        it('should render citation count in header', () => {
            const props = getBaseProps();
            props.annotations = [
                createMockAnnotation({index: 1}),
                createMockAnnotation({index: 2, url: 'https://other.com'}),
            ];
            const {getByText} = renderWithIntlAndTheme(<CitationsList {...props}/>);

            expect(getByText('Sources (2)')).toBeTruthy();
        });

        it('should render single citation count', () => {
            const props = getBaseProps();
            const {getByText} = renderWithIntlAndTheme(<CitationsList {...props}/>);

            expect(getByText('Sources (1)')).toBeTruthy();
        });
    });

    describe('expand/collapse', () => {
        it('should be collapsed by default', () => {
            const props = getBaseProps();
            const {queryByTestId} = renderWithIntlAndTheme(<CitationsList {...props}/>);

            // Citation items should not be visible when collapsed
            expect(queryByTestId('citations.list.item.1')).toBeNull();
        });

        it('should expand when toggle pressed', () => {
            const props = getBaseProps();
            const {getByTestId} = renderWithIntlAndTheme(<CitationsList {...props}/>);

            fireEvent.press(getByTestId('citations.list.toggle'));

            // Citation item should now be visible
            expect(getByTestId('citations.list.item.1')).toBeTruthy();
        });

        it('should collapse when toggle pressed again', () => {
            const props = getBaseProps();
            const {getByTestId, queryByTestId} = renderWithIntlAndTheme(<CitationsList {...props}/>);

            // Expand
            fireEvent.press(getByTestId('citations.list.toggle'));
            expect(getByTestId('citations.list.item.1')).toBeTruthy();

            // Collapse
            fireEvent.press(getByTestId('citations.list.toggle'));
            expect(queryByTestId('citations.list.item.1')).toBeNull();
        });
    });

    describe('citation items', () => {
        it('should render citation with title', () => {
            const props = getBaseProps();
            props.annotations = [
                createMockAnnotation({title: 'My Article Title'}),
            ];
            const {getByTestId, getByText} = renderWithIntlAndTheme(<CitationsList {...props}/>);

            fireEvent.press(getByTestId('citations.list.toggle'));
            expect(getByText('My Article Title')).toBeTruthy();
        });

        it('should render domain when no title provided', () => {
            const props = getBaseProps();
            props.annotations = [
                createMockAnnotation({title: '', url: 'https://docs.example.com/page'}),
            ];
            const {getByTestId, getAllByText} = renderWithIntlAndTheme(<CitationsList {...props}/>);

            fireEvent.press(getByTestId('citations.list.toggle'));

            // Domain appears twice - once as title fallback and once as URL below
            // This is expected behavior per the component design
            expect(getAllByText('docs.example.com').length).toBe(2);
        });

        it('should render domain URL below title', () => {
            const props = getBaseProps();
            props.annotations = [
                createMockAnnotation({url: 'https://api.example.org/docs'}),
            ];
            const {getByTestId, getByText} = renderWithIntlAndTheme(<CitationsList {...props}/>);

            fireEvent.press(getByTestId('citations.list.toggle'));
            expect(getByText('api.example.org')).toBeTruthy();
        });

        it('should render multiple citation items', () => {
            const props = getBaseProps();
            props.annotations = [
                createMockAnnotation({index: 1, title: 'First Article'}),
                createMockAnnotation({index: 2, title: 'Second Article', url: 'https://other.com'}),
                createMockAnnotation({index: 3, title: 'Third Article', url: 'https://third.com'}),
            ];
            const {getByTestId, getByText} = renderWithIntlAndTheme(<CitationsList {...props}/>);

            fireEvent.press(getByTestId('citations.list.toggle'));

            expect(getByText('First Article')).toBeTruthy();
            expect(getByText('Second Article')).toBeTruthy();
            expect(getByText('Third Article')).toBeTruthy();
        });
    });

    describe('URL handling', () => {
        it('should call tryOpenURL when citation pressed', () => {
            const props = getBaseProps();
            props.annotations = [
                createMockAnnotation({url: 'https://example.com/specific-page'}),
            ];
            const {getByTestId} = renderWithIntlAndTheme(<CitationsList {...props}/>);

            fireEvent.press(getByTestId('citations.list.toggle'));
            fireEvent.press(getByTestId('citations.list.item.1'));

            expect(tryOpenURL).toHaveBeenCalledWith('https://example.com/specific-page');
        });

        it('should not call tryOpenURL for empty URL', () => {
            const props = getBaseProps();
            props.annotations = [
                createMockAnnotation({url: ''}),
            ];
            const {getByTestId} = renderWithIntlAndTheme(<CitationsList {...props}/>);

            fireEvent.press(getByTestId('citations.list.toggle'));
            fireEvent.press(getByTestId('citations.list.item.1'));

            expect(tryOpenURL).not.toHaveBeenCalled();
        });
    });
});
