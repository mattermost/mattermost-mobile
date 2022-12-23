// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import GenericClient from '@mattermost/react-native-network-client';
import {decode} from 'html-entities';

export type OpenGraph = {
    link: string;
    title?: string;
    imageURL?: string;
    error?: any;
}

const metaTags: Record<string, string> = {
    title: 'title',
    description: 'description',
    ogUrl: 'og:url',
    ogType: 'og:type',
    ogTitle: 'og:title',
    ogDescription: 'og:description',
    ogImage: 'og:image',
    ogVideo: 'og:video',
    ogVideoType: 'og:video:type',
    ogVideoWidth: 'og:video:width',
    ogVideoHeight: 'og:video:height',
    ogVideoUrl: 'og:video:url',
    twitterPlayer: 'twitter:player',
    twitterPlayerWidth: 'twitter:player:width',
    twitterPlayerHeight: 'twitter:player:height',
    twitterPlayerStream: 'twitter:player:stream',
    twitterCard: 'twitter:card',
    twitterDomain: 'twitter:domain',
    twitterUrl: 'twitter:url',
    twitterTitle: 'twitter:title',
    twitterDescription: 'twitter:description',
    twitterImage: 'twitter:image',
};

const fetchRaw = async (url: string) => {
    try {
        const res = await GenericClient.get(url, {
            headers: {
                'User-Agent': 'OpenGraph',
                'Cache-Control': 'no-cache',
                Accept: '*/*',
                Connection: 'keep-alive',
            },
        });

        if (!res.ok) {
            return res;
        }

        return res.data as any;
    } catch (error: any) {
        return {message: error.message};
    }
};

const fetchOpenGraph = async (url: string): Promise<OpenGraph> => {
    const {
        ogTitle,
        ogImage,
    } = metaTags;

    try {
        const html = await fetchRaw(url);
        let siteTitle = '';

        const tagTitle = html.match(
            /<title[^>]*>[\r\n\t\s]*([^<]+)[\r\n\t\s]*<\/title>/gim,
        );
        siteTitle = tagTitle[0].replace(
            /<title[^>]*>[\r\n\t\s]*([^<]+)[\r\n\t\s]*<\/title>/gim,
            '$1',
        );

        const og = [];
        const metas: any = html.match(/<meta[^>]+>/gim);

        // There is no else statement
        /* istanbul ignore else */
        if (metas) {
            for (let meta of metas) {
                meta = meta.replace(/\s*\/?>$/, ' />');
                const zname = meta.replace(/[\s\S]*(property|name)\s*=\s*([\s\S]+)/, '$2');
                const name = (/^["']/).test(zname) ? zname.substr(1, zname.slice(1).indexOf(zname[0])) : zname.substr(0, zname.search(/[\s\t]/g));
                const valid = Boolean(Object.keys(metaTags).filter((m: any) => metaTags[m].toLowerCase() === name.toLowerCase()).length);

                // There is no else statement
                /* istanbul ignore else */
                if (valid) {
                    const zcontent = meta.replace(/[\s\S]*(content)\s*=\s*([\s\S]+)/, '$2');
                    const content = (/^["']/).test(zcontent) ? zcontent.substr(1, zcontent.slice(1).indexOf(zcontent[0])) : zcontent.substr(0, zcontent.search(/[\s\t]/g));
                    og.push({name, value: content === 'undefined' ? null : content});
                }
            }
        }

        const result: OpenGraph = {link: url};
        const data = og.reduce(
            (chain: any, meta: any) => ({...chain, [meta.name]: decode(meta.value)}),
            {url},
        );

        // Image
        result.imageURL = data[ogImage] ? data[ogImage] : null;

        // Title
        data[ogTitle] = data[ogTitle] ? data[ogTitle] : siteTitle;

        result.title = data[ogTitle];

        return result;
    } catch (error: any) {
        return {
            link: url,
            error,
        };
    }
};

export default fetchOpenGraph;
