// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Linking} from 'react-native';

import DeepLinkType from '@constants/deep_linking';
import TestHelper from '@test/test_helper';
import {matchDeepLink} from '@utils/deep_link';
import * as UrlUtils from '@utils/url';

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
            [
                'https://www.youtube.com/watch?v=zrFWrmPgfzc&feature=youtu.be',
                'zrFWrmPgfzc',
            ],
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
            const url =
        'https://www.youtube.com/watch?v=zrFWrmPgfzc&feature=youtu.be';
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
            const url =
        'https: //www .y o u t u be .co m/watch   ?v=z r FW r mP gf zc& fe atu r e = you  tu .be////';
            const expected =
        'https://www.youtube.com/watch?v=zrFWrmPgfzc&feature=youtu.be';
            expect(UrlUtils.stripTrailingSlashes(url)).toEqual(expected);
        });
    });

    describe('removeProtocol', () => {
        const tests = [
            {
                name: 'should return url without http protocol prefix',
                url: 'http://localhost:8065',
                expected: 'localhost:8065',
            },
            {
                name: 'should return url without https protocol prefix',
                url: 'https://localhost:8065',
                expected: 'localhost:8065',
            },
            {name: 'should return null', url: '', expected: ''},
            {
                name: 'should return url without arbitrary protocol prefix',
                url: 'udp://localhost:8065',
                expected: 'localhost:8065',
            },
        ];

        for (const test of tests) {
            const {name, url, expected} = test;

            it(name, () => {
                expect(UrlUtils.removeProtocol(url)).toEqual(expected);
            });
        }
    });

    describe('matchDeepLink', () => {
        const URL_NO_PROTOCOL = 'localhost:8065';
        const URL_PATH_NO_PROTOCOL = 'localhost:8065/subpath/deepsubpath';
        const SITE_URL = `http://${URL_NO_PROTOCOL}`;
        const SERVER_URL = `http://${URL_NO_PROTOCOL}`;
        const SERVER_WITH_SUBPATH = `http://${URL_PATH_NO_PROTOCOL}`;
        const DEEPLINK_URL_ROOT = `mattermost://${URL_NO_PROTOCOL}`;

        const DM_USER = TestHelper.fakeUser();
        const GM_CHANNEL_NAME = '4862db64e76a321d167fe6677f16e96e9275dabe';

        const tests = [
            {
                name: 'should return null if all inputs are empty',
                input: {url: '', serverURL: '', siteURL: ''},
                expected: null,
            },
            {
                name: 'should return null if any of the input is null',
                input: {url: '', serverURL: '', siteURL: null},
                expected: null,
            },
            {
                name: 'should return null if any of the input is null',
                input: {url: '', serverURL: null, siteURL: ''},
                expected: null,
            },
            {
                name: 'should return null if any of the input is null',
                input: {url: null, serverURL: '', siteURL: ''},
                expected: null,
            },
            {
                name: 'should return null for not supported link',
                input: {
                    url: 'https://otherserver.com',
                    serverURL: SERVER_URL,
                    siteURL: SITE_URL,
                },
                expected: null,
            },
            {
                name: 'should return null despite url subset match',
                input: {url: 'http://myserver.com', serverURL: 'http://myserver.co'},
                expected: null,
            },
            {
                name: 'should match despite no server URL in input link',
                input: {
                    url: '/ad-1/pl/qe93kkfd7783iqwuwfcwcxbsgy',
                    serverURL: SERVER_URL,
                    siteURL: SITE_URL,
                },
                expected: {
                    data: {
                        postId: 'qe93kkfd7783iqwuwfcwcxbsgy',
                        serverUrl: URL_NO_PROTOCOL,
                        teamName: 'ad-1',
                    },
                    type: DeepLinkType.Permalink,
                },
            },
            {
                name: 'should return null for invalid deeplink',
                input: {
                    url: DEEPLINK_URL_ROOT + '/ad-1/channels/../town-square',
                    serverURL: SERVER_URL,
                    siteURL: SITE_URL,
                },
                expected: null,
            },
            {
                name: 'should return null for backslash-invalid deeplink',
                input: {
                    url: DEEPLINK_URL_ROOT + '/ad-1/channels/\\..town-square',
                    serverURL: SERVER_URL,
                    siteURL: SITE_URL,
                },
                expected: null,
            },
            {
                name: 'should return null for backslash-invalid-alt deeplink',
                input: {
                    url: DEEPLINK_URL_ROOT + '/ad-1/channels/t..\\town-square',
                    serverURL: SERVER_URL,
                    siteURL: SITE_URL,
                },
                expected: null,
            },
            {
                name: 'should return null for double encoded invalid deeplink',
                input: {
                    url: DEEPLINK_URL_ROOT + '/ad-1/channels/%252f%252e.town-square',
                    serverURL: SERVER_URL,
                    siteURL: SITE_URL,
                },
                expected: null,
            },
            {
                name: 'should return null for double encoded backslash-invalid deeplink',
                input: {
                    url: DEEPLINK_URL_ROOT + '/ad-1/channels/%255C%252e.town-square',
                    serverURL: SERVER_URL,
                    siteURL: SITE_URL,
                },
                expected: null,
            },
            {
                name: 'should match channel link',
                input: {
                    url: SITE_URL + '/ad-1/channels/town-square',
                    serverURL: SERVER_URL,
                    siteURL: SITE_URL,
                },
                expected: {
                    data: {
                        channelName: 'town-square',
                        serverUrl: URL_NO_PROTOCOL,
                        teamName: 'ad-1',
                    },
                    type: DeepLinkType.Channel,
                },
            },
            {
                name: 'should match permalink',
                input: {
                    url: SITE_URL + '/ad-1/pl/qe93kkfd7783iqwuwfcwcxbsgy',
                    serverURL: SERVER_URL,
                    siteURL: SITE_URL,
                },
                expected: {
                    data: {
                        postId: 'qe93kkfd7783iqwuwfcwcxbsgy',
                        serverUrl: URL_NO_PROTOCOL,
                        teamName: 'ad-1',
                    },
                    type: DeepLinkType.Permalink,
                },
            },
            {
                name: 'should match channel link with deeplink prefix',
                input: {
                    url: DEEPLINK_URL_ROOT + '/ad-1/channels/town-square',
                    serverURL: SERVER_URL,
                    siteURL: SITE_URL,
                },
                expected: {
                    data: {
                        channelName: 'town-square',
                        serverUrl: URL_NO_PROTOCOL,
                        teamName: 'ad-1',
                    },
                    type: DeepLinkType.Channel,
                },
            },
            {
                name: 'should match channel link (channel name: messages) with deeplink prefix',
                input: {
                    url: DEEPLINK_URL_ROOT + '/ad-1/channels/messages',
                    serverURL: SERVER_URL,
                    siteURL: SITE_URL,
                },
                expected: {
                    data: {
                        channelName: 'messages',
                        serverUrl: URL_NO_PROTOCOL,
                        teamName: 'ad-1',
                    },
                    type: DeepLinkType.Channel,
                },
            },
            {
                name: 'should match DM channel link with deeplink prefix',
                input: {
                    url: DEEPLINK_URL_ROOT + `/pl/messages/@${DM_USER.username}`,
                    serverURL: SERVER_URL,
                    siteURL: SITE_URL,
                },
                expected: {
                    data: {
                        userName: DM_USER.username,
                        serverUrl: URL_NO_PROTOCOL,
                        teamName: 'pl',
                    },
                    type: DeepLinkType.DirectMessage,
                },
            },
            {
                name: 'should match GM channel link with deeplink prefix',
                input: {
                    url: DEEPLINK_URL_ROOT + `/pl/messages/${GM_CHANNEL_NAME}`,
                    serverURL: SERVER_URL,
                    siteURL: SITE_URL,
                },
                expected: {
                    data: {
                        channelName: GM_CHANNEL_NAME,
                        serverUrl: URL_NO_PROTOCOL,
                        teamName: 'pl',
                    },
                    type: DeepLinkType.GroupMessage,
                },
            },
            {
                name: 'should match channel link (team name: pl, channel name: messages) with deeplink prefix',
                input: {
                    url: DEEPLINK_URL_ROOT + '/pl/channels/messages',
                    serverURL: SERVER_URL,
                    siteURL: SITE_URL,
                },
                expected: {
                    data: {
                        channelName: 'messages',
                        serverUrl: URL_NO_PROTOCOL,
                        teamName: 'pl',
                    },
                    type: DeepLinkType.Channel,
                },
            },
            {
                name: 'should match permalink with deeplink prefix on a Server hosted in a Subpath',
                input: {
                    url: DEEPLINK_URL_ROOT + '/subpath/deepsubpath/ad-1/pl/qe93kkfd7783iqwuwfcwcxbsrr',
                    serverURL: SERVER_WITH_SUBPATH,
                    siteURL: SERVER_WITH_SUBPATH,
                },
                expected: {
                    data: {
                        postId: 'qe93kkfd7783iqwuwfcwcxbsrr',
                        serverUrl: URL_PATH_NO_PROTOCOL,
                        teamName: 'ad-1',
                    },
                    type: DeepLinkType.Permalink,
                },
            },
            {
                name: 'should match permalink (team name: pl) with deeplink prefix on a Server hosted in a Subpath',
                input: {
                    url: DEEPLINK_URL_ROOT + '/subpath/deepsubpath/pl/pl/qe93kkfd7783iqwuwfcwcxbsrr',
                    serverURL: SERVER_WITH_SUBPATH,
                    siteURL: SERVER_WITH_SUBPATH,
                },
                expected: {
                    data: {
                        postId: 'qe93kkfd7783iqwuwfcwcxbsrr',
                        serverUrl: URL_PATH_NO_PROTOCOL,
                        teamName: 'pl',
                    },
                    type: DeepLinkType.Permalink,
                },
            },
            {
                name: 'should match permalink on a Server hosted in a Subpath',
                input: {
                    url: SERVER_WITH_SUBPATH + '/ad-1/pl/qe93kkfd7783iqwuwfcwcxbsrr',
                    serverURL: SERVER_WITH_SUBPATH,
                    siteURL: SERVER_WITH_SUBPATH,
                },
                expected: {
                    data: {
                        postId: 'qe93kkfd7783iqwuwfcwcxbsrr',
                        serverUrl: URL_PATH_NO_PROTOCOL,
                        teamName: 'ad-1',
                    },
                    type: DeepLinkType.Permalink,
                },
            },
            {
                name: 'should not match url',
                input: {
                    url: 'https://github.com/mattermost/mattermost-mobile/issues/new',
                    serverURL: SERVER_WITH_SUBPATH,
                    siteURL: SERVER_WITH_SUBPATH,
                },
                expected: null,
            },
            {
                name: 'should not match plugin path',
                input: {
                    url: DEEPLINK_URL_ROOT + '/subpath/deepsubpath/plugins/abc/api/testroute',
                    serverURL: SERVER_WITH_SUBPATH,
                    siteURL: SERVER_WITH_SUBPATH,
                },
                expected: null,
            },
        ];

        for (const test of tests) {
            const {name, input, expected} = test;

            it(name, () => {
                const matched = matchDeepLink(input.url!, input.serverURL!, input.siteURL!);
                if (matched) {
                    Reflect.deleteProperty(matched, 'url');
                }
                expect(matched).toEqual(expected);
            });
        }
    });

    describe('tryOpenUrl', () => {
        const url = 'https://some.url.com';

        it('should call onSuccess when Linking.openURL succeeds', async () => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            Linking.openURL.mockResolvedValueOnce();
            const onError = jest.fn();
            const onSuccess = jest.fn();

            UrlUtils.tryOpenURL(url, onError, onSuccess);
            await TestHelper.wait(100);
            expect(onError).not.toHaveBeenCalled();
            expect(onSuccess).toHaveBeenCalledTimes(1);
        });

        it('should call onError when Linking.openURL fails', async () => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            Linking.openURL.mockRejectedValueOnce();
            const onError = jest.fn();
            const onSuccess = jest.fn();

            UrlUtils.tryOpenURL(url, onError, onSuccess);
            await TestHelper.wait(200);
            expect(onError).toHaveBeenCalledTimes(1);
            expect(onSuccess).not.toHaveBeenCalled();
        });
    });
});
