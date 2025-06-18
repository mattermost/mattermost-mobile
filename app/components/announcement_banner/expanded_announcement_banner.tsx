// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {ScrollView, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {dismissAnnouncement} from '@actions/local/systems';
import Button from '@components/button';
import Markdown from '@components/markdown';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useBottomSheetListsFix} from '@hooks/bottom_sheet_lists_fix';
import {useIsTablet} from '@hooks/device';
import {dismissBottomSheet} from '@screens/navigation';
import {getMarkdownTextStyles, getMarkdownBlockStyles} from '@utils/markdown';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    allowDismissal: boolean;
    bannerText: string;
    headingText?: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
        },
        scrollContainer: {
            flex: 1,
            marginTop: 12,
            marginBottom: 24,
        },
        baseTextStyle: {
            color: theme.centerChannelColor,
            ...typography('Body', 100, 'Regular'),
        },
        title: {
            color: theme.centerChannelColor,
            ...typography('Heading', 600, 'SemiBold'),
        },
        dismissButtonContainer: {
            marginTop: 10,
        },
    };
});

const close = () => {
    dismissBottomSheet();
};

const ExpandedAnnouncementBanner = ({
    allowDismissal,
    bannerText,
    headingText,
}: Props) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const serverUrl = useServerUrl();
    const isTablet = useIsTablet();
    const intl = useIntl();
    const insets = useSafeAreaInsets();
    const {enabled, panResponder} = useBottomSheetListsFix();

    const dismissBanner = useCallback(() => {
        dismissAnnouncement(serverUrl, bannerText);
        close();
    }, [bannerText, serverUrl]);

    const containerStyle = useMemo(() => {
        return [style.container, {marginBottom: insets.bottom + 10}];
    }, [style, insets.bottom]);

    const Scroll = useMemo(() => (isTablet ? ScrollView : BottomSheetScrollView), [isTablet]);

    const heading = headingText || intl.formatMessage({
        id: 'mobile.announcement_banner.title',
        defaultMessage: 'Announcement',
    });

    return (
        <View style={containerStyle}>
            {!isTablet && (
                <Text style={style.title}>
                    {heading}
                </Text>
            )}
            <Scroll
                style={style.scrollContainer}
                scrollEnabled={enabled}
                {...panResponder.panHandlers}
            >
                <Markdown
                    baseTextStyle={style.baseTextStyle}
                    blockStyles={getMarkdownBlockStyles(theme)}
                    disableGallery={true}
                    textStyles={getMarkdownTextStyles(theme)}
                    value={bannerText}
                    theme={theme}
                    location={Screens.BOTTOM_SHEET}
                />
            </Scroll>
            <Button
                text={intl.formatMessage({id: 'announcment_banner.okay', defaultMessage: 'Okay'})}
                onPress={close}
                size='lg'
                theme={theme}
            />
            {allowDismissal && (
                <View style={style.dismissButtonContainer}>
                    <Button
                        text={intl.formatMessage({id: 'announcment_banner.dismiss', defaultMessage: 'Dismiss announcement'})}
                        onPress={dismissBanner}
                        size='lg'
                        theme={theme}
                        emphasis='link'
                    />
                </View>
            )}
        </View>
    );
};

export default ExpandedAnnouncementBanner;
