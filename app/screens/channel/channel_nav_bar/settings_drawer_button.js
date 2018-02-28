// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {
    TouchableOpacity,
    View,
} from 'react-native';

import Icon from 'react-native-vector-icons/Ionicons';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {preventDoubleTap} from 'app/utils/tap';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

class SettingDrawerButton extends PureComponent {
    static propTypes = {
        openDrawer: PropTypes.func.isRequired,
        theme: PropTypes.object,
    };

    static defaultProps = {
        theme: {},
    };

    handlePress = preventDoubleTap(() => {
        this.props.openDrawer();
    });

    render() {
        const {theme} = this.props;
        const style = getStyleFromTheme(theme);

        const icon = (
            <Icon
                name='md-more'
                size={25}
                color={theme.sidebarHeaderTextColor}
            />
        );

        return (
            <TouchableOpacity
                onPress={this.handlePress}
                style={style.container}
            >
                <View style={style.wrapper}>
                    {icon}
                </View>
            </TouchableOpacity>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            width: 44,
        },
        wrapper: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'column',
            justifyContent: 'center',
            marginLeft: 8,
        },
        mention: {
            color: theme.mentionColor,
            fontSize: 10,
        },
    };
});

function mapStateToProps(state) {
    return {
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(SettingDrawerButton);
