// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook} from '@testing-library/react-native';
import {URL} from 'react-native-url-polyfill';

import {useExternalLink} from './use_external_link';

const baseCurrentUserId = 'someUserId';
const baseTelemetryId = 'someTelemetryId';

function getBaseProps(): Parameters<typeof useExternalLink>[0] {
    return {
        userId: baseCurrentUserId,
        isCloud: true,
        telemetryId: baseTelemetryId,
    };
}

describe('useExternalLink', () => {
    it('keep non mattermost links untouched', () => {
        const url = 'https://www.someLink.com/something?query1=2#anchor';
        const {result: {current: [href, queryParams]}} = renderHook(() => useExternalLink(getBaseProps(), url, 'some location', {utm_source: 'something'}));
        expect(href).toEqual(url);
        expect(queryParams).toEqual({});
    });

    it('all base queries are set correctly', () => {
        const url = 'https://www.mattermost.com/some/url';
        const {result: {current: [href, queryParams]}} = renderHook(() => useExternalLink(getBaseProps(), url));
        const parsedLink = new URL(href);
        expect(parsedLink.searchParams.get('utm_source')).toBe('mattermost');
        expect(parsedLink.searchParams.get('utm_medium')).toBe('in-product-cloud');
        expect(parsedLink.searchParams.get('utm_content')).toBe('');
        expect(parsedLink.searchParams.get('uid')).toBe(baseCurrentUserId);
        expect(parsedLink.searchParams.get('sid')).toBe(baseTelemetryId);
        expect(queryParams.utm_source).toBe('mattermost');
        expect(queryParams.utm_medium).toBe('in-product-cloud');
        expect(queryParams.utm_content).toBe('');
        expect(queryParams.uid).toBe(baseCurrentUserId);
        expect(queryParams.sid).toBe(baseTelemetryId);
        expect(href.split('?')[0]).toBe(url);
    });

    it('provided location is added to the params', () => {
        const url = 'https://www.mattermost.com/some/url';
        const location = 'someLocation';
        const {result: {current: [href, queryParams]}} = renderHook(() => useExternalLink(getBaseProps(), url, location));
        const parsedLink = new URL(href);
        expect(parsedLink.searchParams.get('utm_content')).toBe(location);
        expect(queryParams.utm_content).toBe(location);
    });

    it('non cloud environments set the proper utm medium', () => {
        const url = 'https://www.mattermost.com/some/url';
        const stateProps = getBaseProps();
        stateProps.isCloud = false;
        const {result: {current: [href, queryParams]}} = renderHook(() => useExternalLink(stateProps, url));
        const parsedLink = new URL(href);
        expect(parsedLink.searchParams.get('utm_medium')).toBe('in-product');
        expect(queryParams.utm_medium).toBe('in-product');
    });

    it('keep existing query parameters untouched', () => {
        const url = 'https://www.mattermost.com/some/url?myParameter=true';
        const {result: {current: [href, queryParams]}} = renderHook(() => useExternalLink(getBaseProps(), url));
        const parsedLink = new URL(href);
        expect(parsedLink.searchParams.get('myParameter')).toBe('true');
        expect(queryParams.myParameter).toBe('true');
    });

    it('keep anchors untouched', () => {
        const url = 'https://www.mattermost.com/some/url?myParameter=true#myAnchor';
        const {result: {current: [href]}} = renderHook(() => useExternalLink(getBaseProps(), url));
        const parsedLink = new URL(href);
        expect(parsedLink.hash).toBe('#myAnchor');
    });

    it('overwriting params gets preference over default params', () => {
        const url = 'https://www.mattermost.com/some/url';
        const location = 'someLocation';
        const expectedContent = 'someOtherLocation';
        const expectedSource = 'someOtherSource';
        const {result: {current: [href, queryParams]}} = renderHook(() => useExternalLink(getBaseProps(), url, location, {utm_content: expectedContent, utm_source: expectedSource}));
        const parsedLink = new URL(href);
        expect(parsedLink.searchParams.get('utm_content')).toBe(expectedContent);
        expect(queryParams.utm_content).toBe(expectedContent);
        expect(parsedLink.searchParams.get('utm_source')).toBe(expectedSource);
        expect(queryParams.utm_source).toBe(expectedSource);
    });

    it('existing params gets preference over default and overwritten params', () => {
        const location = 'someLocation';
        const overwrittenContent = 'someOtherLocation';
        const overwrittenSource = 'someOtherSource';
        const expectedContent = 'differentLocation';
        const expectedSource = 'differentSource';
        const url = `https://www.mattermost.com/some/url?utm_content=${expectedContent}&utm_source=${expectedSource}`;

        const {result: {current: [href, queryParams]}} = renderHook(() => useExternalLink(getBaseProps(), url, location, {utm_content: overwrittenContent, utm_source: overwrittenSource}));
        const parsedLink = new URL(href);
        expect(parsedLink.searchParams.get('utm_content')).toBe(expectedContent);
        expect(queryParams.utm_content).toBe(expectedContent);
        expect(parsedLink.searchParams.get('utm_source')).toBe(expectedSource);
        expect(queryParams.utm_source).toBe(expectedSource);
    });

    it('results are stable between re-renders', () => {
        const url = 'https://www.mattermost.com/some/url';
        const overwriteQueryParams = {utm_content: 'overwrittenContent', utm_source: 'overwrittenSource'};

        const {result, rerender} = renderHook(() => useExternalLink(getBaseProps(), url, 'someLocation', overwriteQueryParams));
        const [firstHref, firstParams] = result.current;
        rerender(undefined);
        const [secondHref, secondParams] = result.current;
        expect(firstHref).toBe(secondHref);
        expect(firstParams).toBe(secondParams);
    });
});
