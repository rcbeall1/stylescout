# StyleScout Feedback System

## Overview

The StyleScout feedback system allows users to rate their experience and provide feedback about the application. It includes security measures to prevent XSS, injection attacks, and spam.

## Features

### User Features
- **Star Rating**: Users can rate their experience from 1-5 stars
- **Predefined Options**: Multiple choice feedback options for common feedback categories
- **Text Feedback**: Optional free-text field (limited to 500 characters)
- **Non-intrusive UI**: Floating feedback button that opens a modal
- **Visual Feedback**: Success/error notifications after submission

### Admin Features
- **Protected Dashboard**: View feedback with admin token authentication
- **Summary Statistics**: Total feedback count and average rating
- **Rating Distribution**: Visual breakdown of star ratings
- **Option Analytics**: See which feedback options are selected most
- **Recent Feedback**: View the last 50 feedback entries

## Security Measures

1. **Input Validation**
   - Rating must be between 1-5
   - Options are validated against predefined list
   - Text feedback limited to 500 characters

2. **Sanitization**
   - HTML tags are stripped from text input
   - Special characters are escaped
   - Null bytes are removed

3. **Rate Limiting**
   - Maximum 5 feedback submissions per hour per IP
   - Prevents spam and abuse

4. **File Security**
   - Feedback stored in JSON file on server
   - No direct file access from client
   - File size limited (keeps only last 1000 entries)

5. **Admin Protection**
   - Admin endpoint requires authentication token
   - Token passed in header, not URL
   - Simple but effective for basic protection

## Setup

1. **Environment Configuration**
   Add to your `.env` file:
   ```
   ADMIN_TOKEN=your_secure_admin_token_here
   ```

2. **File Initialization**
   The feedback file is automatically created at `server/data/feedback.json` when the first feedback is submitted.

## Usage

### For Users
1. Click the feedback button (💬) in the bottom-right corner
2. Select a star rating (required)
3. Optionally select feedback options
4. Optionally add text feedback
5. Click "Submit Feedback"

### For Admins
1. Navigate to `/admin-feedback.html`
2. Enter your admin token
3. View feedback analytics and recent submissions

## API Endpoints

### POST `/api/feedback/submit`
Submit user feedback
- Rate limited: 5 per hour
- Request body:
  ```json
  {
    "rating": 5,
    "options": ["easy-to-use", "helpful-advice"],
    "textFeedback": "Great app!",
    "userAgent": "Mozilla/5.0..."
  }
  ```

### GET `/api/feedback/options`
Get available feedback options
- Returns list of predefined options with labels

### GET `/api/feedback/admin`
Get feedback data (requires admin token)
- Header: `x-admin-token: your_token`
- Returns summary statistics and recent feedback

## Feedback Options

Current predefined options:
- `easy-to-use`: Easy to Use
- `helpful-advice`: Helpful Advice
- `accurate-weather`: Accurate Weather
- `good-outfit-ideas`: Good Outfit Ideas
- `fast-response`: Fast Response
- `needs-more-detail`: Needs More Detail
- `outfit-images-helpful`: Outfit Images Helpful
- `would-recommend`: Would Recommend

## File Structure

```
stylescout/
├── server/
│   ├── routes/
│   │   └── feedback.js      # Feedback API routes
│   └── data/
│       └── feedback.json    # Feedback storage (gitignored)
├── public/
│   ├── js/
│   │   └── feedback.js      # Client-side feedback logic
│   ├── css/
│   │   └── style.css        # Includes feedback styles
│   └── admin-feedback.html  # Admin dashboard
└── docs/
    └── FEEDBACK_SYSTEM.md   # This file
```

## Maintenance

- Feedback file automatically limits to 1000 entries
- Old entries are removed when limit is exceeded
- Monitor file size if you expect high volume
- Consider database storage for production use

## Future Enhancements

Potential improvements:
- Database storage instead of JSON file
- More sophisticated authentication (JWT, OAuth)
- Email notifications for new feedback
- Export functionality for feedback data
- Sentiment analysis on text feedback
- A/B testing integration