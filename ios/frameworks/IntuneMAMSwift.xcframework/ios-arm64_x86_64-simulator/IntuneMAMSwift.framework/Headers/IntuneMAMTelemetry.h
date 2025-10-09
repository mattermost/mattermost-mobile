//
//  Copyright (c) Microsoft Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>

typedef NS_ENUM(NSUInteger, IntuneMAMTelemetryPrivacyLevel)
{
  IntuneMAMTelemetryPrivacyOptionalDiagnosticData,
  IntuneMAMTelemetryPrivacyRequiredServiceData,
  IntuneMAMTelemetryPrivacyRequiredDiagnosticData
};

typedef NS_OPTIONS(NSInteger, IntuneMAMTelemetryPrivacyDataTypes)
{
  IntuneMAMTelemetryPrivacyDataTypesProductAndServiceUsage = 1 << 0,
  IntuneMAMTelemetryPrivacyDataTypesProductAndServicePerformance = 1 << 1,
  IntuneMAMTelemetryPrivacyDataTypesDeviceConnectivityAndConfiguration = 1 << 2,
  IntuneMAMTelemetryPrivacyDataTypesSoftwareSetupAndInventory = 1 << 3,
  IntuneMAMTelemetryPrivacyDataTypesBrowsingHistory = 1 << 4,
  IntuneMAMTelemetryPrivacyDataTypesInkingTypingAndSpeechUtterance = 1 << 5
};

typedef NS_ENUM(NSUInteger, IntuneMAMTelemetryPriorityLevel)
{
  IntuneMAMTelemetryPriorityLow       = 1, /**< Send the event with low priority. */
  IntuneMAMTelemetryPriorityNormal    = 2, /**< Send the event with normal priority. */
  IntuneMAMTelemetryPriorityHigh      = 3, /**< Send the event with high priority. */
  IntuneMAMTelemetryPriorityImmediate = 4  /**< Send the event as soon as possible. */
};

typedef NS_ENUM(NSUInteger, IntuneMAMTelemetryDataRegion)
{
    IntuneMAMTelemetryDataRegionGlobal = 0,
    IntuneMAMTelemetryDataRegionEU,
    IntuneMAMTelemetryDataRegionMax
};

__attribute__((visibility("default")))
@protocol IntuneMAMTelemetryDelegate <NSObject>

@required

/*!
 * Logs the specified event to Aria.
 * @param accountId The AAD object ID (OID) of the identity associated with the telemnetry event
 * @param name The name of the event.
 * @param privacyLevel Privacy level of the data that is being sent.
 * @param privacyDataTypes Privacy data types of the data that is being sent.
 * @param priorityLevel Priority level of the data that is being sent.
 * @param properties Additional properties related to the event.
 * @param dataRegion Destination Aria data storage region.
 * @param tenantID Destination Aria tenant ID.
 */
- (void)logAriaEventForAccountId:(NSString * _Nullable)accountId
    withName: (NSString * _Nonnull)name
    properties:(NSDictionary<NSString *, NSObject *> * _Nonnull)properties
    privacyLevel:(IntuneMAMTelemetryPrivacyLevel)privacyLevel
    privacyDataTypes: (IntuneMAMTelemetryPrivacyDataTypes)privacyDataTypes
    priorityLevel:(IntuneMAMTelemetryPriorityLevel)priorityLevel
    dataRegion:(IntuneMAMTelemetryDataRegion)dataRegion
    tenantID:(NSString * _Nonnull)tenantID;

@end

__attribute__((visibility("default")))
@interface IntuneMAMTelemetryManager : NSObject

/**
 *  The delegate property is used to request that the application log telemetry events
 *  on behalf of the Intune SDK. Applications should set this property immediately on launch,
 *  even if the app is not yet enrolled. The application is respoonsible for adding any additional
 *  properties/tags required and determining whether to send the event based on the user's
 *  privacy preferences.
 */
@property (nonatomic,weak,nullable) id<IntuneMAMTelemetryDelegate> delegate;

/**
 *  Returns the instance of the IntuneMAMTelemetryManager class
 *
 *  @return IntuneMAMTelemetryManager shared instance
 */
+ (IntuneMAMTelemetryManager* _Nonnull) instance;

/**
 *  Init is not available, please use instance:
 *
 *  Xcode issues a warning if you try to override the annotation.
 *  Note that we'll return nil if you use this
 *  because you should not use this, you should use instance above.
 *
 *  @return nil
 */
- (id _Nonnull) init __attribute__((unavailable("Must use + (IntuneMAMTelemetryManager*) instance")));

@end

