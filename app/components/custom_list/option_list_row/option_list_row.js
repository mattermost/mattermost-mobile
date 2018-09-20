// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    Text,
    View,
} from 'react-native';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

import CustomListRow from 'app/components/custom_list/custom_list_row';

export default class OptionListRow extends React.PureComponent {
    static propTypes = {
        id: PropTypes.string,
        theme: PropTypes.object.isRequired,
        ...CustomListRow.propTypes,
    };

    static contextTypes = {
        intl: intlShape,
    };

    onPress = () => {
        if (this.props.onPress) {
            this.props.onPress(this.props.id, this.props.item);
        }
    };

    render() {
        const {
            enabled,
            selectable,
            selected,
            theme,
            item,
        } = this.props;

        const {text, value} = item;
        const style = getStyleFromTheme(theme);

        return (
            <CustomListRow
                id={value}
                theme={theme}
                onPress={this.onPress}
                enabled={enabled}
                selectable={selectable}
                selected={selected}
            >
                <View style={style.textContainer}>
                    <View>
                        <Text style={style.optionText}>
                            {text}
                        </Text>
                    </View>
                </View>
            </CustomListRow>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flexDirection: 'row',
            height: 65,
            paddingHorizontal: 15,
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg,
        },
        optionText: {
            fontSize: 15,
            color: theme.centerChannelColor,
        },
    };
});
