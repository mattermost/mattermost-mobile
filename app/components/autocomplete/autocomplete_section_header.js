// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {ActivityIndicator, View} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';
import {DeviceTypes, ViewTypes} from 'app/constants';

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

        const padding = DeviceTypes.IS_IPHONE_X && isLandscape ? {paddingHorizontal: ViewTypes.IOS_HORIZONTAL_LANDSCAPE} : {paddingHorizontal: 8};

        return (
            <View style={style.sectionWrapper}>
                <View style={[style.section, padding]}>
                    <FormattedText
                        id={id}
                        defaultMessage={defaultMessage}
                        style={style.sectionText}
                    />
                    {loading && <ActivityIndicator size='small'/>}
                </View>
            </View>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        section: {
            justifyContent: 'center',
            paddingHorizontal: 8,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderTopWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.2),
            flexDirection: 'row',
        },
        sectionText: {
            fontSize: 12,
            color: changeOpacity(theme.centerChannelColor, 0.7),
            paddingVertical: 7,
            flex: 1,
        },
        sectionWrapper: {
            backgroundColor: theme.centerChannelBg,
        },
    };
});
