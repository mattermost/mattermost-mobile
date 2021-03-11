// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Alert} from 'react-native';
import {intlShape, injectIntl} from 'react-intl';

import Separator from '@screens/channel_info/separator';

import ChannelInfoRow from '../channel_info_row';
import {AppBinding, AppCall} from '@mm-redux/types/apps';
import {Theme} from '@mm-redux/types/preferences';
import {Channel} from '@mm-redux/types/channels';
import {AppCallTypes, AppExpandLevels} from '@mm-redux/constants/apps';
import {UserProfile} from '@mm-redux/types/users';
import {dismissModal} from '@actions/navigation';
import {ActionResult} from '@mm-redux/types/actions';

type Props = {
    bindings: AppBinding[];
    theme: Theme;
    currentChannel: Channel;
    currentUser: UserProfile;
    appsEnabled: boolean;
    actions: {
        doAppCall: (call: AppCall, intl: any) => Promise<ActionResult>
    }
}

const Bindings: React.FC<Props> = (props: Props) => {
    if (!props.appsEnabled) {
        return null;
    }

    const {bindings, ...optionProps} = props;
    if (bindings.length === 0) {
        return null;
    }

    const options = bindings.map((b) => (
        <Option
            key={b.app_id + b.location}
            binding={b}
            {...optionProps}
        />
    ));

    return (
        <>
            {options}
        </>
    );
};

export default Bindings;

type OptionProps = {
    binding: AppBinding;
    theme: Theme;
    currentChannel: Channel;
    currentUser: UserProfile;
    intl: typeof intlShape;
    actions: {
        doAppCall: (call: AppCall, intl: any) => Promise<ActionResult>
    },
}

const Option = injectIntl((props: OptionProps) => {
    const onPress = async () => {
        const channelId = props.currentChannel.id;

        const res = await props.actions.doAppCall({
            type: AppCallTypes.SUBMIT,
            values: {
                ...props.binding.call?.values,
            },
            expand: {
                channel: AppExpandLevels.EXPAND_ALL,
                ...props.binding.call?.expand,
            },
            context: {
                app_id: props.binding.app_id,
                channel_id: channelId,
                location: props.binding.location,
                user_id: props.currentUser.id,
            },
            path: props.binding.call?.path || '',
        }, props.intl);

        if (res.error) {
            Alert.alert(res.error.message);
            return;
        }

        dismissModal();
    };

    const {binding, theme} = props;
    return (
        <>
            <Separator theme={theme}/>
            <ChannelInfoRow
                action={onPress}
                defaultMessage={binding.label}
                theme={theme}
                textId={binding.app_id + binding.location}
                image={{uri: binding.icon}}
            />
        </>
    );
});
