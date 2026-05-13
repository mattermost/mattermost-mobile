// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Image, ImageBackground, type ImageBackgroundProps, type ImageProps, type ImageSource} from 'expo-image';
import React, {forwardRef, useMemo} from 'react';
import Animated from 'react-native-reanimated';

import {useServerUrl} from '@context/server';
import NetworkManager from '@managers/network_manager';
import {urlSafeBase64Encode} from '@utils/security';

type ExpoImagePropsWithId = ImageProps & {id: string};
type ExpoImagePropsMemoryOnly = ImageProps & {cachePolicy: 'memory'; id?: string};
type ExpoImageProps = ExpoImagePropsWithId | ExpoImagePropsMemoryOnly;

type ExpoImageBackgroundPropsWithId = ImageBackgroundProps & {id: string};
type ExpoImageBackgroundPropsMemoryOnly = ImageBackgroundProps & {cachePolicy: 'memory'; id?: string};
type ExpoImageBackgroundProps = ExpoImageBackgroundPropsWithId | ExpoImageBackgroundPropsMemoryOnly;

function shouldAttachServerAuthHeaders(uri: string | undefined, serverUrl: string) {
    if (!uri) {
        return false;
    }

    try {
        const requestUrl = new URL(uri);
        const serverBaseUrl = new URL(serverUrl);

        if (requestUrl.origin !== serverBaseUrl.origin) {
            return false;
        }

        return requestUrl.pathname.startsWith('/api/v4/');
    } catch {
        // On any parsing error, do not attach auth headers
        return false;
    }
}

const ExpoImage = forwardRef<Image, ExpoImageProps>(({id, ...props}, ref) => {
    const serverUrl = useServerUrl();
    const requestHeaders = useMemo(() => {
        try {
            const client = NetworkManager.getClient(serverUrl);
            return client.getRequestHeaders('GET');
        } catch {
            return undefined;
        }
    }, [serverUrl]);

    /**
     * SECURITY NOTE: cachePath uses base64 encoding for URL safety, NOT encryption.
     * Server URLs are not considered sensitive information, and this encoding is purely
     * for filesystem path compatibility (avoiding special characters in directory names).
     */
    const cachePath = useMemo(() => urlSafeBase64Encode(serverUrl), [serverUrl]);
    const source: ImageSource = useMemo(() => {
        const src = props.source;
        if (typeof src === 'number' || Array.isArray(src) || src == null) {
            return src as ImageSource;
        }

        const objSource = src as ImageSource & {uri?: string; headers?: Record<string, string>};
        const sourceHeaders = shouldAttachServerAuthHeaders(objSource.uri, serverUrl) && requestHeaders ? {...requestHeaders, ...objSource.headers} : objSource.headers;
        delete sourceHeaders?.Accept;

        // Only add cacheKey and cachePath if id is provided (i.e., not memory-only caching)
        if (id) {
            return {
                ...objSource,
                headers: sourceHeaders,
                cacheKey: id,
                cachePath,
            };
        }

        return {
            ...objSource,
            headers: sourceHeaders,
        };
    }, [id, props.source, cachePath, requestHeaders, serverUrl]);

    // Process placeholder to add cachePath and cacheKey if it has a uri
    const placeholder: ImageSource | undefined = useMemo(() => {
        const ph = props.placeholder;
        if (!ph || typeof ph === 'number' || typeof ph === 'string' || Array.isArray(ph)) {
            return ph as ImageSource | undefined;
        }

        const objPh = ph as ImageSource & {uri?: string; headers?: Record<string, string>};
        const placeholderHeaders = shouldAttachServerAuthHeaders(objPh.uri, serverUrl) && requestHeaders ? {...requestHeaders, ...objPh.headers} : objPh.headers;
        delete placeholderHeaders?.Accept;

        // If placeholder has a uri and id is provided, add cachePath and cacheKey
        if (objPh.uri && id) {
            return {
                ...objPh,
                headers: placeholderHeaders,
                cacheKey: `${id}-thumb`,
                cachePath,
            };
        }

        return {
            ...objPh,
            headers: placeholderHeaders,
        };
    }, [props.placeholder, id, cachePath, requestHeaders, serverUrl]);

    return (
        <Image
            ref={ref}
            {...props}
            source={source}
            placeholder={placeholder}
        />
    );
});
ExpoImage.displayName = 'ExpoImage';

const ExpoImageBackground = ({id, ...props}: ExpoImageBackgroundProps) => {
    const serverUrl = useServerUrl();
    const cachePath = useMemo(() => urlSafeBase64Encode(serverUrl), [serverUrl]);
    const source: ImageSource = useMemo(() => {
        const src = props.source;
        if (typeof src === 'number' || Array.isArray(src) || src == null) {
            return src as ImageSource;
        }

        const objSource = src as ImageSource;

        // Only add cacheKey and cachePath if id is provided (i.e., not memory-only caching)
        if (id) {
            return {
                ...objSource,
                cacheKey: id,
                cachePath,
            };
        }

        return objSource;
    }, [id, props.source, cachePath]);

    // Process placeholder to add cachePath and cacheKey if it has a uri
    const placeholder: ImageSource | undefined = useMemo(() => {
        const ph = props.placeholder;
        if (!ph || typeof ph === 'number' || typeof ph === 'string' || Array.isArray(ph)) {
            return ph as ImageSource | undefined;
        }

        const objPh = ph as ImageSource & {uri?: string};

        // If placeholder has a uri and id is provided, add cachePath and cacheKey
        if (objPh.uri && id) {
            return {
                ...objPh,
                cacheKey: `${id}-thumb`,
                cachePath,
            };
        }

        return objPh;
    }, [props.placeholder, id, cachePath]);

    return (
        <ImageBackground
            {...props}
            source={source}
            placeholder={placeholder}
        >
            {props.children}
        </ImageBackground>
    );
};

const ExpoImageAnimated = Animated.createAnimatedComponent(ExpoImage);

export {
    ExpoImageAnimated,
    ExpoImageBackground,
};

export default ExpoImage;
