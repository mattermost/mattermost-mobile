// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import CombinedJoinLeaveMessage from 'app/components/combined_joinleave_message/';
import ChannelSystemMessage from 'app/components/channel_system_message/channel_system_message';
import {Posts} from 'mattermost-redux/constants';


export default class SystemMessage extends React.PureComponent {

    render() {
        const {postType, navigator, theme, textStyles} = this.props;
        return (postType === Posts.POST_TYPES.PURPOSE_CHANGE || postType === Posts.POST_TYPES.HEADER_CHANGE ||
                    postType === Posts.POST_TYPES.DISPLAYNAME_CHANGE || postType === Posts.POST_TYPES.CHANNEL_DELETED) ?
                        <ChannelSystemMessage
                            post={this.props.post}
                            theme={theme}
                            navigator={navigator}
                            textStyles={textStyles}
                        />
                    :
                    (postType === Posts.POST_TYPES.COMBINED_USER_ACTIVITY) ?
                        <CombinedJoinLeaveMessage
                            allUserIds={this.props.allUserIds}
                            allUsernames={this.props.allUsernames}
                            linkStyle={textStyles.link}
                            messageData={this.props.messageData}
                            navigator={navigator}
                            textStyles={textStyles}
                            theme={theme}
                        /> 
                    :
                        null;    
    }
}