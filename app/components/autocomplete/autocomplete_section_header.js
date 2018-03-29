// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {View} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';

export default class AutocompleteSectionHeader extends PureComponent {
    static propTypes = {
        defaultMessage: PropTypes.string.isRequired,
        id: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
    };

    render() {
        const {defaultMessage, id, theme} = this.props;
        const style = getStyleFromTheme(theme);

        return (
            <View style={style.sectionWrapper}>
                <View style={style.section}>
                    <FormattedText
                        id={id}
                        defaultMessage={defaultMessage}
                        style={style.sectionText}
                    />
                </View>
            </View>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        section: {
            justifyContent: 'center',
            paddingLeft: 8,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderTopWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.2),
        },
        sectionText: {
            fontSize: 12,
            color: changeOpacity(theme.centerChannelColor, 0.7),
            paddingVertical: 7,
        },
        sectionWrapper: {
            backgroundColor: theme.centerChannelBg,
        },
    };
});
