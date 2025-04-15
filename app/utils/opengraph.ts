// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {decode} from 'html-entities';
import htmlParser from 'node-html-parser';
import urlParse from 'url-parse';

export type BestImage = {
    secure_url?: string;
    url?: string;
};

export type OpenGraph = {
    link: string;
    title?: string;
    imageURL?: string;
    favIcon?: string;
    error?: any;
}

type LinkRelIcon = {
    href: string;
    sizes?: string;
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

export function getDistanceBW2Points(point1: Record<string, any>, point2: Record<string, any>, xAttr = 'x', yAttr = 'y') {
    return Math.sqrt(Math.pow(point1[xAttr] - point2[xAttr], 2) + Math.pow(point1[yAttr] - point2[yAttr], 2));
}

/**
 * Funtion to return nearest point of given pivot point.
 * It return two points one nearest and other nearest but having both coorditanes smaller than the given point's coordinates.
 */
export function getNearestPoint(pivotPoint: {height: number; width: number}, points: never[], xAttr = 'x', yAttr = 'y') {
    let nearestPoint: Record<string, any> = {};
    const pivot = {[xAttr]: pivotPoint.width, [yAttr]: pivotPoint.height};
    for (const point of points) {
        if (typeof nearestPoint[xAttr] === 'undefined' || typeof nearestPoint[yAttr] === 'undefined') {
            nearestPoint = point;
        } else if (getDistanceBW2Points(point, pivot, xAttr, yAttr) < getDistanceBW2Points(nearestPoint, pivot, xAttr, yAttr)) {
            // Check for bestImage
            nearestPoint = point;
        }
    }
    return nearestPoint as BestImage;
}

const fetchRaw = async (url: string) => {
    try {
        const res = await fetch(url, {
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

        return (await res.text()) as any;
    } catch (error: any) {
        return {message: error.message};
    }
};

const getFavIcon = (url: string, html: string) => {
    const getSize = (el: LinkRelIcon) => {
        return (el.sizes && el.sizes[0] && parseInt(el.sizes[0], 10)) || 0;
    };

    const root = htmlParser.parse(html);

    const icons = (root.querySelectorAll('link')).reduce<LinkRelIcon[]>((r, e) => {
        if (e.attributes.rel === 'icon' || e.attributes.rel === 'shortcut icon') {
            const {href, sizes} = e.attributes;
            r.push({href, sizes});
        }
        return r;
    }, []).sort((a, b) => {
        return getSize(b) - getSize(a);
    });

    if (icons.length) {
        const icon = icons[0].href;
        let parsed = urlParse(icon);
        if (!parsed.host) {
            parsed = urlParse(url);
            return `${parsed.protocol}//${parsed.host}${icon}`;
        }
        return icon;
    }
    const parsed = urlParse(url);
    return `${parsed.protocol}//${parsed.host}/favicon.ico`;
};

export const fetchOpenGraph = async (url: string, includeFavIcon = false): Promise<OpenGraph> => {
    const {
        ogTitle,
        ogImage,
    } = metaTags;

    try {
        const html = await fetchRaw(url);
        if (html.message) {
            throw Error(html.message);
        }

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
            for (const m of metas) {
                const meta = m.replace(/\s*\/?>$/, ' />');
                const zname = meta.replace(/[\s\S]*(property|name)\s*=\s*([\s\S]+)/, '$2');
                const name = (/^["']/).test(zname) ? zname.substr(1, zname.slice(1).indexOf(zname[0])) : zname.substr(0, zname.search(/[\s\t]/g));
                const valid = Boolean(Object.keys(metaTags).filter((key: string) => metaTags[key].toLowerCase() === name.toLowerCase()).length);

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
        result.favIcon = includeFavIcon ? getFavIcon(url, html) : undefined;

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

export const testExports = {
    fetchRaw,
    getFavIcon,
};
