// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useEffect, useState} from 'react';
import {getUserCustomStatus} from '@utils/user';
import {useServerUrl} from '@context/server';
import NetworkManager from '@managers/network_manager';

import UserProfileCustomStatus from './custom_status';
import CustomAttributes from './custom_attributes';

import type {UserModel} from '@database/models/server';
import type {CustomAttribute} from './custom_attributes';

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
    const [customAttributes, setCustomAttributes] = useState<CustomAttribute[]>([]);
    const [attributeFields, setAttributeFields] = useState<{[key: string]: string}>({});

    useEffect(() => {
        if (enableCustomAttributes) {
            const fetchData = async () => {
                try {
                    const client = NetworkManager.getClient(serverUrl);
                    const fields = await client.getCustomProfileAttributeFields();
                    const userData = await client.getUser(user.id, {cpa: true});
                    
                    setAttributeFields(fields.reduce((acc: {[key: string]: string}, field: any) => {
                        acc[field.id] = field.name;
                        return acc;
                    }, {}));

                    if (userData.custom_profile_attributes) {
                        const attributes = Object.entries(userData.custom_profile_attributes).map(([id, value]) => ({
                            id,
                            label: fields.find((f: any) => f.id === id)?.name || id,
                            value: value as string,
                        }));
                        setCustomAttributes(attributes);
                    }
                } catch (error) {
                    // Handle error appropriately
                    console.error('Failed to fetch custom attributes:', error);
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
                enableCustomAttributes={enableCustomAttributes}
            />
        </>
    );
};

export default UserInfo;
