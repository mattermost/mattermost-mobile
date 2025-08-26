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

    /** type of values accepted. **/
    type: string;

    /** any extra properties of the field **/
    attrs?: {
        sort_order?: number;
        saml?: string;
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
 * @description Type representing a custom profile attribute with its field ID, user ID, and value.
 **/
type CustomProfileAttribute = {

    /** ID of the custom profile attribute */
    id: string;

    /** ID of the custom profile field this attribute is for */
    field_id: string;

    /** ID of the user this attribute belongs to */
    user_id: string;

    /** Value of the attribute */
    value: string;
}

/**
 * UserCustomProfileAttributeSimple
 * @description simpler type to display a field id with its value, when we already know it all belongs to the same user
 **/
type UserCustomProfileAttributeSimple = {
    [field_id: string]: string|string[];
}

export type CustomAttribute = {
    id: string;
    name: string;
    value: string;
    type: string;
    sort_order?: number;
}

export interface CustomAttributeSet {
    [key: string]: CustomAttribute;
}
