// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';

import {useServerUrl} from '@context/server';
import NetworkManager from '@managers/network_manager';
import {getUserCustomStatus} from '@utils/user';

import CustomAttributes from './custom_attributes';
import UserProfileCustomStatus from './custom_status';

import type {UserModel} from '@database/models/server';

type Props = {
    localTime?: string;
    showCustomStatus: boolean;
    showLocalTime: boolean;
    showNickname: boolean;
    showPosition: boolean;
    user: UserModel;
    enableCustomAttributes?: boolean;
}

const UserInfo = ({localTime, showCustomStatus, showLocalTime, showNickname, showPosition, user, enableCustomAttributes}: Props) => {
    const customStatus = getUserCustomStatus(user);
    const serverUrl = useServerUrl();
    const [customAttributes, setCustomAttributes] = useState<DisplayCustomAttribute[]>([]);

    useEffect(() => {
        if (enableCustomAttributes) {
            const fetchData = async () => {
                try {
                    const client = NetworkManager.getClient(serverUrl);
                    const fields = await client.getCustomProfileAttributeFields();
                    const attrValues = await client.getCustomProfileAttributeValues(user.id);
                    if (fields) {
                        const attributes = fields.map((field) => ({
                            id: field.id,
                            name: field.name,
                            value: attrValues[field.id] || '',
                        }));
                        setCustomAttributes(attributes);
                    }
                } catch {
                    setCustomAttributes([]);
                }
            };

            fetchData();
        }
    }, [enableCustomAttributes, serverUrl, user.id]);

    return (
        <>
            {showCustomStatus && <UserProfileCustomStatus customStatus={customStatus!}/>}
            <CustomAttributes
                nickname={showNickname ? user.nickname : undefined}
                position={showPosition ? user.position : undefined}
                localTime={showLocalTime ? localTime : undefined}
                customAttributes={enableCustomAttributes ? customAttributes : []}
            />
        </>
    );
};

export default UserInfo;
