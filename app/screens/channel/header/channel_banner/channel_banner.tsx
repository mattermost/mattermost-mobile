// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {Text, View} from 'react-native';

import Markdown from '@components/markdown';
import {General, License, Screens} from '@constants';
import {useTheme} from '@context/theme';
import {useDefaultHeaderHeight} from '@hooks/header';
import {getContrastingSimpleColor} from '@utils/general';
import {getMarkdownBlockStyles, getMarkdownTextStyles} from '@utils/markdown';
import {typography} from '@utils/typography';

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
    const show = useMemo(() => showChannelBanner(channelType, license, bannerInfo), [channelType, license, bannerInfo]);
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

    const markdownTextStyle = useMemo(() => {
        const textStyle = getMarkdownTextStyles(theme);
        textStyle.link = {
            ...textStyle.link,
            color: bannerTextColor,
        };
        return textStyle;
    }, [bannerTextColor, theme]);

    if (!show) {
        return null;
    }

    return (
        <View style={containerStyle}>
            <Text
                style={style.bannerTextContainer}
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
