// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Image, ImageBackground, type ImageBackgroundProps, type ImageProps, type ImageSource} from 'expo-image';
import React, {forwardRef, useMemo} from 'react';
import Animated from 'react-native-reanimated';

import {useServerUrl} from '@context/server';
import {urlSafeBase64Encode} from '@utils/security';

import type {SharedRefType} from 'expo';

type ExpoImagePropsWithId = ImageProps & {id: string};
type ExpoImagePropsMemoryOnly = ImageProps & {cachePolicy: 'memory'; id?: string};
type ExpoImageProps = ExpoImagePropsWithId | ExpoImagePropsMemoryOnly;

type ExpoImageBackgroundPropsWithId = ImageBackgroundProps & {id: string};
type ExpoImageBackgroundPropsMemoryOnly = ImageBackgroundProps & {cachePolicy: 'memory'; id?: string};
type ExpoImageBackgroundProps = ExpoImageBackgroundPropsWithId | ExpoImageBackgroundPropsMemoryOnly;

const ExpoImage = forwardRef<Image, ExpoImageProps>(({id, ...props}, ref) => {
    const serverUrl = useServerUrl();

    /**
     * SECURITY NOTE: cachePath uses base64 encoding for URL safety, NOT encryption.
     * Server URLs are not considered sensitive information, and this encoding is purely
     * for filesystem path compatibility (avoiding special characters in directory names).
     */
    const cachePath = useMemo(() => urlSafeBase64Encode(serverUrl), [serverUrl]);
    const source: ImageSource | string | number | ImageSource[] | string[] | SharedRefType<'image'> | null | undefined = useMemo(() => {
        if (typeof props.source === 'number' || typeof props.source === 'string' || Array.isArray(props.source) || !props.source) {
            return props.source;
        }

        // Only add cacheKey and cachePath if id is provided (i.e., not memory-only caching)
        if (id && typeof props.source === 'object' && 'uri' in props.source) {
            return {
                ...props.source,
                cacheKey: id,
                cachePath,
            };
        }

        return props.source;
    }, [id, props.source, cachePath]);

    // Process placeholder to add cachePath and cacheKey if it has a uri
    const placeholder: ImageSource | string | number | ImageSource[] | string[] | SharedRefType<'image'> | null | undefined = useMemo(() => {
        if (!props.placeholder || typeof props.placeholder === 'number' || typeof props.placeholder === 'string' || Array.isArray(props.placeholder)) {
            return props.placeholder;
        }

        // If placeholder has a uri and id is provided, add cachePath and cacheKey
        if (typeof props.placeholder === 'object' && 'uri' in props.placeholder && props.placeholder.uri && id) {
            return {
                ...props.placeholder,
                cacheKey: `${id}-thumb`,
                cachePath,
            };
        }

        return props.placeholder;
    }, [props.placeholder, id, cachePath]);

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
    const source: ImageSource | string | number | ImageSource[] | string[] | SharedRefType<'image'> | null | undefined = useMemo(() => {
        if (typeof props.source === 'number' || typeof props.source === 'string' || Array.isArray(props.source) || !props.source) {
            return props.source;
        }

        // Only add cacheKey and cachePath if id is provided (i.e., not memory-only caching)
        if (id && typeof props.source === 'object' && 'uri' in props.source) {
            return {
                ...props.source,
                cacheKey: id,
                cachePath,
            };
        }

        return props.source;
    }, [id, props.source, cachePath]);

    // Process placeholder to add cachePath and cacheKey if it has a uri
    const placeholder: ImageSource | string | number | ImageSource[] | string[] | SharedRefType<'image'> | null | undefined = useMemo(() => {
        if (!props.placeholder || typeof props.placeholder === 'number' || typeof props.placeholder === 'string' || Array.isArray(props.placeholder)) {
            return props.placeholder;
        }

        // If placeholder has a uri and id is provided, add cachePath and cacheKey
        if (typeof props.placeholder === 'object' && 'uri' in props.placeholder && props.placeholder.uri && id) {
            return {
                ...props.placeholder,
                cacheKey: `${id}-thumb`,
                cachePath,
            };
        }

        return props.placeholder;
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
