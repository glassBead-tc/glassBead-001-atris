# Fix Track Interface Type Definitions

## Problem
The SDK's type definitions don't match the actual API response format, causing TypeScript errors for users. The SDK defines properties in camelCase while the API returns snake_case.

## Solution
Update the Track interface and related types to match the actual API response format.

### Current SDK Type Definition 
typescript
interface Track {
playCount: number;
favoriteCount: number;
commentCount: number;
// ...
}


### Actual API Response
json
{
"data": [{
"id": "AbP3g",
"title": "Circle Of Life (BLOND:ISH Edit)",
"play_count": 63259,
"favorite_count": 292,
"repost_count": 186,
"comment_count": 1,
"user": {
"name": "BLOND:ISH",
"handle": "Blondish"
}
}]
}


### Proposed Type Definition
typescript
interface Track {
play_count: number; // Changed from playCount
favorite_count: number; // Changed from favoriteCount
comment_count: number; // Changed from commentCount
// ... other properties remain the same
}


## Changes
- Update Track interface to use snake_case property names matching API response
- Update all related interfaces for consistency
- Add example API responses in documentation
- Add migration guide for existing users

## Testing
Verified with actual API responses from:
- GET /tracks/trending
- GET /tracks/{track_id}

## Migration Guide
Update property access to use snake_case