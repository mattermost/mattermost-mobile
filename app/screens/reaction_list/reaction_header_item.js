// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Text,
    TouchableOpacity,
} from 'react-native';

import Emoji from 'app/components/emoji';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import FormattedText from 'app/components/formatted_text';

import {ALL_EMOJIS} from 'app/constants/emoji';

export default class ReactionHeaderItem extends PureComponent {
    static propTypes = {
        count: PropTypes.number.isRequired,
        emojiName: PropTypes.string.isRequired,
        highlight: PropTypes.bool.isRequired,
        onPress: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
    }

    handlePress = () => {
        const {emojiName, highlight, onPress} = this.props;
        onPress(emojiName, highlight);
    }

    renderEmoji = (emojiName, styles) => {
        if (emojiName === ALL_EMOJIS) {
            return (
                <FormattedText
                    id='mobile.reaction_header.all_emojis'
                    defaultMessage={'All'}
                    style={styles.text}
                />
            );
        }

        return (
            <Emoji
                emojiName={emojiName}
                size={25}
                padding={5}
            />
        );
    }

    render() {
        const {count, emojiName, highlight, theme} = this.props;
        const styles = getStyleSheet(theme);

        return (
            <TouchableOpacity
                onPress={this.handlePress}
                style={[styles.reaction, (highlight && styles.highlight)]}
            >
                {this.renderEmoji(emojiName, styles)}
                <Text style={styles.text}>{count}</Text>
            </TouchableOpacity>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        text: {
            color: theme.linkColor,
            marginLeft: 3,
            fontSize: 20,
        },
        highlight: {
            borderColor: changeOpacity(theme.linkColor, 1),
            borderBottomWidth: 2,
        },
        reaction: {
            alignItems: 'center',
            flexDirection: 'row',
            height: 40,
            marginRight: 6,
            marginBottom: 5,
            marginTop: 10,
            paddingVertical: 2,
            paddingHorizontal: 6,
        },
    };
});
