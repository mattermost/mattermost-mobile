// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import {Text} from 'react-native';
import PropTypes from 'prop-types';
import Button from 'react-native-button';

import {preventDoubleTap} from 'app/utils/tap';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

export default class InteractiveAction extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            doPostAction: PropTypes.func.isRequired,
        }).isRequired,
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        postId: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
    };

    handleActionPress = preventDoubleTap(() => {
        const {actions, id, postId} = this.props;
        actions.doPostAction(postId, id);
    });

    render() {
        const {name, theme} = this.props;
        const style = getStyleSheet(theme);

        return (
            <Button
                containerStyle={style.button}
                onPress={this.handleActionPress}
            >
                <Text style={style.text}>{name}</Text>
            </Button>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        button: {
            borderRadius: 2,
            backgroundColor: theme.buttonBg,
            alignItems: 'center',
            marginBottom: 2,
            marginRight: 5,
            marginTop: 10,
            paddingHorizontal: 10,
            paddingVertical: 7,
        },
        text: {
            color: theme.buttonColor,
            fontSize: 12,
            fontWeight: '600',
        },
    };
});
