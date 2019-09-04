// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {ScrollView, View} from 'react-native';
import Button from 'react-native-button';
import FormattedText from 'app/components/formatted_text';
import Markdown from 'app/components/markdown';
import SafeAreaView from 'app/components/safe_area_view';
import {getMarkdownTextStyles, getMarkdownBlockStyles} from 'app/utils/markdown';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default class ExpandedAnnouncementBanner extends React.PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            dismissBanner: PropTypes.func.isRequired,
            popTopScreen: PropTypes.func.isRequired,
        }).isRequired,
        allowDismissal: PropTypes.bool.isRequired,
        bannerText: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
    }

    close = () => {
        this.props.actions.popTopScreen();
    };

    dismissBanner = () => {
        this.props.actions.dismissBanner(this.props.bannerText);

        this.close();
    };

    handleChannelLinkPress = () => {
        this.close();
    };

    render() {
        const style = getStyleSheet(this.props.theme);

        let dismissButton = null;
        if (this.props.allowDismissal) {
            dismissButton = (
                <View style={style.dismissContainer}>
                    <Button
                        containerStyle={style.dismissButton}
                        onPress={this.dismissBanner}
                    >
                        <FormattedText
                            id='announcment_banner.dont_show_again'
                            defaultMessage={'Don\'t show again'}
                            style={style.dismissButtonText}
                        />
                    </Button>
                </View>
            );
        }

        return (
            <SafeAreaView useLandscapeMargin={true}>
                <View style={style.container}>
                    <ScrollView
                        style={style.scrollContainer}
                        contentContainerStyle={style.textContainer}
                    >
                        <Markdown
                            baseTextStyle={style.baseTextStyle}
                            blockStyles={getMarkdownBlockStyles(this.props.theme)}
                            onChannelLinkPress={this.handleChannelLinkPress}
                            textStyles={getMarkdownTextStyles(this.props.theme)}
                            value={this.props.bannerText}
                        />
                    </ScrollView>
                    {dismissButton}
                </View>
            </SafeAreaView>
        );
    }
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
            fontSize: 15,
            lineHeight: 20,
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
            fontSize: 15,
            fontWeight: '600',
            textAlign: 'center',
        },
    };
});
