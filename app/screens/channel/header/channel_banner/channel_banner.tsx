// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

import Markdown from '@components/markdown';
import {General, License, Screens} from '@constants';
import {useTheme} from '@context/theme';
import {useDefaultHeaderHeight} from '@hooks/header';
import {getContrastingSimpleColor} from '@utils/general';
import {getMarkdownBlockStyles, getMarkdownTextStyles} from '@utils/markdown';
import {typography} from '@utils/typography';
import {useIntl} from 'react-intl';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {bottomSheet} from '@screens/navigation';
import ExpandedAnnouncementBanner from '@components/announcement_banner/expanded_announcement_banner';

const BUTTON_HEIGHT = 48; // From /app/utils/buttonStyles.ts, lg button
const TITLE_HEIGHT = 30 + 12; // typography 600 line height
const MARGINS = 12 + 24 + 10; // (after title + after text + after content) from ./expanded_announcement_banner
const TEXT_CONTAINER_HEIGHT = 500;
const SNAP_POINT = TITLE_HEIGHT + BUTTON_HEIGHT + MARGINS + TEXT_CONTAINER_HEIGHT + BUTTON_HEIGHT + 10;

const CLOSE_BUTTON_ID = 'channel-banner-close';

const getStyleSheet = (bannerTextColor: string) => ({
    container: {
        paddingTop: 10,
        paddingBottom: 10,
        paddingLeft: 16,
        paddingRight: 16,
        height: 40,
    },
    baseTextStyle: {
        borderWidth: 2,
        borderColor: 'red',
        ...typography('Body', 100, 'Regular'),
        color: bannerTextColor,
    },
    bannerTextContainer: {
        flex: 1,
        flexGrow: 1,
    },
});

type Props = {
    channelType: ChannelType;
    bannerInfo?: ChannelBannerInfo;
    license?: ClientLicense;
}

export function ChannelBanner({bannerInfo, license, channelType}: Props) {
    const intl = useIntl();
    const shouldDisplayChannelBanner = useMemo(() => showChannelBanner(channelType, license, bannerInfo), [channelType, license, bannerInfo]);
    const theme = useTheme();
    const bannerTextColor = getContrastingSimpleColor(bannerInfo?.background_color || '');

    const style = useMemo(() => {
        return getStyleSheet(bannerTextColor);
    }, [bannerTextColor]);

    const defaultHeight = useDefaultHeaderHeight();
    const containerStyle = useMemo(() => ({
        ...style.container,
        backgroundColor: bannerInfo?.background_color,
        top: defaultHeight,
        zIndex: 1,
    }), [bannerInfo?.background_color, defaultHeight, style.container]);

    const expandedChannelBannerTitle = intl.formatMessage({
        id: 'channel.banner.bottom_sheet.title',
        defaultMessage: 'Channel Banner',
    });

    const markdownTextStyle = useMemo(() => {
        const textStyle = getMarkdownTextStyles(theme);

        // channel banner colors are theme independent.
        // If we let the link color being set by the theme, it will be unreadable in some cases.
        // So we set the link color to the banner text color explicitly. This, with the controlled
        // background color, ensures the banner text is always readable.
        textStyle.link = {
            ...textStyle.link,
            color: bannerTextColor,
        };
        return textStyle;
    }, [bannerTextColor, theme]);

    const renderExpandedChannelBannerContent = useCallback(() => (
        <ExpandedAnnouncementBanner
            allowDismissal={false}
            bannerText={bannerInfo?.text || ''}
            headingText={expandedChannelBannerTitle}
        />
    ), [bannerInfo?.text]);

    const handlePress = useCallback(() => {
        const snapPoint = bottomSheetSnapPoint(1, SNAP_POINT);

        bottomSheet({
            closeButtonId: CLOSE_BUTTON_ID,
            title: expandedChannelBannerTitle,
            renderContent: renderExpandedChannelBannerContent,
            snapPoints: [1, snapPoint],
            theme,
        });
    }, [intl, renderExpandedChannelBannerContent, theme]);

    if (!shouldDisplayChannelBanner) {
        return null;
    }

    return (
        <View style={containerStyle}>
            <TouchableOpacity
                onPress={handlePress}
                style={style.bannerTextContainer}
            >
                <Text
                    ellipsizeMode='tail'
                    numberOfLines={1}
                >
                    <Markdown
                        baseTextStyle={style.baseTextStyle}
                        blockStyles={getMarkdownBlockStyles(theme)}
                        disableGallery={true}
                        textStyles={markdownTextStyle}
                        value={bannerInfo!.text}
                        theme={theme}
                        location={Screens.CHANNEL_BANNER}
                    />
                </Text>
            </TouchableOpacity>
        </View>
    );
}

function showChannelBanner(channelType: ChannelType, license?: ClientLicense, bannerInfo?: ChannelBannerInfo): boolean {
    if (!license || !bannerInfo) {
        return false;
    }

    // TODO: use premium license check here once SKU is added to server
    const isPremiumLicense = license.SkuShortName === License.SKU_SHORT_NAME.Enterprise;
    const bannerInfoComplete = Boolean(bannerInfo.enabled && bannerInfo.text && bannerInfo.background_color);
    const isValidChannelType = channelType === General.OPEN_CHANNEL || channelType === General.PRIVATE_CHANNEL;

    return isPremiumLicense && bannerInfoComplete && isValidChannelType;
}
