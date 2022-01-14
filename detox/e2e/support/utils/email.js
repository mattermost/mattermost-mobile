// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import axios from 'axios';
import jestExpect from 'expect';

import testConfig from '@support/test_config';

/**
 * Get email url.
 * @returns {string} email url
 */
export const getEmailUrl = () => {
    const smtpUrl = testConfig.smtpUrl || 'http://localhost:9001';

    return `${smtpUrl}/api/v1/mailbox`;
};

/**
 * Get email reset email template.
 * @param {string} userEmail - the destination user email
 * @returns {string} email template
 */
export const getEmailResetEmailTemplate = (userEmail) => {
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
 * @param {string} sender - the email sender
 * @param {string} userEmail - the destination user email
 * @param {Object} team - the team to join
 * @param {boolean} isGuest - true if guest; otherwise false
 * @returns {string} email template
 */
export const getJoinEmailTemplate = (sender, userEmail, team, isGuest = false) => {
    const baseUrl = testConfig.siteUrl;

    return [
        `${sender} invited you to join the ${team.display_name} team.`,
        `${isGuest ? 'You were invited as a guest to collaborate with the team' : 'Start collaborating with your team on Mattermost'}`,
        '',
        `<join-link-check> Join now ( ${baseUrl}/signup_user_complete/?d=${encodeURIComponent(JSON.stringify({display_name: team.display_name.replace(' ', '+'), email: userEmail, name: team.name}))}&t=<actual-token> )`,
        '',
        'What is Mattermost?',
        'Mattermost is a flexible, open source messaging platform that enables secure team collaboration.',
        'Learn more ( mattermost.com )',
        '',
        '© 2021 Mattermost, Inc. 530 Lytton Avenue, Second floor, Palo Alto, CA, 94301',
    ];
};

/**
 * Get mention email template.
 * @param {string} sender - the email sender
 * @param {string} message - the email message
 * @param {string} postId - the post id where user is mentioned
 * @param {string} siteName - the site name
 * @param {string} teamName - the team name where user is mentioned
 * @param {string} channelDisplayName - the channel display name where user is mentioned
 * @@returns {string} email template
 */
export const getMentionEmailTemplate = (sender, message, postId, siteName, teamName, channelDisplayName) => {
    const baseUrl = testConfig.siteUrl;

    return [
        `@${sender} mentioned you in a message`,
        `While you were away, @${sender} mentioned you in the ${channelDisplayName} channel.`,
        '',
        `View Message ( ${baseUrl}/landing#/${teamName}/pl/${postId} )`,
        '',
        `@${sender}`,
        '<skip-local-time-check>',
        channelDisplayName,
        '',
        message,
        '',
        'Want to change your notifications settings?',
        `Login to ${siteName} ( ${baseUrl} ) and go to Settings > Notifications`,
        '',
        '© 2021 Mattermost, Inc. 530 Lytton Avenue, Second floor, Palo Alto, CA, 94301',
    ];
};

/**
 * Get password reset email template.
 * @returns {string} email template
 */
export const getPasswordResetEmailTemplate = () => {
    const baseUrl = testConfig.siteUrl;

    return [
        'Reset Your Password',
        'Click the button below to reset your password. If you didn’t request this, you can safely ignore this email.',
        '',
        `<reset-password-link-check> Reset Password ( http://${baseUrl}/reset_password_complete?token=<actual-token> )`,
        '',
        'The password reset link expires in 24 hours.',
        '',
        '© 2021 Mattermost, Inc. 530 Lytton Avenue, Second floor, Palo Alto, CA, 94301',
    ];
};

/**
 * Get email verify email template.
 * @param {string} userEmail - the destination user email
 * @returns {string} email template
 */
export const getEmailVerifyEmailTemplate = (userEmail) => {
    const baseUrl = testConfig.siteUrl;

    return [
        'Verify your email address',
        `Thanks for joining ${baseUrl.split('/')[2]}. ( ${baseUrl} )`,
        'Click below to verify your email address.',
        '',
        `<email-verify-link-check> Verify Email ( ${baseUrl}/do_verify_email?token=<actual-token>&email=${encodeURIComponent(userEmail)} )`,
        '',
        'This email address was used to create an account with Mattermost.',
        'If it was not you, you can safely ignore this email.',
        '',
        '© 2021 Mattermost, Inc. 530 Lytton Avenue, Second floor, Palo Alto, CA, 94301',
    ];
};

/**
 * Get welcome email template.
 * @param {string} userEmail - the destination user email
 * @param {string} siteName - the site name
 * @param {string} teamName - the team name where user is welcome
 * @returns {string} email template
 */
export const getWelcomeEmailTemplate = (userEmail, siteName, teamName) => {
    const baseUrl = testConfig.siteUrl;

    return [
        'Welcome to the team',
        `Thanks for joining ${baseUrl.split('/')[2]}. ( ${baseUrl} )`,
        'Click below to verify your email address.',
        '',
        `<email-verify-link-check> Verify Email ( ${baseUrl}/do_verify_email?token=<actual-token>&email=${encodeURIComponent(userEmail)}&redirect_to=/${teamName} )`,
        '',
        `This email address was used to create an account with ${siteName}.`,
        'If it was not you, you can safely ignore this email.',
        '',
        'Download the desktop and mobile apps',
        'For the best experience, download the apps for PC, Mac, iOS and Android.',
        '',
        'Download ( https://mattermost.com/download/#mattermostApps )',
        '',
        '© 2021 Mattermost, Inc. 530 Lytton Avenue, Second floor, Palo Alto, CA, 94301',
    ];
};

/**
 * Verify email body.
 * @param {string} expectedBody - expected email body
 * @param {*} actualBody - actual email body
 */
export const verifyEmailBody = (expectedBody, actualBody) => {
    jestExpect(expectedBody.length).toEqual(actualBody.length);

    for (let i = 0; i < expectedBody.length; i++) {
        if (expectedBody[i].includes('skip-local-time-check')) {
            continue;
        }

        if (expectedBody[i].includes('email-verify-link-check')) {
            jestExpect(actualBody[i]).toContain('Verify Email');
            jestExpect(actualBody[i]).toContain('do_verify_email?token=');
            continue;
        }

        if (expectedBody[i].includes('join-link-check')) {
            jestExpect(actualBody[i]).toContain('Join now');
            jestExpect(actualBody[i]).toContain('signup_user_complete/?d=');
            continue;
        }

        if (expectedBody[i].includes('reset-password-link-check')) {
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
export const getRecentEmail = async (username, mailUrl = getEmailUrl()) => {
    const mailboxUrl = `${mailUrl}/${username}`;
    let response;
    let recentEmail;

    try {
        response = await axios({url: mailboxUrl, method: 'get'});
        recentEmail = response.data[response.data.length - 1];
    } catch (error) {
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
    } catch (error) {
        return {status: error.status, data: null};
    }

    return {status: response.status, data: recentEmailMessage};
};

/**
 * Split email body text.
 * @param {string} text
 * @return {string} split text
 */
export const splitEmailBodyText = (text) => {
    return text.split('\n').map((d) => d.trim());
};
