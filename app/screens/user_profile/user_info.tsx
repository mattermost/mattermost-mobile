// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useRef, useState} from 'react';

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

const emptyList = [] as DisplayCustomAttribute[]; /** avoid re-renders **/

const UserInfo = ({localTime, showCustomStatus, showLocalTime, showNickname, showPosition, user, enableCustomAttributes}: Props) => {
    const customStatus = getUserCustomStatus(user);
    const serverUrl = useServerUrl();
    const [customAttributes, setCustomAttributes] = useState<DisplayCustomAttribute[]>([]);
    const lastRequest = useRef(0);

    useEffect(() => {
        if (enableCustomAttributes) {
            const fetchData = async () => {
                const reqTime = Date.now();
                lastRequest.current = reqTime;
                try {
                    const client = NetworkManager.getClient(serverUrl);
                    const [fields, attrValues] = await Promise.all([
                        client.getCustomProfileAttributeFields(),
                        client.getCustomProfileAttributeValues(user.id),
                    ]);

                    // ignore results if there was a newer request
                    if (fields && lastRequest.current === reqTime) {
                        const attributes = fields.map((field) => {
                            if (attrValues[field.id]) {
                                return ({
                                    id: field.id,
                                    name: field.name,
                                    value: attrValues[field.id] || '',
                                } as DisplayCustomAttribute);
                            }
                            return {} as DisplayCustomAttribute; // this will be cleaned out in CustomAttributes along with the fixed attributes.
                        });
                        setCustomAttributes(attributes);
                    }
                } catch {
                    setCustomAttributes(emptyList);
                }
            };

            fetchData();
        } else {
            setCustomAttributes(emptyList);
        }
    }, [enableCustomAttributes, serverUrl, user.id]);

    return (
        <>
            {showCustomStatus && <UserProfileCustomStatus customStatus={customStatus!}/>}
            <CustomAttributes
                nickname={showNickname ? user.nickname : undefined}
                position={showPosition ? user.position : undefined}
                localTime={showLocalTime ? localTime : undefined}
                customAttributes={customAttributes}
            />
        </>
    );
};

export default UserInfo;
