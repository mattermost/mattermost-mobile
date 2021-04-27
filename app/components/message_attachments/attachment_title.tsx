// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {Alert, Text, View} from 'react-native';
import {intlShape} from 'react-intl';

import Markdown from '@components/markdown';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {tryOpenURL} from '@utils/url';

import {Theme} from '@mm-redux/types/preferences';

type Props = {
    link?: string;
    theme: Theme;
    value?: string;
}
export default class AttachmentTitle extends PureComponent<Props> {
    static contextTypes = {
        intl: intlShape.isRequired,
    };

    openLink = () => {
        const {link} = this.props;
        const {intl} = this.context;

        if (link) {
            const onError = () => {
                Alert.alert(
                    intl.formatMessage({
                        id: 'mobile.link.error.title',
                        defaultMessage: 'Error',
                    }),
                    intl.formatMessage({
                        id: 'mobile.link.error.text',
                        defaultMessage: 'Unable to open the link.',
                    }),
                );
            };

            tryOpenURL(link, onError);
        }
    };

    render() {
        const {
            link,
            value,
            theme,
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
                    disableGallery={true}
                    autolinkedUrlSchemes={[]}
                    mentionKeys={[]}
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

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
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
