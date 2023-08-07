//
//  Sentry.swift
//  Mattermost
//
//  Created by Avinash Lingaloo on 20/12/2022.
//  Copyright © 2022 Facebook. All rights reserved.
//
import Foundation

import Sentry

func initSentryAppExt(){
  if let SENTRY_ENABLED = Bundle.main.infoDictionary?["SENTRY_ENABLED"] as? String,
     let SENTRY_DSN = Bundle.main.infoDictionary?["SENTRY_DSN_IOS"] as? String {
        if(SENTRY_ENABLED=="true"){
          SentrySDK.start { options in
            options.dsn = SENTRY_DSN
            options.enableAppHangTracking = true
            options.enableCaptureFailedRequests = false
          }
        }
    }
}

func testSentry(msg: String){
  SentrySDK.capture(message: msg)
}
