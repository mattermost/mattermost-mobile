// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
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
            <FormattedText
                id='post_info.bot'
                defaultMessage='BOT'
                style={style.bot}
            />
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
            fontSize: 10,
            fontWeight: '600',
            marginRight: 5,
            marginLeft: 5,
            paddingVertical: 2,
            paddingHorizontal: 4,
        },
    };
});
