// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Text, TouchableOpacity, View} from 'react-native';

import {fetchChannelClassificationValue} from '@actions/remote/classification';
import ExpandedAnnouncementBanner from '@components/announcement_banner/expanded_announcement_banner';
import RemoveMarkdown from '@components/remove_markdown';
import {CHANNEL_BANNER_HEIGHT} from '@constants/view';
import {useServerUrl} from '@context/server';
import {useDefaultHeaderHeight} from '@hooks/header';
import {bottomSheet} from '@screens/navigation';
import {getContrastingSimpleColor} from '@utils/general';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {typography} from '@utils/typography';

import type {ChannelClassificationBannerState} from '@utils/classification';

const BUTTON_HEIGHT = 48; // From /app/utils/buttonStyles.ts, lg button
const TITLE_HEIGHT = 30 + 12; // typography 600 line height
const MARGINS = 12 + 24 + 10; // (after title + after text + after content)
const SNAP_POINT = TITLE_HEIGHT + BUTTON_HEIGHT + MARGINS + BUTTON_HEIGHT + 10;

const MAX_TEXT_CONTAINER_HEIGHT = 500;
const MIN_TEXT_CONTAINER_HEIGHT = 40;

const getStyleSheet = (bannerTextColor: string) => ({
    container: {
        paddingTop: 2,
        paddingBottom: 2,
        paddingLeft: 16,
        paddingRight: 16,
        height: CHANNEL_BANNER_HEIGHT,
    },
    containerTopItem: {
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    baseTextStyle: {
        ...typography('Body', 100, 'Regular'),
        color: bannerTextColor,
    },
    bannerTextContainer: {
        flex: 1,
        flexGrow: 1,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    },
    bannerText: {
        textAlign: 'center' as const,
    },
});

type Props = {
    channelId: string;
    bannerInfo?: ChannelBannerInfo;
    channelClassification: ChannelClassificationBannerState;
    isTopItem?: boolean;
    skipHeaderOffset?: boolean;
}

export function ChannelBanner({channelId, bannerInfo, channelClassification, isTopItem, skipHeaderOffset}: Props) {
    const intl = useIntl();
    const serverUrl = useServerUrl();

    useEffect(() => {
        fetchChannelClassificationValue(serverUrl, channelId);
    }, [serverUrl, channelId]);

    const effectiveBanner = channelClassification.hasClassification
        ? channelClassification.classificationBanner
        : bannerInfo;

    const bannerTextColor = getContrastingSimpleColor(effectiveBanner?.background_color || '');

    const style = useMemo(() => {
        return getStyleSheet(bannerTextColor);
    }, [bannerTextColor]);

    const defaultHeight = useDefaultHeaderHeight();
    const containerStyle = useMemo(() => ({
        ...style.container,
        backgroundColor: effectiveBanner?.background_color,
        ...(skipHeaderOffset ? undefined : {top: defaultHeight, zIndex: 1}),
    }), [effectiveBanner?.background_color, defaultHeight, skipHeaderOffset, style.container]);

    const handlePress = useCallback(() => {
        // set snap point based on text length, with a defined
        // minimum and maximum height for the text container
        const length = (effectiveBanner?.text?.length ?? 0) / 100;
        const snapPoint = SNAP_POINT + Math.min(Math.max(bottomSheetSnapPoint(length, 100), MIN_TEXT_CONTAINER_HEIGHT), MAX_TEXT_CONTAINER_HEIGHT);

        const expandedChannelBannerTitle = intl.formatMessage({
            id: 'channel.banner.bottom_sheet.title',
            defaultMessage: 'Channel Banner',
        });

        const renderContent = () => (
            <ExpandedAnnouncementBanner
                allowDismissal={false}
                bannerText={effectiveBanner?.text ?? ''}
                headingText={expandedChannelBannerTitle}
            />
        );

        bottomSheet(renderContent, [1, snapPoint]);
    }, [effectiveBanner, intl]);

    // banner info will be complete when this component renders,
    // but this check is still here to avoid having to use non-null assertion everywhere.
    if (!effectiveBanner || !effectiveBanner.enabled || !effectiveBanner.text || !effectiveBanner.background_color) {
        return null;
    }

    return (
        <View style={[containerStyle, isTopItem && style.containerTopItem]}>
            <TouchableOpacity
                onPress={handlePress}
                style={style.bannerTextContainer}
            >
                <Text
                    ellipsizeMode='tail'
                    numberOfLines={1}
                    style={style.bannerText}
                >
                    <RemoveMarkdown
                        value={effectiveBanner.text}
                        baseStyle={style.baseTextStyle}
                    />
                </Text>
            </TouchableOpacity>
        </View>
    );
}
