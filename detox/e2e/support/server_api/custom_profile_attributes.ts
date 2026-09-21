// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import client from './client';
import {getResponseFromError} from './common';

export const apiListCustomProfileAttributeFields = async (baseUrl: string): Promise<any> => {
    try {
        const response = await client.get(
            `${baseUrl}/api/v4/custom_profile_attributes/fields`,
        );
        return {fields: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

export const apiCreateCustomProfileAttributeField = async (baseUrl: string, field: {name: string; type?: string}): Promise<any> => {
    try {
        const response = await client.post(
            `${baseUrl}/api/v4/custom_profile_attributes/fields`,
            {
                type: 'text',
                ...field,
            },
        );
        return {field: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

export const apiDeleteCustomProfileAttributeField = async (baseUrl: string, fieldId: string): Promise<any> => {
    try {
        return await client.delete(`${baseUrl}/api/v4/custom_profile_attributes/fields/${fieldId}`);
    } catch (err) {
        return getResponseFromError(err);
    }
};

export const apiUpdateCustomProfileAttributeValues = async (baseUrl: string, values: Record<string, string>): Promise<any> => {
    try {
        return await client.patch(
            `${baseUrl}/api/v4/custom_profile_attributes/values`,
            values,
        );
    } catch (err) {
        return getResponseFromError(err);
    }
};

export const CustomProfileAttributes = {
    apiCreateCustomProfileAttributeField,
    apiDeleteCustomProfileAttributeField,
    apiListCustomProfileAttributeFields,
    apiUpdateCustomProfileAttributeValues,
};

export default CustomProfileAttributes;
