// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {intlShape} from 'react-intl';

import {goToScreen} from '@actions/navigation';
import {Theme} from '@mm-redux/types/preferences';
import ChannelInfoRow from '@screens/channel_info/channel_info_row';
import Separator from '@screens/channel_info/separator';
import {t} from '@utils/i18n';
import {preventDoubleTap} from '@utils/tap';

interface AddMembersProps {
    testID?: string;
    canManageUsers: boolean;
    groupConstrained: boolean;
    theme: Theme;
}

export default class AddMembers extends PureComponent<AddMembersProps> {
    static contextTypes = {
        intl: intlShape.isRequired,
    };

    goToChannelAddMembers = preventDoubleTap(() => {
        const {intl} = this.context;
        const screen = 'ChannelAddMembers';
        const title = intl.formatMessage({id: 'channel_header.addMembers', defaultMessage: 'Add Members'});

        goToScreen(screen, title);
    });

    render() {
        const {canManageUsers, groupConstrained, testID, theme} = this.props;

        if (canManageUsers && !groupConstrained) {
            return (
                <>
                    <Separator theme={theme}/>
                    <ChannelInfoRow
                        testID={testID}
                        action={this.goToChannelAddMembers}
                        defaultMessage='Add Members'
                        icon='account-plus-outline'
                        textId={t('channel_header.addMembers')}
                        theme={theme}
                    />
                </>
            );
        }

        return null;
    }
}
