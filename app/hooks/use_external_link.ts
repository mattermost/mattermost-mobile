// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useMemo} from 'react';
import {URL} from 'react-native-url-polyfill';

export type ExternalLinkQueryParams = {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    userId?: string;
}

type StateProps = {
    userId: string;
    telemetryId: string;
    isCloud: boolean;
}

// This mimics the behavior of webapp/channels/src/components/common/hooks/use_external_link.ts
export function useExternalLink(
    {
        userId,
        telemetryId,
        isCloud,
    }: StateProps,
    href: string,
    location: string = '',
    overwriteQueryParams: ExternalLinkQueryParams = {},
): [string, Record<string, string>] {
    return useMemo(() => {
        if (!href?.includes('mattermost.com') || href.startsWith('mailto:')) {
            return [href, {}];
        }

        const parsedUrl = new URL(href);

        const existingURLSearchParams = parsedUrl.searchParams;
        const existingQueryParamsObj = Object.fromEntries(existingURLSearchParams.entries());
        const queryParams = {
            utm_source: 'mattermost',
            utm_medium: isCloud ? 'in-product-cloud' : 'in-product',
            utm_content: location,
            uid: userId,
            sid: telemetryId,
            ...overwriteQueryParams,
            ...existingQueryParamsObj,
        };
        parsedUrl.search = Object.entries(queryParams).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&');

        return [parsedUrl.toString(), queryParams];
    }, [href, isCloud, location, overwriteQueryParams, telemetryId, userId]);
}
