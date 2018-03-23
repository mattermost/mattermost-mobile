// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Text,
    TouchableOpacity,
} from 'react-native';

import Emoji from 'app/components/emoji';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default class Reaction extends PureComponent {
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

    render() {
        const {count, emojiName, highlight, theme} = this.props;
        const styles = getStyleSheet(theme);

        return (
            <TouchableOpacity
                onPress={this.handlePress}
                style={[styles.reaction, (highlight && styles.highlight)]}
            >
                <Emoji
                    emojiName={emojiName}
                    size={15}
                    padding={5}
                />
                <Text style={styles.count}>{count}</Text>
            </TouchableOpacity>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        count: {
            color: theme.linkColor,
            marginLeft: 6,
        },
        highlight: {
            backgroundColor: changeOpacity(theme.linkColor, 0.1),
        },
        reaction: {
            alignItems: 'center',
            borderRadius: 2,
            borderColor: changeOpacity(theme.linkColor, 0.4),
            borderWidth: 1,
            flexDirection: 'row',
            marginRight: 6,
            marginVertical: 5,
            paddingVertical: 2,
            paddingHorizontal: 6,
        },
    };
});
