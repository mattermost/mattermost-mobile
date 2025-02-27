// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * CustomProfileField
 * @description Each of the system properties is defined by a field.
 **/
type CustomProfileField = {

    /** server assigned id **/
    id: string;

    /** id of the group the field belongs to **/
    group_id: string;

    /** name of the field **/
    name: string;

    /** type of values accepted. Currently only text is supported **/
    type: string;

    /** any extra properties of the field **/
    attrs?: {
        sort_order?: number;
        [key: string]: unknown;
    };

    /** id of the target element if empty it is a system property **/
    target_id: string;

    /** type of element this is assigned to. Possible values user, post, card... if empty it is a system property **/
    target_type: string;
    create_at: number;
    update_at: number;
    delete_at: number;
};

/**
 * CustomProfileAttributeSimple
 * @description simpler type to display a field id with its value.
 **/
type CustomProfileAttributeSimple = {
    [field_id: string]: string;
}

export type CustomAttribute = {
    id: string;
    name: string;
    value: string;
    sort_order?: number;
}

export interface CustomAttributeSet {
    [key: string]: CustomAttribute;
}
