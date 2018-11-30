// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';

import ActionMenu from './action_menu';
import ActionButton from './action_button';

export default class AttachmentActions extends PureComponent {
    static propTypes = {
        actions: PropTypes.array,
        buttonColor: PropTypes.string,
        navigator: PropTypes.object.isRequired,
        postId: PropTypes.string.isRequired,
    };

    render() {
        const {
            actions,
            navigator,
            postId,
            buttonColor,
        } = this.props;

        if (!actions?.length) {
            return null;
        }

        const content = [];

        actions.forEach((action) => {
            if (!action.id || !action.name) {
                return;
            }

            switch (action.type) {
            case 'select':
                content.push(
                    <ActionMenu
                        key={action.id}
                        id={action.id}
                        name={action.name}
                        dataSource={action.data_source}
                        options={action.options}
                        postId={postId}
                        navigator={navigator}
                    />
                );
                break;
            case 'button':
            default:
                content.push(
                    <ActionButton
                        key={action.id}
                        id={action.id}
                        name={action.name}
                        buttonColor={buttonColor}
                        postId={postId}
                    />
                );
                break;
            }
        });

        return content;
    }
}
