// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {connect} from 'react-redux';
import {
    Dimensions,
    Platform,
    StyleSheet,
    View
} from 'react-native';

import {getTheme} from 'app/selectors/preferences';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

class NavBar extends PureComponent {
    static propTypes = {
        left: PropTypes.node.isRequired,
        title: PropTypes.node.isRequired,
        right: PropTypes.node,
        theme: PropTypes.object
    };

    render() {
        const {left, right, theme, title} = this.props;
        const style = getStyleSheet(theme);

        return (
            <View style={style.header}>
                <View style={style.left}>
                    {left}
                </View>
                <View style={style.title}>
                    {title}
                </View>
                {
                    right && <View style={style.right}>
                        {right}
                    </View>
                }
            </View>
        );
    }
}

function mapStateToProps(state) {
    return {
        theme: getTheme(state)
    };
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        header: {
            backgroundColor: theme.sidebarHeaderBg,
            flexDirection: 'row',
            justifyContent: 'flex-start',
            width: Dimensions.get('window').width,
            zIndex: 10,
            elevation: 2,
            ...Platform.select({
                android: {
                    height: 46
                },
                ios: {
                    height: 64,
                    paddingTop: 20
                }
            })
        },
        left: {
            paddingHorizontal: 10,
            justifyContent: 'center'
        },
        title: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 15
        },
        right: {
            alignItems: 'center',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingHorizontal: 10
        }
    });
});

export default connect(mapStateToProps)(NavBar);
