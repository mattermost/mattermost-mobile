//
//  Copyright (c) Microsoft Corporation. All rights reserved.
//

#import <Foundation/Foundation.h>

typedef NS_ENUM(NSUInteger, IntuneMAMBoolQueryType)
{
    IntuneMAMBoolAny,
    IntuneMAMBoolOr,
    IntuneMAMBoolAnd
};

typedef NS_ENUM(NSUInteger, IntuneMAMNumberQueryType)
{
    IntuneMAMNumberAny,
    IntuneMAMNumberMin,
    IntuneMAMNumberMax
};

typedef NS_ENUM(NSUInteger, IntuneMAMStringQueryType)
{
    IntuneMAMStringAny,
    IntuneMAMStringMin,
    IntuneMAMStringMax
};

__attribute__((visibility("default")))
@protocol IntuneMAMAppConfig <NSObject>

@required

/**
 *  An array of Dictionaries containing all the AppConfig data sent
 *  by the MAM service/MDM channel.  If a configuration Dictionary was sent as
 *  a tenant wide default configuration, the __IsDefault key will be
 *  present in that dictionary and the value for that key will be set
 *  to true.  The __IsDefault key will only be present in the Dictionary
 *  representing the tenant wide default configuration.  All other
 *  configuration dictionaries will contain targeted policies, and
 *  these targeted App Configuration settings should always take
 *  precedence over the tenant wide default configuration settings.
 */
@property (readonly,nullable) NSArray<NSDictionary*>* fullData;

/**
 *  TRUE if there are more than one targeted App Configuration settings
 *  for the key provided, and the values are not all identical.  This
 *  method will return FALSE if there is a tenant wide default configuration
 *  setting for the key as well as only one targeted App Configuration setting,
 *  as the targeted should take precedence and there is no need for further
 *  conflict resolution.  This method will return FALSE if there were no App
 *  Configuration settings sent from the MAM service/MDM channel for the key requested,
 *  or if there are multiple, but all identical, settings for the same key.
 */
- (BOOL) hasConflict: (NSString*_Nonnull) key;

/**
 *  Returns a BOOL value as an NSNumber object for the key provided
 *  based on the query type provided.  This method will return a nil
 *  if there are no App Configuration settings sent from the MAM
 *  service/MDM channel for the key requested.  This method will only return a
 *  value from the tenant wide default configuration if it is the
 *  only value sent from the MAM service/MDM channel for the key provided.
 */
- (NSNumber*_Nullable) boolValueForKey:(NSString*_Nonnull)key queryType:(IntuneMAMBoolQueryType)queryType;

/**
 *  Returns an NSNumber object for the key provided based on the query type provided.
 *  This method will return a nil if there are no App Configuration settings sent
 *  from the MAM service/MDM channel for the key requested.  This method will only return a
 *  value from the tenant wide default configuration if it is the
 *  only value sent from the MAM service/MDM channel for the key provided.
 */
- (NSNumber*_Nullable) numberValueForKey:(NSString*_Nonnull)key queryType:(IntuneMAMNumberQueryType)queryType;

/**
 *  Returns an NSString object for the key provided based on the query type provided.
 *  This method will return a nil if there are no App Configuration settings sent
 *  from the MAM service/MDM channel for the key requested.  This method will only return a
 *  value from the tenant wide default configuration if it is the
 *  only value sent from the MAM service/MDM channel for the key provided.
 */
- (NSString*_Nullable) stringValueForKey:(NSString*_Nonnull)key queryType:(IntuneMAMStringQueryType)queryType;

/**
 *  Returns an array of BOOL values as an NSNumber objects for the key provided.
 *  This method will return an empty array if there are no App Configuration
 *  settings sent from the MAM service/MDM channel for the key requested.  This method will
 *  only return a value from the tenant wide default configuration if it is the
 *  only value sent from the MAM service/MDM channel for the key provided.
 */
- (NSArray<NSNumber*>*_Nullable) allBoolsForKey:(NSString*_Nonnull)key;

/**
 *  Returns an array of NSNumber objects for the key provided.
 *  This method will return an empty array if there are no App Configuration
 *  settings sent from the MAM service/MDM channel for the key requested.  This method will
 *  only return a value from the tenant wide default configuration if it is the
 *  only value sent from the MAM service/MDM channel for the key provided.
 */
- (NSArray<NSNumber*>*_Nullable) allNumbersForKey:(NSString*_Nonnull)key;

/**
 *  Returns an array of NSString objects for the key provided.
 *  This method will return an empty array if there are no App Configuration
 *  settings sent from the MAM service/MDM channel for the key requested.  This method will
 *  only return a value from the tenant wide default configuration if it is the
 *  only value sent from the MAM service/MDM channel for the key provided.
 */
- (NSArray<NSString*>*_Nullable) allStringsForKey:(NSString*_Nonnull)key;

@end
