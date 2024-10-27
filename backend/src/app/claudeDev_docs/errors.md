# Errors Log

1. Issue: Incorrect API endpoint selection
   Solution: Improved relevance scoring in selectApi function

2. Issue: Number parsing fails for written numbers above ten
   Solution: Extend numberMap in extractParameters to include higher numbers

3. Issue: API rate limiting errors
   Solution: Implement exponential backoff and retry mechanism in AudiusApi class

4. Issue: Playlist search returns no results for valid names
   Solution: Improve playlist name extraction in extractParameters function