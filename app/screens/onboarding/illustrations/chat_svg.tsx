// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as React from 'react';
import {StyleProp, ViewStyle} from 'react-native';
import Svg, {
    G,
    Path,
    Mask,
    Ellipse,
    Defs,
    Pattern,
    Use,
    ClipPath,
    Image,
} from 'react-native-svg';

type SvgProps = {
    styles: StyleProp<ViewStyle>;
};

const ChatSvg = ({styles}: SvgProps) => {
    return (
        <Svg
            width={263}
            height={212}
            viewBox='0 0 263 212'
            fill='none'
            style={styles}
        >
            <G clipPath='url(#clip0_1023_92018)'>
                <Path
                    d='M176.396 29c-3.441 5.745-14.534 1.149-16.633 12.065 4.083 0 19.145 2.08 19.145 2.08L176.396 29z'
                    fill='#4A2407'
                />
                <Path
                    d='M159.269 86.21c-4.852 8.63-44.21 25.658-34.827 69.563 6.642 31.104 21.796 43.514 18.021 48.707-2.799 3.792-5.001 8.411 1.652 2.953 8.03-6.561 10.887-2.206 5.679-18.017-4.967-15.052-9.338-55.153 15.474-69.378 24.813-14.225 32.912-21.338 20.649-38.803-4.486-6.412-26.648 4.975-26.648 4.975z'
                    fill='#AD831F'
                />
                <Mask
                    id='a'

                    // @ts-expect-error style not intrinsic
                    style={{
                        maskType: 'alpha',
                    }}
                    maskUnits='userSpaceOnUse'
                    x={123}
                    y={79}
                    width={69}
                    height={131}
                >
                    <Path
                        d='M159.269 86.21c-4.852 8.63-44.21 25.658-34.827 69.562 6.642 31.105 21.796 43.515 18.021 48.708-2.799 3.792-5.001 8.411 1.652 2.953 8.03-6.561 10.887-2.206 5.679-18.017-4.967-15.052-9.338-55.153 15.474-69.378 24.813-14.225 32.912-21.338 20.649-38.803-4.486-6.412-26.648 4.975-26.648 4.975z'
                        fill='#FFBD00'
                    />
                </Mask>
                <G mask='url(#a)'>
                    <Path
                        transform='matrix(-1 0 0 1 191.812 79.024)'
                        fill='url(#pattern0)'
                        d='M0 0H54.3043V123.55H0z'
                    />
                </G>
                <Path
                    d='M139.516 193.726c.826-.23 7.846-2.459 10.507-3.585 4.887 14.937 1.974 10.835-5.907 17.293-6.654 5.457-4.451.839-1.652-2.953 1.514-2.114-.046-5.447-2.948-10.755z'
                    fill='#1C58D9'
                />
                <Path
                    d='M187.752 42.18l.631-12.766 1.709-4.71c-1.056-4.689-3.774-6.895-5.3-7.309-3.441-.85-5.391-.988-7.273.483-1.032.884-2.627 4.93-3.315 8.1-.367 1.712-1.147 3.08 0 4.137a19.554 19.554 0 002.489 1.666l.184 8.043 10.875 2.356z'
                    fill='#AD831F'
                />
                <Path
                    d='M176.396 21.118a14.637 14.637 0 00-3.109 2.045c-.39 1.149 2.627 2.298 2.627 2.298l.482-4.343z'
                    fill='#AD831F'
                />
                <Path
                    d='M180.365 32.838a8.292 8.292 0 01-3.625-1.023c-.402-.253.734.747 1.147.977a3.7 3.7 0 001.789.666c.482 0 1.17-.586.689-.62z'
                    fill='#8B6918'
                />
                <Path
                    d='M202.768 90.703c2.294 31.805 3.085 74.469 31.718 81.581 28.632 7.113 27.531 3.597 27.531 14.26s-2.214 9.088-3.522 2.298c-1.675-8.779-32.957 6.894-54.179-10.617-21.222-17.512-30.181-51.362-33.416-86.086-2.271-24.59 31.868-1.436 31.868-1.436z'
                    fill='#AD831F'
                />
                <Mask
                    id='b'

                    // @ts-expect-error style not intrinsic
                    style={{
                        maskType: 'alpha',
                    }}
                    maskUnits='userSpaceOnUse'
                    x={170}
                    y={80}
                    width={93}
                    height={115}
                >
                    <Path
                        d='M202.768 90.703c2.294 31.805 3.085 74.468 31.718 81.581 28.632 7.112 27.531 3.596 27.531 14.259s-2.214 9.089-3.522 2.298c-1.675-8.778-32.957 6.895-54.179-10.617-21.222-17.511-30.181-51.361-33.416-86.085-2.271-24.59 31.868-1.436 31.868-1.436z'
                        fill='#FFBD00'
                    />
                </Mask>
                <G mask='url(#b)'>
                    <Path
                        transform='matrix(-1 0 0 1 262.04 80.66)'
                        fill='url(#pattern1)'
                        d='M0 0H91.4598V99.0039H0z'
                    />
                </G>
                <Path
                    d='M250.271 175.824c12.389 2.631 11.758 2.551 11.758 10.674 0 10.663-2.214 9.089-3.522 2.298-.585-3.045-4.738-3.148-10.794-2.711a49.014 49.014 0 002.558-10.261z'
                    fill='#1C58D9'
                />
                <Path
                    d='M104.781 44.834c.665-1.15 6.217-1.333 12.744 3.976 6.527 5.308 17.138 11.915 28.942-2.448 10.588-12.903 17.632-8.043 28.357-7.618 3.809.483 19.18 2.448 23.103 2.804 5.736-.104 15.521 2.631 22.289-13.168 2.593-6.055 5.277-14.765 9.005-20.683 2.558-4.044 5.07-6.515 7.445-7.503 1.755-.724.78.667-.574 2.677-.906 1.368.104 1.207-.401 2.942-.298 1.011-.436 1.609-.769 2.482a20.454 20.454 0 00-.711 2.401c-.149.62-.298 1.276-.424 1.976l-.104.483c-1.376 7.56-2.122 18.649-3.154 23.107-3.602 15.34-11.471 24.394-25.845 27.577a257.068 257.068 0 01-.447 7.17c-2.581 36.195 1.089 26.428-22.404 26.428s-29.745 14.11-26.212-6.124c1.664-9.48 1.147-20.5 2.971-31.737-3.579 2.23-9.36 6.802-15.165 8.239-18.067 4.435-34.735-19.178-34.895-20.683-.253-2.321-4.405-1.114-3.751-2.298z'
                    fill='#AD831F'
                />
                <Path
                    d='M153.533 64.874c2.398-1.506 3.384-4.263 5.059-5.298a127.57 127.57 0 00-1.342 12.938c-.195 3.068-.344 6.09-.551 9.02a95.15 95.15 0 01-1.078 9.79c-3.533 20.223 2.719 6.136 26.212 6.102 20.568 0 20.316 7.503 21.669-14.938v-.15c.069-.964.127-1.976.195-3.044.149-2.46.322-5.205.54-8.296.183-2.62.344-4.999.447-7.17 6.298-1.402 11.356-1.861 15.36-5.573-2.065-5.94-4.715-13.696-8.672-18.626-4.233 2.448-8.546 2.034-11.919 1.92h-1.526l-2.03-.208c-1.48-.16-3.442-.39-5.518-.643-1.147 5.883-10.255 5.01-13.261 2.953A12.146 12.146 0 01173 38.629a81.189 81.189 0 01-3.671-.424c-1.181-.161-2.214-.31-3.28-.437-6.459-.782-12.148-.46-19.582 8.594-.459.563-.918 1.07-1.365 1.563a149.59 149.59 0 008.431 16.949z'
                    fill='#fff'
                />
                <Path
                    d='M153.533 64.874c2.398-1.506 3.384-4.263 5.059-5.298a127.57 127.57 0 00-1.342 12.938c-.195 3.068-.344 6.09-.551 9.02a95.15 95.15 0 01-1.078 9.79c-3.533 20.223 2.719 6.136 26.212 6.102 20.568 0 20.316 7.503 21.669-14.938v-.15c.069-.964.127-1.976.195-3.044.149-2.46.322-5.205.54-8.296.183-2.62.344-4.999.447-7.17 6.298-1.402 11.356-1.861 15.36-5.573-2.065-5.94-4.715-13.696-8.672-18.626-4.233 2.448-8.546 2.034-11.919 1.92h-1.526l-2.03-.208c-1.48-.16-3.442-.39-5.518-.643-1.147 5.883-10.255 5.01-13.261 2.953A12.146 12.146 0 01173 38.629a81.189 81.189 0 01-3.671-.424c-1.181-.161-2.214-.31-3.28-.437-6.459-.782-12.148-.46-19.582 8.594-.459.563-.918 1.07-1.365 1.563a149.59 149.59 0 008.431 16.949z'
                    fill='#fff'
                />
                <Path
                    d='M153.533 64.874c2.398-1.506 3.384-4.263 5.059-5.298a127.57 127.57 0 00-1.342 12.938c-.195 3.068-.344 6.09-.551 9.02a95.15 95.15 0 01-1.078 9.79c-3.533 20.223 2.719 6.136 26.212 6.102 20.568 0 20.316 7.503 21.669-14.938v-.15c.069-.964.127-1.976.195-3.044.149-2.46.322-5.205.54-8.296.183-2.62.344-4.999.447-7.17 6.298-1.402 11.356-1.861 15.36-5.573-2.065-5.94-4.715-13.696-8.672-18.626-4.233 2.448-8.546 2.034-11.919 1.92h-1.526l-2.03-.208c-1.48-.16-3.442-.39-5.518-.643-1.147 5.883-10.255 5.01-13.261 2.953A12.146 12.146 0 01173 38.629a81.189 81.189 0 01-3.671-.424c-1.181-.161-2.214-.31-3.28-.437-6.459-.782-12.148-.46-19.582 8.594-.459.563-.918 1.07-1.365 1.563a149.59 149.59 0 008.431 16.949z'
                    fill='#3F4350'
                    fillOpacity={0.08}
                />
                <Mask
                    id='c'

                    // @ts-expect-error style not intrinsic
                    style={{
                        maskType: 'alpha',
                    }}
                    maskUnits='userSpaceOnUse'
                    x={145}
                    y={37}
                    width={76}
                    height={66}
                >
                    <Path
                        d='M153.533 64.874c2.398-1.506 3.384-4.263 5.059-5.298a127.57 127.57 0 00-1.342 12.938c-.195 3.068-.344 6.09-.551 9.02a95.15 95.15 0 01-1.078 9.79c-3.533 20.223 2.719 6.136 26.212 6.102 20.568 0 20.316 7.503 21.669-14.938v-.15c.069-.964.127-1.976.195-3.044.149-2.46.322-5.205.54-8.296.183-2.62.344-4.999.447-7.17 6.298-1.402 11.356-1.861 15.36-5.573-2.065-5.94-4.715-13.696-8.672-18.626-4.233 2.448-8.546 2.034-11.919 1.92h-1.526l-2.03-.208c-1.48-.16-3.442-.39-5.518-.643-1.147 5.883-10.255 5.01-13.261 2.953A12.146 12.146 0 01173 38.629a81.189 81.189 0 01-3.671-.424c-1.181-.161-2.214-.31-3.28-.437-6.459-.782-12.148-.46-19.582 8.594-.459.563-.918 1.07-1.365 1.563a149.59 149.59 0 008.431 16.949z'
                        fill='#fff'
                    />
                </Mask>
                <G mask='url(#c)'>
                    <Path
                        transform='matrix(-1 0 0 1 237.95 -.343)'
                        fill='url(#pattern2)'
                        d='M0 0H90.6433V85.0943H0z'
                    />
                </G>
                <Path
                    d='M136.946 107.295a105.804 105.804 0 0015.222 17.178l.493.437a195.036 195.036 0 003.442 2.987c.462-.547.973-1.05 1.525-1.505l.505-.425c1.858-1.563 4.52-3.447 7.17-5.32 3.728-2.574 7.41-4.952 8.695-5.745.94 5.194 2.053 10.341 3.361 15.225l.172.654c.218.77.424 1.54.642 2.298a110.202 110.202 0 0025.673-3.573l.643-.184 1.319-.402c.15-.048.303-.086.459-.115-.161-1-.31-2.103-.459-3.298 0-.229 0-.448-.081-.678-1.583-13.65-2.409-38.251-2.225-42.296v-.149a15.072 15.072 0 01-1.411-1.31c-.191-.2-.386-.406-.585-.62-4.279-4.803-6.39-11.778-7.617-16.03.425-9.399 1.296-14.385 5.564-22.83-.539 0-2.719-.15-3.556-.242a61.53 61.53 0 00-5.002 19.821c-8.03-1.46-16.06-2.758-24.09-3.999a112.698 112.698 0 012.467-18.959c-1.147-.15-2.214-.31-3.281-.436a95.116 95.116 0 00-2.18 21.463c-.459 1.15-1.365 4.597-2.03 5.86a74.988 74.988 0 01-4.589 7.435c-.195 3.068-.344 6.09-.55 9.02-.207 2.93-.471 5.745-.884 8.491-3.98 3.585-10.415 8.273-16.541 14.696-.149.161-.31.322-.459.494-.574.644-1.193 1.333-1.812 2.057z'
                    fill='#1C58D9'
                />
                <Path
                    d='M187.856 88.416a4.124 4.124 0 002.535-.643c.998-.735 1.377-2.126 1.652-4.125.688-4.884.355-5.297-1.457-7.595-.585-.736-1.319-1.655-2.225-3a23.7 23.7 0 01-1.985-3.446c-1.147-2.436-1.617-2.988-7.468-4.125-9.464-1.839-10.198-1.287-12.951 2.367-.505.666-1.067 1.413-1.778 2.298-4.21 4.986-4.244 5.619-4.37 7.963 0 .632-.081 1.413-.218 2.447-.207 1.47-.218 2.447.332 3.171.861 1.15 2.845 1.368 7.617 1.954 1.962.241 4.405.54 7.399.988 2.294.345 4.302.666 6.046.954 2.269.42 4.565.685 6.871.793zm-9.017-22.67v.322c5.736 1.149 5.943 1.574 6.998 3.768a25.23 25.23 0 002.03 3.585 35.16 35.16 0 002.295 3.045c1.755 2.207 1.973 2.494 1.33 7.09-.298 2.16-.677 3.16-1.388 3.689-1.239.907-3.797.482-8.913-.368-1.744-.288-3.717-.61-6.057-.954-3.005-.448-5.449-.747-7.41-.988-4.314-.529-6.482-.804-7.17-1.7-.413-.54-.39-1.391-.206-2.678.149-1.057.183-1.861.218-2.505.126-2.172.149-2.746 4.221-7.572a41.556 41.556 0 001.79-2.298c2.523-3.332 2.982-3.941 12.308-2.126l-.046-.31z'
                    fill='#2D3039'
                />
                <Path
                    d='M184.299 68.825c.239.499.515.98.826 1.437.229.356-.333.689-.574.333-.31-.458-.587-.938-.826-1.436-.183-.38.402-.713.574-.334zM186.112 72.135c.39.609.78 1.149 1.204 1.77.241.344-.321.677-.573.333-.413-.575-.815-1.15-1.147-1.77-.322-.356.298-.69.516-.333zM188.979 76.041c.3.408.63.792.987 1.15.31.287-.161.757-.47.459-.36-.355-.69-.74-.987-1.15-.252-.333.207-.804.47-.459zM190.287 80.408c0-.425.631-.425.654 0 .034.44.034.881 0 1.321 0 .425-.688.425-.654 0 .035-.44.035-.882 0-1.321zM189.702 83.958c.069-.425.711-.24.631.173-.08.414-.184 1.149-.287 1.712-.103.563-.7.241-.631-.184l.287-1.7zM184.54 85.05c.838.23 1.694.392 2.558.482.413 0 .425.701 0 .655a16.798 16.798 0 01-2.73-.494.332.332 0 01-.075-.605.331.331 0 01.247-.038zM178.128 84.314c.838.054 1.673.154 2.5.3.425.068.241.7-.172.631a22.534 22.534 0 00-2.294-.264c-.459-.034-.459-.666-.034-.666zM171.853 83.59l2.294.288c.413 0 .413.712 0 .655l-2.294-.276c-.413-.058-.424-.724 0-.666zM165.636 82.947l1.927.219c.413 0 .424.712 0 .666l-1.927-.23c-.413-.046-.425-.7 0-.655zM162.332 81.442l.711.655c.309.287-.149.758-.471.471l-.711-.666c-.344-.288.115-.747.471-.46zM161.505 77.593c0-.413.712-.425.666 0-.08.763-.118 1.53-.115 2.298a.33.33 0 01-.327.272.331.331 0 01-.327-.272c-.013-.767.022-1.535.103-2.298zM162.928 74.123l.666-.988c.229-.357.803 0 .562.333l-.654.988c-.241.356-.803.023-.574-.333zM179.229 67.079c.771.038 1.538.134 2.294.287.413.092.241.724-.172.644a11.92 11.92 0 00-2.111-.265c-.436-.034-.436-.666-.011-.666zM174.216 66.182c.731.035 1.459.115 2.18.242.424.069.241.7-.172.632a14.664 14.664 0 00-2.008-.207c-.413-.023-.413-.678 0-.667zM169.892 65.93a8.449 8.449 0 011.525-.116.332.332 0 010 .656 7.396 7.396 0 00-1.342.103c-.424.058-.596-.575-.183-.643zM166.92 69.159l.769-1.15c.24-.344.814 0 .562.334l-.769 1.15c-.264.344-.837.022-.562-.334zM165.016 72.493l.665-.885c.252-.333.826 0 .574.334l-.666.884c-.252.356-.826.035-.573-.333z'
                    fill='#2D3039'
                />
                <Path
                    d='M192.238 58.358c2.512.69 2.914.173 2.592 3.62-.321 3.447 0 3.113-3.246 2.505-2.294-.449-1.824-1.15-1.434-3.31.39-2.16.688-3.194 2.088-2.815zM164.752 54.715c2.581.357 2.914-.218 3.052 3.24.137 3.46-.562 3.207-2.891 2.908-2.329-.299-1.95-.85-1.858-3.08.091-2.229.263-3.263 1.697-3.068z'
                    fill='#FFBC1F'
                />
                <Path
                    d='M185.962 32.608s-2.776 1.655-1.525 6.584c-3.373-5.033 1.055-11.938 1.055-11.938a1.156 1.156 0 00.941.49 1.147 1.147 0 00.94-.49c3.35-3.448.952-4.597 0-4.195-1.194.4-2.429.662-3.682.782-1.95.322-3.854-2.838-3.854-2.838l.493 1.436a5.545 5.545 0 01-2.81-4.596c1.778-5.688 12.733-6.699 16.816 1.884 4.084 8.584 0 23.395 11.931 21.671-23.7 10.514-20.305-8.79-20.305-8.79z'
                    fill='#4A2407'
                />
                <Mask
                    id='d'

                    // @ts-expect-error style not intrinsic
                    style={{
                        maskType: 'alpha',
                    }}
                    maskUnits='userSpaceOnUse'
                    x={177}
                    y={13}
                    width={30}
                    height={32}
                >
                    <Path
                        d='M185.962 32.609s-2.776 1.654-1.525 6.584c-3.373-5.033 1.055-11.939 1.055-11.939a1.155 1.155 0 00.941.492 1.146 1.146 0 00.94-.492c3.35-3.447.952-4.596 0-4.194a16.62 16.62 0 01-3.682.782c-1.95.322-3.854-2.839-3.854-2.839l.493 1.437a5.545 5.545 0 01-2.81-4.596c1.778-5.688 12.733-6.7 16.816 1.884 4.084 8.583 0 23.394 11.931 21.67-23.7 10.514-20.305-8.79-20.305-8.79z'
                        fill='#66320A'
                    />
                </Mask>
                <G mask='url(#d)'>
                    <Path
                        transform='matrix(-1 0 0 1 206.511 13.158)'
                        fill='url(#pattern3)'
                        d='M0 0H28.9895V31.5012H0z'
                    />
                </G>
                <Path
                    d='M139.275 104.721c6.779 9.595 18.847 21.223 18.847 21.223M177.359 130.103c11.827.449 28.449-4.596 28.449-4.596'
                    stroke='#1E325C'
                    strokeWidth={0.58}
                    strokeMiterlimit={10}
                />
                <Path
                    d='M66.08 57.903h53.515a7.478 7.478 0 015.288 2.165 7.459 7.459 0 012.205 5.262v33.94a7.439 7.439 0 01-2.205 5.262 7.473 7.473 0 01-5.288 2.165h-7.898v12.705L99.85 106.697H66.1a7.477 7.477 0 01-5.289-2.165 7.443 7.443 0 01-2.205-5.262V65.33a7.445 7.445 0 012.199-5.255 7.476 7.476 0 015.276-2.172z'
                    fill='#1C58D9'
                />
                <Path
                    d='M99.85 106.697H66.1a7.477 7.477 0 01-5.288-2.165 7.441 7.441 0 01-2.205-5.262V78.665s2.356 19.054 2.78 20.731c.423 1.677 1.263 4.187 5.244 4.603 3.98.416 33.22 2.698 33.22 2.698z'
                    fill='#000'
                    fillOpacity={0.16}
                />
                <Path
                    d='M111.116 77.448a4.817 4.817 0 00-4.454 2.97 4.8 4.8 0 001.045 5.243 4.823 4.823 0 005.254 1.043 4.824 4.824 0 002.163-1.772 4.802 4.802 0 00-.598-6.077 4.806 4.806 0 00-3.41-1.407zM92.837 77.448a4.828 4.828 0 00-4.454 2.97 4.801 4.801 0 001.045 5.243 4.823 4.823 0 005.253 1.043 4.804 4.804 0 001.566-7.848 4.816 4.816 0 00-3.41-1.408zM74.578 77.448a4.814 4.814 0 00-4.458 2.965 4.802 4.802 0 001.04 5.245 4.824 4.824 0 008.233-3.399 4.796 4.796 0 00-1.408-3.401 4.815 4.815 0 00-3.407-1.41z'
                    fill='#fff'
                />
                <Path
                    d='M121.534 72.114a15.117 15.117 0 00-2.704-5.28 15.159 15.159 0 00-4.53-3.837.523.523 0 01.215-.99c3.374-.201 10.185.517 8.049 10.057a.525.525 0 01-.495.429.531.531 0 01-.535-.379z'
                    fill='#fff'
                    fillOpacity={0.16}
                />
                <Path
                    d='M70.946 13.983H8.512a8.763 8.763 0 00-3.337.648 8.716 8.716 0 00-2.833 1.867 8.652 8.652 0 00-1.898 2.801 8.607 8.607 0 00-.674 3.31v39.42a8.607 8.607 0 00.674 3.31 8.653 8.653 0 001.898 2.802 8.717 8.717 0 002.833 1.867 8.765 8.765 0 003.337.648h9.214v14.756l13.82-14.756h39.378a8.764 8.764 0 003.336-.648 8.717 8.717 0 002.833-1.867 8.653 8.653 0 001.898-2.802 8.608 8.608 0 00.675-3.31V22.61a8.627 8.627 0 00-2.565-6.104 8.742 8.742 0 00-6.155-2.522z'
                    fill='#FFBC1F'
                />
                <Path
                    d='M31.547 70.656h39.377a8.763 8.763 0 003.336-.648 8.718 8.718 0 002.833-1.867 8.651 8.651 0 001.898-2.802 8.606 8.606 0 00.675-3.31V38.098s-2.75 22.13-3.243 24.078c-.494 1.948-1.475 4.862-6.118 5.345-4.644.484-38.758 3.135-38.758 3.135z'
                    fill='#CC8F00'
                />
                <Path
                    d='M18.404 36.684c1.112 0 2.2.328 3.124.942a5.595 5.595 0 012.072 2.508 5.554 5.554 0 01-1.22 6.089 5.659 5.659 0 01-6.13 1.211 5.617 5.617 0 01-2.523-2.058 5.562 5.562 0 01.697-7.057 5.62 5.62 0 013.98-1.635zM39.73 36.684c1.112 0 2.2.328 3.124.942a5.596 5.596 0 012.072 2.508 5.553 5.553 0 01.32 3.228 5.576 5.576 0 01-1.54 2.86 5.658 5.658 0 01-6.13 1.211 5.617 5.617 0 01-2.523-2.057 5.561 5.561 0 01.698-7.057 5.62 5.62 0 013.979-1.635zM61.03 36.684a5.651 5.651 0 013.128.938 5.596 5.596 0 012.074 2.507 5.554 5.554 0 01-1.214 6.091 5.658 5.658 0 01-6.13 1.215 5.617 5.617 0 01-2.526-2.058 5.561 5.561 0 01.695-7.056 5.62 5.62 0 013.974-1.637z'
                    fill='#fff'
                />
                <Path
                    d='M6.249 30.49a17.533 17.533 0 013.155-6.133A17.662 17.662 0 0114.69 19.9a.61.61 0 00.322-.67.607.607 0 00-.573-.48c-3.936-.234-11.882.601-9.39 11.68a.614.614 0 00.577.498.623.623 0 00.624-.439z'
                    fill='#FFD470'
                />
                <Ellipse
                    cx={185.757}
                    cy={209.889}
                    rx={44.4842}
                    ry={2.25131}
                    fill='#000'
                    fillOpacity={0.12}
                />
            </G>
            <Defs>
                <Pattern
                    id='pattern0'
                    patternContentUnits='objectBoundingBox'
                    width={1}
                    height={1}
                >
                    <Use
                        xlinkHref='#image0_1023_92018'
                        transform='scale(.00752 .00331)'
                    />
                </Pattern>
                <Pattern
                    id='pattern1'
                    patternContentUnits='objectBoundingBox'
                    width={1}
                    height={1}
                >
                    <Use
                        xlinkHref='#image1_1023_92018'
                        transform='scale(.00446 .00413)'
                    />
                </Pattern>
                <Pattern
                    id='pattern2'
                    patternContentUnits='objectBoundingBox'
                    width={1}
                    height={1}
                >
                    <Use
                        xlinkHref='#image2_1023_92018'
                        transform='scale(.0045 .0048)'
                    />
                </Pattern>
                <Pattern
                    id='pattern3'
                    patternContentUnits='objectBoundingBox'
                    width={1}
                    height={1}
                >
                    <Use
                        xlinkHref='#image3_1023_92018'
                        transform='scale(.01408 .01299)'
                    />
                </Pattern>
                <ClipPath id='clip0_1023_92018'>
                    <Path
                        fill='#fff'
                        d='M0 0H262.034V212H0z'
                    />
                </ClipPath>
                <Image
                    id='image0_1023_92018'
                    width={133}
                    height={302}

                    // @ts-expect-error string source
                    xlinkHref='data:image/png;base64,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'
                />
                <Image
                    id='image1_1023_92018'
                    width={224}
                    height={242}

                    // @ts-expect-error string source
                    xlinkHref='data:image/png;base64,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'
                />
                <Image
                    id='image2_1023_92018'
                    width={222}
                    height={208}

                    // @ts-expect-error string source
                    xlinkHref='data:image/png;base64,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'
                />
                <Image
                    id='image3_1023_92018'
                    width={72}
                    height={77}

                    // @ts-expect-error string source
                    xlinkHref='data:image/png;base64,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'
                />
            </Defs>
        </Svg>
    );
};

export default ChatSvg;
