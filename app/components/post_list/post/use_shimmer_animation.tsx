// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useMemo} from 'react';
import {Easing} from 'react-native';
import {cancelAnimation, interpolate, useAnimatedStyle, useSharedValue, withRepeat, withTiming} from 'react-native-reanimated';

import EphemeralStore from '@store/ephemeral_store';
import {getPostTranslation} from '@utils/post';
import {changeOpacity} from '@utils/theme';

import type PostModel from '@typings/database/models/servers/post';

const MAX_RUNNING_TRANSLATIONS = 10;

const useShimmerAnimation = (post: PostModel, isChannelAutotranslated: boolean, locale: string, layoutWidth: number, theme: Theme) => {
    const translation = getPostTranslation(post, locale);
    const isTranslating = isChannelAutotranslated && post.type === '' && translation?.state === 'processing';
    const shimmerTranslateX = useSharedValue(-1);

    useEffect(() => {
        if (isTranslating) {
            if (EphemeralStore.totalRunningTranslations() < MAX_RUNNING_TRANSLATIONS) {
                EphemeralStore.addRunningTranslation(post.id);
                shimmerTranslateX.value = withRepeat(
                    withTiming(1, {
                        duration: 2000,
                        easing: Easing.linear,
                    }),
                    -1,
                );
            } else {
                shimmerTranslateX.value = 0;
            }
        }

        return () => {
            EphemeralStore.removeRunningTranslation(post.id);
            cancelAnimation(shimmerTranslateX);
            shimmerTranslateX.value = -1;
        };
    }, [isTranslating, post.id, shimmerTranslateX]);

    const shimmerAnimatedStyle = useAnimatedStyle(() => {
        const translateX = interpolate(
            shimmerTranslateX.value,
            [-1, 1],
            [-4 * layoutWidth, 4 * layoutWidth],
        );
        return {
            transform: [{translateX}],
        };
    });

    const gradientColors = useMemo(() => {
        return [
            changeOpacity(theme.centerChannelBg, 0.0),
            changeOpacity(theme.centerChannelBg, 0.4),
            theme.centerChannelBg,
            changeOpacity(theme.centerChannelBg, 0.4),
            changeOpacity(theme.centerChannelBg, 0.0),
        ] as const;
    }, [theme]);

    const backgroundColor = useMemo(() => {
        return changeOpacity(theme.centerChannelBg, 0.32);
    }, [theme]);

    return {
        backgroundColor,
        gradientColors,
        shimmerAnimatedStyle,
        isTranslating,
    };
};

export default useShimmerAnimation;
