// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Platform, View} from 'react-native';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import FormattedText from 'app/components/formatted_text';

export default class BotTag extends PureComponent {
    static defaultProps = {
        show: true,
    };

    static propTypes = {
        show: PropTypes.bool,
        theme: PropTypes.object.isRequired,
    };

    render() {
        if (!this.props.show) {
            return null;
        }
        const style = createStyleSheet(this.props.theme);

        return (
            <View style={style.bot}>
                <FormattedText
                    id='post_info.bot'
                    defaultMessage='BOT'
                    style={style.botText}
                />
            </View>
        );
    }
}

const createStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        bot: {
            alignSelf: 'center',
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.15),
            borderRadius: 2,
            color: theme.centerChannelColor,
            fontWeight: '600',
            marginRight: 2,
            marginBottom: 1,
            ...Platform.select({
                android: {
                    marginBottom: 0,
                },
            }),
            marginLeft: 2,
            paddingVertical: 2,
            paddingHorizontal: 4,
        },
        botText: {
            fontSize: 10,
        },
    };
});
