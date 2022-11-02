// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {SafeAreaView, ScrollView, View} from 'react-native';
import Button from 'react-native-button';

import {dismissAnnouncement} from '@actions/local/systems';
import FormattedText from '@components/formatted_text';
import Markdown from '@components/markdown';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {dismissModal} from '@screens/navigation';
import {getMarkdownTextStyles, getMarkdownBlockStyles} from '@utils/markdown';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    allowDismissal: boolean;
    bannerText: string;
    componentId: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
        },
        scrollContainer: {
            flex: 1,
        },
        textContainer: {
            padding: 15,
        },
        baseTextStyle: {
            color: theme.centerChannelColor,
            ...typography('Body', 100, 'Regular'),
        },
        dismissContainer: {
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderTopWidth: 1,
            padding: 10,
        },
        dismissButton: {
            alignSelf: 'stretch',
            backgroundColor: theme.sidebarHeaderBg,
            borderRadius: 3,
            padding: 15,
        },
        dismissButtonText: {
            color: theme.sidebarHeaderTextColor,
            ...typography('Body', 100, 'SemiBold'),
            textAlign: 'center',
        },
    };
});

const close = () => {
    dismissModal();
};

const ExpandedAnnouncementBanner = ({
    allowDismissal,
    bannerText,
}: Props) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const serverUrl = useServerUrl();

    const dismissBanner = useCallback(() => {
        dismissAnnouncement(serverUrl, bannerText);
        close();
    }, [bannerText]);

    return (
        <SafeAreaView style={style.container}>
            <ScrollView
                style={style.scrollContainer}
                contentContainerStyle={style.textContainer}
            >
                <Markdown
                    baseTextStyle={style.baseTextStyle}
                    blockStyles={getMarkdownBlockStyles(theme)}
                    disableGallery={true}
                    textStyles={getMarkdownTextStyles(theme)}
                    value={bannerText}
                    location={Screens.EXPANDED_ANNOUNCEMENT_BANNER}
                    theme={theme}
                />
            </ScrollView>
            {allowDismissal && (
                <View style={style.dismissContainer}>
                    <Button
                        containerStyle={style.dismissButton}
                        onPress={dismissBanner}
                    >
                        <FormattedText
                            id='announcment_banner.dont_show_again'
                            defaultMessage={'Don\'t show again'}
                            style={style.dismissButtonText}
                        />
                    </Button>
                </View>
            )}
        </SafeAreaView>
    );
};

export default ExpandedAnnouncementBanner;
