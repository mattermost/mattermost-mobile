// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {Linking, Text, View} from 'react-native';
import PropTypes from 'prop-types';

import {makeStyleSheetFromTheme} from 'app/utils/theme';
import Markdown from 'app/components/markdown';

export default class AttachmentTitle extends PureComponent {
    static propTypes = {
        link: PropTypes.string,
        theme: PropTypes.object.isRequired,
        value: PropTypes.string,
        navigator: PropTypes.object.isRequired,
    };

    openLink = () => {
        const {link} = this.props;
        if (link && Linking.canOpenURL(link)) {
            Linking.openURL(link);
        }
    };

    render() {
        const {
            link,
            value,
            theme,
            navigator,
        } = this.props;

        if (!value) {
            return null;
        }

        const style = getStyleSheet(theme);

        let title;
        if (link) {
            title = (
                <Text
                    style={[style.title, Boolean(link) && style.link]}
                    onPress={this.openLink}
                >
                    {value}
                </Text>
            );
        } else {
            title = (
                <Markdown
                    isEdited={false}
                    isReplyPost={false}
                    disableHashtags={true}
                    disableAtMentions={true}
                    disableChannelLink={true}
                    autolinkedUrlSchemes={[]}
                    mentionKeys={[]}
                    navigator={navigator}
                    theme={theme}
                    value={value}
                    baseTextStyle={style.title}
                    textStyles={{link: style.link}}
                />
            );
        }

        return (
            <View style={style.container}>
                {title}
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            marginTop: 3,
            flex: 1,
            flexDirection: 'row',
        },
        title: {
            color: theme.centerChannelColor,
            fontWeight: '600',
            marginBottom: 5,
            fontSize: 14,
            lineHeight: 20,
        },
        link: {
            color: theme.linkColor,
        },
    };
});
