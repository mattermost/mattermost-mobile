// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {smtpUrl} from '@support/test_config';
import axios from 'axios';
import jestExpect from 'expect';

const currentYear = new Date().getFullYear();

/**
 * Get email url.
 * @returns {string} email url
 */
export const getEmailUrl = (): string => {
    const smtpUrlBase = smtpUrl || 'http://localhost:9001';

    return `${smtpUrlBase}/api/v1/mailbox`;
};

/**
 * Get email reset email template.
 * @param {string} userEmail - the destination user email
 * @returns {string} email template
 */
export const getEmailResetEmailTemplate = (userEmail: string): string[] => {
    return [
        '----------------------',
        'You updated your email',
        '----------------------',
        '',
        `Your email address for Mattermost has been changed to ${userEmail}.`,
        'If you did not make this change, please contact the system administrator.',
        '',
        'To change your notification preferences, log in to your team site and go to Settings > Notifications.',
    ];
};

/**
 * Get join email template.
 * @param {string} siteUrl - the site url
 * @param {string} sender - the email sender
 * @param {string} userEmail - the destination user email
 * @param {Object} team - the team to join
 * @param {boolean} isGuest - true if guest; otherwise false
 * @returns {string} email template
 */
export const getJoinEmailTemplate = (siteUrl: string, sender: string, userEmail: string, team: any, isGuest = false): string[] => {
    return [
        `${sender} invited you to join the ${team.display_name} team.`,
        `${isGuest ? 'You were invited as a guest to collaborate with the team' : 'Start collaborating with your team on Mattermost'}`,
        '',
        `<join-link-check> Join now ( ${siteUrl}/signup_user_complete/?d=${encodeURIComponent(JSON.stringify({display_name: team.display_name.replace(' ', '+'), email: userEmail, name: team.name}))}&t=<actual-token> )`,
        '',
        'What is Mattermost?',
        'Mattermost is a flexible, open source messaging platform that enables secure team collaboration.',
        'Learn more ( mattermost.com )',
        '',
        `© ${currentYear} Mattermost, Inc. 530 Lytton Avenue, Second floor, Palo Alto, CA, 94301`,
    ];
};

/**
 * Get mention email template.
 * @param {string} siteUrl - the site url
 * @param {string} sender - the email sender
 * @param {string} message - the email message
 * @param {string} postId - the post id where user is mentioned
 * @param {string} siteName - the site name
 * @param {string} teamName - the team name where user is mentioned
 * @param {string} channelDisplayName - the channel display name where user is mentioned
 * @@returns {string} email template
 */
export const getMentionEmailTemplate = (siteUrl: string, sender: string, message: string, postId: string, siteName: string, teamName: string, channelDisplayName: string): string[] => {
    return [
        `@${sender} mentioned you in a message`,
        `While you were away, @${sender} mentioned you in the ${channelDisplayName} channel.`,
        '',
        `View Message ( ${siteUrl}/landing#/${teamName}/pl/${postId} )`,
        '',
        `@${sender}`,
        '<skip-local-time-check>',
        channelDisplayName,
        '',
        message,
        '',
        'Want to change your notifications settings?',
        `Login to ${siteName} ( ${siteUrl} ) and go to Settings > Notifications`,
        '',
        `© ${currentYear} Mattermost, Inc. 530 Lytton Avenue, Second floor, Palo Alto, CA, 94301`,
    ];
};

/**
 * Get password reset email template.
 * @param {string} siteUrl - the site url
 * @returns {string} email template
 */
export const getPasswordResetEmailTemplate = (siteUrl: string): string[] => {
    return [
        'Reset Your Password',
        'Click the button below to reset your password. If you didn’t request this, you can safely ignore this email.',
        '',
        `<reset-password-link-check> Reset Password ( http://${siteUrl}/reset_password_complete?token=<actual-token> )`,
        '',
        'The password reset link expires in 24 hours.',
        '',
        `© ${currentYear} Mattermost, Inc. 530 Lytton Avenue, Second floor, Palo Alto, CA, 94301`,
    ];
};

/**
 * Get email verify email template.
 * @param {string} siteUrl - the site url
 * @param {string} userEmail - the destination user email
 * @returns {string} email template
 */
export const getEmailVerifyEmailTemplate = (siteUrl: string, userEmail: string): string[] => {
    return [
        'Verify your email address',
        `Thanks for joining ${siteUrl.split('/')[2]}. ( ${siteUrl} )`,
        'Click below to verify your email address.',
        '',
        `<email-verify-link-check> Verify Email ( ${siteUrl}/do_verify_email?token=<actual-token>&email=${encodeURIComponent(userEmail)} )`,
        '',
        'This email address was used to create an account with Mattermost.',
        'If it was not you, you can safely ignore this email.',
        '',
        `© ${currentYear} Mattermost, Inc. 530 Lytton Avenue, Second floor, Palo Alto, CA, 94301`,
    ];
};

/**
 * Get welcome email template.
 * @param {string} siteUrl - the site url
 * @param {string} userEmail - the destination user email
 * @param {string} siteName - the site name
 * @param {string} teamName - the team name where user is welcome
 * @returns {string} email template
 */
export const getWelcomeEmailTemplate = (siteUrl: string, userEmail: string, siteName: string, teamName: string): string[] => {
    return [
        'Welcome to the team',
        `Thanks for joining ${siteUrl.split('/')[2]}. ( ${siteUrl} )`,
        'Click below to verify your email address.',
        '',
        `<email-verify-link-check> Verify Email ( ${siteUrl}/do_verify_email?token=<actual-token>&email=${encodeURIComponent(userEmail)}&redirect_to=/${teamName} )`,
        '',
        `This email address was used to create an account with ${siteName}.`,
        'If it was not you, you can safely ignore this email.',
        '',
        'Download the desktop and mobile apps',
        'For the best experience, download the apps for PC, Mac, iOS and Android.',
        '',
        'Download ( https://mattermost.com/download/#mattermostApps )',
        '',
        `© ${currentYear} Mattermost, Inc. 530 Lytton Avenue, Second floor, Palo Alto, CA, 94301`,
    ];
};

/**
 * Verify email body.
 * @param {string} expectedBody - expected email body
 * @param {*} actualBody - actual email body
 */
export const verifyEmailBody = (expectedBody: string[], actualBody: string[]) => {
    jestExpect(expectedBody.length).toEqual(actualBody.length);

    for (let i = 0; i < expectedBody.length; i++) {
        if (expectedBody[i]?.includes('skip-local-time-check')) {
            continue;
        }

        if (expectedBody[i]?.includes('email-verify-link-check')) {
            jestExpect(actualBody[i]).toContain('Verify Email');
            jestExpect(actualBody[i]).toContain('do_verify_email?token=');
            continue;
        }

        if (expectedBody[i]?.includes('join-link-check')) {
            jestExpect(actualBody[i]).toContain('Join now');
            jestExpect(actualBody[i]).toContain('signup_user_complete/?d=');
            continue;
        }

        if (expectedBody[i]?.includes('reset-password-link-check')) {
            jestExpect(actualBody[i]).toContain('Reset Password');
            jestExpect(actualBody[i]).toContain('reset_password_complete?token=');
            continue;
        }

        jestExpect(expectedBody[i]).toEqual(actualBody[i]);
    }
};

/**
 * Get recent email.
 * @param {string} username - username of email recipient
 * @param {string} mailUrl - url of email
 */
export const getRecentEmail = async (username: string, mailUrl: string = getEmailUrl()): Promise<any> => {
    const mailboxUrl = `${mailUrl}/${username}`;
    let response;
    let recentEmail;

    try {
        response = await axios({url: mailboxUrl, method: 'get'});
        recentEmail = response.data[response.data.length - 1];
    } catch (error: any) {
        return {status: error.status, data: null};
    }

    if (!recentEmail || !recentEmail.id) {
        return {status: 501, data: null};
    }

    let recentEmailMessage;
    const mailMessageUrl = `${mailboxUrl}/${recentEmail.id}`;
    try {
        response = await axios({url: mailMessageUrl, method: 'get'});
        recentEmailMessage = response.data;
    } catch (error: any) {
        return {status: error.status, data: null};
    }

    return {status: response.status, data: recentEmailMessage};
};

/**
 * Split email body text.
 * @param {string} text
 * @return {string} split text
 */
export const splitEmailBodyText = (text: string): string[] => {
    return text.split('\n').map((d) => d.trim());
};
