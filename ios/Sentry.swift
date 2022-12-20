//
//  Sentry.swift
//  Mattermost
//
//  Created by Avinash Lingaloo on 16/12/2022.
//  Copyright © 2022 Facebook. All rights reserved.
//

import Foundation

import Sentry

func initSentryAppExt(){
if let SENTRY_ENABLED = Bundle.main.infoDictionary?["SENTRY_ENABLED"] as? String,
   let SENTRY_DSN_IOS = Bundle.main.infoDictionary?["SENTRY_DSN_IOS"] as? String {
    if(SENTRY_ENABLED=="true"){
      SentrySDK.start { options in
        options.dsn = SENTRY_DSN_IOS

        // Features turned off by default, but worth checking out
        options.enableAppHangTracking = true
        options.enableFileIOTracking = true
        options.enableCoreDataTracking = true
        options.enableCaptureFailedRequests = true
      }
    }
  }
}

func testSentry(msg: String){
  SentrySDK.capture(message: msg)
}
