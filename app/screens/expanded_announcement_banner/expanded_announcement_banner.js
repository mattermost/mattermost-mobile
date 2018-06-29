// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {ScrollView} from 'react-native';

import Markdown from 'app/components/markdown';

import {getMarkdownTextStyles, getMarkdownBlockStyles} from 'app/utils/markdown';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

export default class ExpandedAnnouncementBanner extends React.PureComponent {
    static propTypes = {
        bannerText: PropTypes.string,
        navigator: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
    }

    handleChannelLinkPress = () => {
        this.props.navigator.pop();
    };

    render() {
        const style = getStyleSheet(this.props.theme);

        return (
            <ScrollView
                style={style.scrollContainer}
                contentContainerStyle={style.container}
            >
                <Markdown
                    baseTextStyle={style.baseTextStyle}
                    blockStyles={getMarkdownBlockStyles(this.props.theme)}
                    navigator={this.props.navigator}
                    onChannelLinkPress={this.handleChannelLinkPress}
                    textStyles={getMarkdownTextStyles(this.props.theme)}
                    value={this.props.bannerText}
                />
            </ScrollView>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        scrollContainer: {
            flex: 1,
        },
        container: {
            padding: 15,
        },
        baseTextStyle: {
            color: theme.centerChannelColor,
            fontSize: 15,
            lineHeight: 20,
        },
    };
});
