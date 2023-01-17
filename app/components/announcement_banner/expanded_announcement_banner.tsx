// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {ScrollView, Text, View} from 'react-native';
import Button from 'react-native-button';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {dismissAnnouncement} from '@actions/local/systems';
import FormattedText from '@components/formatted_text';
import Markdown from '@components/markdown';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {dismissBottomSheet} from '@screens/navigation';
import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';
import {getMarkdownTextStyles, getMarkdownBlockStyles} from '@utils/markdown';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    allowDismissal: boolean;
    bannerText: string;
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
    };
});

const close = () => {
    dismissBottomSheet();
};

const ExpandedAnnouncementBanner = ({
    allowDismissal,
    bannerText,
}: Props) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const serverUrl = useServerUrl();
    const isTablet = useIsTablet();
    const intl = useIntl();
    const insets = useSafeAreaInsets();

    const dismissBanner = useCallback(() => {
        dismissAnnouncement(serverUrl, bannerText);
        close();
    }, [bannerText]);

    const buttonStyles = useMemo(() => {
        return {
            okay: {
                button: buttonBackgroundStyle(theme, 'lg', 'primary'),
                text: buttonTextStyle(theme, 'lg', 'primary'),
            },
            dismiss: {
                button: [{marginTop: 10}, buttonBackgroundStyle(theme, 'lg', 'link')],
                text: buttonTextStyle(theme, 'lg', 'link'),
            },
        };
    }, [theme]);

    const containerStyle = useMemo(() => {
        return [style.container, {marginBottom: insets.bottom + 10}];
    }, [style, insets.bottom]);

    const Scroll = useMemo(() => (isTablet ? ScrollView : BottomSheetScrollView), [isTablet]);

    return (
        <View style={containerStyle}>
            {!isTablet && (
                <Text style={style.title}>
                    {intl.formatMessage({
                        id: 'mobile.announcement_banner.title',
                        defaultMessage: 'Announcement',
                    })}
                </Text>
            )}
            <Scroll
                style={style.scrollContainer}
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
                containerStyle={buttonStyles.okay.button}
                onPress={close}
            >
                <FormattedText
                    id='announcment_banner.okay'
                    defaultMessage={'Okay'}
                    style={buttonStyles.okay.text}
                />
            </Button>
            {allowDismissal && (
                <Button
                    containerStyle={buttonStyles.dismiss.button}
                    onPress={dismissBanner}
                >
                    <FormattedText
                        id='announcment_banner.dismiss'
                        defaultMessage={'Dismiss announcement'}
                        style={buttonStyles.dismiss.text}
                    />
                </Button>
            )}
        </View>
    );
};

export default ExpandedAnnouncementBanner;
