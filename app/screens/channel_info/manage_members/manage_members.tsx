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

interface ManageMembersProps {
    testID?: string;
    canManageUsers: boolean;
    isDirectMessage: boolean;
    membersCount: number;
    separator: boolean;
    theme: Theme;
}

export default class ManageMembers extends PureComponent<ManageMembersProps> {
    static contextTypes = {
        intl: intlShape.isRequired,
    };

    static defaultProps = {
        separator: true,
    };

    goToChannelMembers = preventDoubleTap(() => {
        const {canManageUsers} = this.props;
        const {intl} = this.context;
        const id = canManageUsers ? t('channel_header.manageMembers') : t('channel_header.viewMembers');
        const defaultMessage = canManageUsers ? 'Manage Members' : 'View Members';
        const screen = 'ChannelMembers';
        const title = intl.formatMessage({id, defaultMessage});

        goToScreen(screen, title);
    });

    render() {
        const {isDirectMessage, canManageUsers, membersCount, separator, testID, theme} = this.props;

        if (isDirectMessage) {
            return null;
        }

        return (
            <>
                {separator && <Separator theme={theme}/>}
                <ChannelInfoRow
                    testID={testID}
                    action={this.goToChannelMembers}
                    defaultMessage={canManageUsers ? 'Manage Members' : 'View Members'}
                    detail={membersCount}
                    icon='account-multiple-outline'
                    textId={canManageUsers ? t('channel_header.manageMembers') : t('channel_header.viewMembers')}
                    theme={theme}
                />
            </>
        );
    }
}
