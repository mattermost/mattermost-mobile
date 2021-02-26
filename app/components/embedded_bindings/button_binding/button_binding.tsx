// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import Button from 'react-native-button';
import {intlShape} from 'react-intl';

import {preventDoubleTap} from 'app/utils/tap';
import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';
import {getStatusColors} from '@utils/message_attachment_colors';
import ButtonBindingText from './button_binding_text';
import {Theme} from '@mm-redux/types/preferences';
import {ActionResult} from '@mm-redux/types/actions';
import {AppBinding, AppCall} from '@mm-redux/types/apps';
import {Post} from '@mm-redux/types/posts';
import {AppExpandLevels, AppBindingLocations} from '@mm-redux/constants/apps';

type Props = {
    actions: {
        doAppCall: (call: AppCall, intl: any) => Promise<ActionResult>;
    };
    post: Post;
    binding: AppBinding;
    theme: Theme;
    userId: string;
}
export default class ButtonBinding extends PureComponent<Props> {
    static contextTypes = {
        intl: intlShape.isRequired,
    };
    handleActionPress = preventDoubleTap(() => {
        const {binding, post, userId} = this.props;
        const call: AppCall = {
            path: binding.call?.path || '',
            expand: {
                post: AppExpandLevels.EXPAND_ALL,
            },
            context: {
                ...binding.call?.context,
                acting_user_id: userId,
                app_id: binding.app_id,
                channel_id: post.channel_id,
                location: AppBindingLocations.IN_POST + '/' + binding.location,
                post_id: post.id,
                user_id: userId,
            },
        };
        this.props.actions.doAppCall(call, this.context.intl);
    }, 4000);

    render() {
        const {theme, binding} = this.props;
        const style = getStyleSheet(theme);

        return (
            <Button
                containerStyle={[style.button]}
                disabledContainerStyle={style.buttonDisabled}
                onPress={this.handleActionPress}
            >
                <ButtonBindingText
                    message={binding.label}
                    style={style.text}
                />
            </Button>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    const STATUS_COLORS = getStatusColors(theme);
    return {
        button: {
            borderRadius: 4,
            borderColor: changeOpacity(STATUS_COLORS.default, 0.25),
            borderWidth: 2,
            opacity: 1,
            alignItems: 'center',
            marginTop: 12,
            justifyContent: 'center',
            height: 36,
        },
        buttonDisabled: {
            backgroundColor: changeOpacity(theme.buttonBg, 0.3),
        },
        text: {
            color: STATUS_COLORS.default,
            fontSize: 15,
            fontWeight: '600',
            lineHeight: 17,
        },
    };
});
