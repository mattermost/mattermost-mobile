// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';

import Archived from './archived';
import DraftInput from './draft_input';
import ReadOnly from './read_only';

export default class PostDraft extends PureComponent {
    static propTypes = {
        canPost: PropTypes.bool.isRequired,
        channelId: PropTypes.string.isRequired,
        channelIsArchived: PropTypes.bool,
        channelIsReadOnly: PropTypes.bool.isRequired,
        deactivatedChannel: PropTypes.bool.isRequired,
        registerTypingAnimation: PropTypes.func.isRequired,
        rootId: PropTypes.string,
        screenId: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
    };

    draftInput = React.createRef();

    handleInputQuickAction = (value) => {
        if (this.draftInput?.current) {
            this.draftInput.current.handleInputQuickAction(value);
        }
    };

    render = () => {
        const {
            canPost,
            channelId,
            channelIsArchived,
            channelIsReadOnly,
            deactivatedChannel,
            registerTypingAnimation,
            rootId,
            screenId,
            theme,
        } = this.props;

        if (channelIsArchived || deactivatedChannel) {
            return (
                <Archived
                    defactivated={deactivatedChannel}
                    rootId={rootId}
                    theme={theme}
                />
            );
        }

        const readonly = channelIsReadOnly || !canPost;

        if (readonly) {
            return (
                <ReadOnly theme={theme}/>
            );
        }

        return (
            <DraftInput
                ref={this.draftInput}
                channelId={channelId}
                registerTypingAnimation={registerTypingAnimation}
                rootId={rootId}
                screenId={screenId}
                theme={theme}
            />
        );
    };
}
