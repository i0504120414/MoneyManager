# Screenshots

This folder stores screenshots captured during scraper testing and debugging.

## Files Generated

- `visaCal_failure.png` - Screenshot of failure scenarios (login errors, timeouts, etc.)
- `[bankType]_failure.png` - Screenshots from other banks when errors occur

## Usage

Screenshots are automatically generated when:
- Login fails
- Scraping encounters errors
- Testing the connection

To view the latest screenshot:
1. Run `npm run test:connection`
2. Check this folder for the generated screenshot

## Note

All screenshots are tracked in Git and pushed to the repository for debugging purposes.
