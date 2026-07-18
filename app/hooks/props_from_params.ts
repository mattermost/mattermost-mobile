// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useLocalSearchParams} from 'expo-router';

import {safeParseJSON} from '@utils/helpers';

type PropsFromParamsOptions<T> = {
    encodedStringParamsMarker?: string;
    preserveStringParams?: Array<keyof T>;
};

export function usePropsFromParams<T>({encodedStringParamsMarker, preserveStringParams = []}: PropsFromParamsOptions<T> = {}): T {
    const params = useLocalSearchParams();
    const stringParams = new Set(preserveStringParams.map(String));
    const hasEncodedStringParams = Boolean(encodedStringParamsMarker && params[encodedStringParamsMarker] === 'true');

    // Convert URL params to props format that existing screen expects
    const props = {} as T;
    Object.keys(params).forEach((key) => {
        if (key === encodedStringParamsMarker) {
            return;
        }

        const value = safeParseJSON(params[key]);
        (props as Record<string, unknown>)[key] = stringParams.has(key) && !hasEncodedStringParams ? params[key] : value;
    });

    return props;
}
