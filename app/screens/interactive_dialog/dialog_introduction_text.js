// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {View} from 'react-native';
import PropTypes from 'prop-types';

import Markdown from 'app/components/markdown';

import {getMarkdownTextStyles, getMarkdownBlockStyles} from 'app/utils/markdown';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

export default class DialogIntroductionText extends PureComponent {
    static propTypes = {
        value: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
    };

    render() {
        const style = getStyleFromTheme(this.props.theme);
        const blockStyles = getMarkdownBlockStyles(this.props.theme);
        const textStyles = getMarkdownTextStyles(this.props.theme);

        return (
            <View style={style.introductionTextView}>
                <Markdown
                    baseTextStyle={style.introductionText}
                    textStyles={textStyles}
                    blockStyles={blockStyles}
                    value={this.props.value}
                    disableHashtags={true}
                    disableAtMentions={true}
                    disableChannelLink={true}
                />
            </View>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        introductionTextView: {
            marginHorizontal: 15,
        },
        introductionText: {
            color: theme.centerChannelColor,
        },
    };
});
