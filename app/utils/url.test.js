// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as UrlUtils from 'app/utils/url';

/* eslint-disable max-nested-callbacks */

describe('UrlUtils', () => {
    describe('isImageLink', () => {
        it('not an image link', () => {
            const link = 'https://mattermost.com/index.html';
            expect(UrlUtils.isImageLink(link)).toEqual(false);
        });

        it('a png link', () => {
            const link = 'https://mattermost.com/image.png';
            expect(UrlUtils.isImageLink(link)).toEqual(true);
        });

        it('a jpg link', () => {
            const link = 'https://mattermost.com/assets/image.jpeg';
            expect(UrlUtils.isImageLink(link)).toEqual(true);
        });

        it('a jpeg link', () => {
            const link = 'https://mattermost.com/logo.jpeg';
            expect(UrlUtils.isImageLink(link)).toEqual(true);
        });

        it('a bmp link', () => {
            const link = 'https://images.mattermost.com/foo/bar/asdf.bmp';
            expect(UrlUtils.isImageLink(link)).toEqual(true);
        });

        it('a gif link', () => {
            const link = 'https://mattermost.com/jif.gif';
            expect(UrlUtils.isImageLink(link)).toEqual(true);
        });

        it('a link with a query parameter', () => {
            const link = 'https://mattermost.com/image.png?hash=foobar';
            expect(UrlUtils.isImageLink(link)).toEqual(true);
        });
    });

    describe('getYouTubeVideoId', () => {
        const tests = [
            ['https://youtu.be/zrFWrmPgfzc', 'zrFWrmPgfzc'],
            ['https://youtu.be/zrFWrmPgfzc?t=10s', 'zrFWrmPgfzc'],
            ['https://www.youtube.com/watch?v=zrFWrmPgfzc&feature=youtu.be', 'zrFWrmPgfzc'],
            ['https://www.youtube.com/watch?v=zrFWrmPgfzc&t=10s', 'zrFWrmPgfzc'],
            ['https://www.youtube.com/watch?t=10s&v=zrFWrmPgfzc', 'zrFWrmPgfzc'],
        ];

        for (const test of tests) {
            const input = test[0];
            const expected = test[1];

            it(input, () => {
                expect(UrlUtils.getYouTubeVideoId(input)).toEqual(expected);
            });
        }
    });

    describe('stripTrailingSlashes', () => {
        it('should return the same url', () => {
            const url = 'https://www.youtube.com/watch?v=zrFWrmPgfzc&feature=youtu.be';
            expect(UrlUtils.stripTrailingSlashes(url)).toEqual(url);
        });

        it('should return an url without the initial //', () => {
            const url = '//www.youtube.com/watch?v=zrFWrmPgfzc&feature=youtu.be';
            const expected = 'www.youtube.com/watch?v=zrFWrmPgfzc&feature=youtu.be';
            expect(UrlUtils.stripTrailingSlashes(url)).toEqual(expected);
        });

        it('should return an url without the initial // and the lasts ////', () => {
            const url = '//www.youtube.com/watch?v=zrFWrmPgfzc&feature=youtu.be////';
            const expected = 'www.youtube.com/watch?v=zrFWrmPgfzc&feature=youtu.be';
            expect(UrlUtils.stripTrailingSlashes(url)).toEqual(expected);
        });

        it('should return an url without the initial // and the lasts //// or spaces', () => {
            const url = 'https: //www .y o u t u be .co m/watch   ?v=z r FW r mP gf zc& fe atu r e = you  tu .be////';
            const expected = 'https://www.youtube.com/watch?v=zrFWrmPgfzc&feature=youtu.be';
            expect(UrlUtils.stripTrailingSlashes(url)).toEqual(expected);
        });
    });

    describe('matchDeepLink', () => {
        const SITE_URL = 'http://localhost:8065';
        const SERVER_URL = 'http://localhost:8065';
        const tests = [
            {name: 'should return null if all inputs are empty', input: {url: '', serverURL: '', siteURL: ''}, expected: null},
            {name: 'should return null if any of the input is null', input: {url: '', serverURL: '', siteURL: null}, expected: null},
            {name: 'should return null if any of the input is null', input: {url: '', serverURL: null, siteURL: ''}, expected: null},
            {name: 'should return null if any of the input is null', input: {url: null, serverURL: '', siteURL: ''}, expected: null},
            {name: 'should return null for not supported link', input: {url: 'https://mattermost.com', serverURL: SERVER_URL, siteURL: SITE_URL}, expected: null},
            {name: 'should match channel link', input: {url: SITE_URL + '/ad-1/channels/town-square', serverURL: SERVER_URL, siteURL: SITE_URL}, expected: {channelName: 'town-square', teamName: 'ad-1', type: 'channel'}},
            {name: 'should match permalink', input: {url: SITE_URL + '/ad-1/pl/qe93kkfd7783iqwuwfcwcxbsgy', serverURL: SERVER_URL, siteURL: SITE_URL}, expected: {postId: 'qe93kkfd7783iqwuwfcwcxbsgy', teamName: 'ad-1', type: 'permalink'}},
        ];

        for (const test of tests) {
            const {name, input, expected} = test;

            it(name, () => {
                expect(UrlUtils.matchDeepLink(input.url, input.serverURL, input.siteURL)).toEqual(expected);
            });
        }
    });
});
