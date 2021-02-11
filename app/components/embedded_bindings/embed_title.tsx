// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {View} from 'react-native';

import Markdown from '@components/markdown';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {Theme} from '@mm-redux/types/preferences';

type Props = {
    theme: Theme;
    value?: string;
}
export default class EmbedTitle extends PureComponent<Props> {
    render() {
        const {
            value,
            theme,
        } = this.props;

        if (!value) {
            return null;
        }

        const style = getStyleSheet(theme);

        const title = (
            <Markdown
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
