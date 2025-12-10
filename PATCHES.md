# Patch Files Documentation

This document describes the npm package patches applied to the project.

## Applied Patches

### 1. `israeli-bank-scrapers+6.3.7.patch`

**Purpose**: Improve error messages and logging for Visa Cal scraper

**Changes**:
- **User-Agent Header**: Changed from macOS to Windows for better compatibility with Visa Cal API
  - `Macintosh; Intel Mac OS X 10_15_7` → `Windows NT 10.0; Win64; x64`
  
- **Error Message Enhancement**: When transaction fetch fails, now includes full JSON response instead of just title
  - Before: `Message: ${monthData?.title || ''}`
  - After: `Message: ${JSON.stringify(monthData)}`
  
- **Benefits**:
  - Provides complete error context for debugging API issues
  - Helps identify whether failures are auth-related, network-related, or data-format issues
  - Windows User-Agent may improve compatibility with corporate firewalls/proxies

### 2. `ky+1.14.1.patch`

**Purpose**: Increase HTTP request timeout for slow bank APIs

**Changes**:
- **Request Timeout**: Extended from 10 seconds to 180 seconds
  - Accommodates slower Israeli bank APIs
  - Prevents premature timeouts on high-load periods
  
- **Benefits**:
  - More stable scraping during peak hours
  - Reduces false timeout errors when banks are responding slowly

## How Patches Are Applied

The patches are automatically applied during Docker build via the `patch-package` npm utility:

```dockerfile
RUN npm ci --ignore-scripts && \
    npx patch-package
```

This command:
1. Installs npm dependencies without running install scripts
2. Applies all `.patch` files in the `patches/` directory to node_modules
3. Patches are idempotent - safe to run multiple times

## Modifying Patches

To update a patch after modifying node_modules files directly:

```bash
# Edit the file in node_modules/israeli-bank-scrapers/lib/scrapers/visa-cal.js
# Then regenerate the patch:
npx patch-package israeli-bank-scrapers
```

## Testing Patches

To verify patches are applied correctly:

```bash
# Build Docker image
docker build -t money-manager:latest .

# Check if User-Agent is correct
docker run money-manager:latest grep -A2 "User-Agent" node_modules/israeli-bank-scrapers/lib/scrapers/visa-cal.js

# Check if timeout is correct  
docker run money-manager:latest grep "timeout" node_modules/ky/dist/index.js
```

## Debugging Failed Patch Application

If `npx patch-package` fails during Docker build:

1. **Check patch format**: Ensure the `.patch` file has proper unified diff format
2. **Verify file existence**: Confirm the patch file references existing source files
3. **Check line numbers**: The `@@ -266,14 +266,14 @@` format must match actual file content
4. **Regenerate if needed**:
   ```bash
   npm install
   # Make your edits to node_modules
   npx patch-package package-name
   ```

## Future Enhancements

Potential patches to consider:
- Add debug logging at HTTP request/response boundaries
- Handle specific HTTP status codes from banks
- Add retry logic with exponential backoff
- Improve error message clarity for different failure modes
