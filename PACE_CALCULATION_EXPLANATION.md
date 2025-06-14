# Average Pace Calculation Methodology

## How Average Pace is Calculated

The average pace displayed in your dashboard is calculated using the following methodology:

### 1. Data Source
- **Moving Time**: The actual time spent moving during activities (excludes pauses/stops)
- **Distance**: Total distance covered in each activity
- **Time Period**: Currently calculated for the current month's activities

### 2. Calculation Formula

```
Average Pace = Total Moving Time (minutes) ÷ Total Distance (km or miles)
```

**Step-by-step process:**
1. Filter activities for the current month
2. Sum all moving times from these activities (in seconds)
3. Sum all distances from these activities (in meters)
4. Convert time to minutes: `totalTime / 60`
5. Convert distance to km: `totalDistance / 1000`
6. Calculate pace: `(totalTime in minutes) / (totalDistance in km)`

### 3. Unit Conversion

**For Kilometers (default):**
- Pace shows as `minutes:seconds per km`
- Example: 5:30 /km means 5 minutes 30 seconds per kilometer

**For Miles:**
- Distance converted: `km × 0.621371 = miles`
- Pace adjusted: `pace_per_km ÷ 0.621371 = pace_per_mile`
- Example: 5:30 /km becomes approximately 8:51 /mile

### 4. Display Format

The pace is formatted as `MM:SS` where:
- MM = whole minutes
- SS = remaining seconds (rounded to nearest second)

### 5. Example Calculation

**Sample Data:**
- Activity 1: 5km in 25 minutes
- Activity 2: 10km in 50 minutes
- Activity 3: 3km in 18 minutes

**Calculation:**
- Total Distance: 18km
- Total Time: 93 minutes
- Average Pace: 93 ÷ 18 = 5.17 minutes/km = 5:10 /km

### 6. Why This Method

This weighted average approach gives a more accurate representation of your overall performance because:
- Longer runs have proportionally more influence
- It reflects your actual training load distribution
- It's consistent with how most running platforms calculate pace

### 7. Data Accuracy

All calculations are based on authentic data from your Strava activities, ensuring:
- Real GPS-tracked distances
- Actual moving time (auto-pause enabled)
- Verified activity data from Strava's API