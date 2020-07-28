// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {ActivityIndicator, View} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';
import {paddingHorizontal as padding} from 'app/components/safe_area_view/iphone_x_spacing';

export default class AutocompleteSectionHeader extends PureComponent {
    static propTypes = {
        defaultMessage: PropTypes.string.isRequired,
        id: PropTypes.string.isRequired,
        loading: PropTypes.bool,
        theme: PropTypes.object.isRequired,
        isLandscape: PropTypes.bool.isRequired,
    };

    static defaultProps = {
        isLandscape: false,
    };

    render() {
        const {defaultMessage, id, loading, theme, isLandscape} = this.props;
        const style = getStyleFromTheme(theme);
        return (
            <View style={style.sectionWrapper}>
                <View style={[style.section, padding(isLandscape)]}>
                    <FormattedText
                        id={id.toUpperCase()}
                        defaultMessage={defaultMessage.toUpperCase()}
                        style={style.sectionText}
                    />
                    {loading &&
                    <ActivityIndicator
                        color={theme.centerChannelColor}
                        size='small'
                    />
                    }
                </View>
            </View>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        section: {
            justifyContent: 'center',
            position: 'relative',
            top: -1,
            borderTopWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.2),
            flexDirection: 'row',
        },
        sectionText: {
            fontSize: 12,
            fontWeight: '600',
            color: changeOpacity(theme.centerChannelColor, 0.56),
            paddingTop: 16,
            paddingHorizontal: 16,
            flex: 1,
        },
        sectionWrapper: {
            backgroundColor: theme.centerChannelBg,
        },
    };
});
