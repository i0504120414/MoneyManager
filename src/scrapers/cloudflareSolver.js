import { createLogger, logToMetadataFile } from '../utils/logger.js';

const logger = createLogger('cloudflare-solver');

/**
 * Generate realistic mouse movement path
 * Mimics human-like cursor movement instead of instant jumps
 */
function* getMousePath(fromPoint, toPoint) {
  let [x, y] = fromPoint;
  const [x2, y2] = toPoint;

  while (Math.abs(x - x2) > 3 || Math.abs(y - y2) > 3) {
    const diff = Math.abs(x - x2) + Math.abs(y - y2);
    let speed = Math.random() * 2 + 1;

    if (diff < 20) {
      speed = Math.random() * 3 + 1;
    } else {
      speed *= diff / 45;
    }

    if (Math.abs(x - x2) > 3) {
      x += x < x2 ? speed : -speed;
    }
    if (Math.abs(y - y2) > 3) {
      y += y < y2 ? speed : -speed;
    }

    yield [Math.round(x), Math.round(y)];
  }
}

/**
 * Realistic mouse movement with delays
 */
async function moveTo(page, from, to) {
  logger(`Moving mouse from [${from}] to [${to}]`);
  
  for (const [px, py] of getMousePath(from, to)) {
    if (page.isClosed()) {
      throw new Error('Page closed during mouse movement');
    }
    
    await page.mouse.move(px, py);
    
    // Random delay: 15% chance of no delay, otherwise 100-500ms
    if (Math.random() * 100 > 15) {
      const delay = Math.random() * 400 + 100;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  logger(`Mouse movement complete`);
  return to;
}

/**
 * Solve Cloudflare Turnstile challenge
 * Monitors for challenge, moves mouse realistically, and clicks checkbox
 * 
 * This mimics human interaction to pass Turnstile bot detection
 */
export async function solveTurnstile(page) {
  logger(`Attempting to solve Turnstile challenge...`);
  logToMetadataFile('Turnstile challenge detected');
  
  try {
    const windowWidth = await page.evaluate(() => window.innerWidth);
    const windowHeight = await page.evaluate(() => window.innerHeight);
    logger(`Window size: ${windowWidth}x${windowHeight}`);
    
    // Handle page close events during solving
    const closeListener = () => {
      logger(`Page closed during Turnstile solving`);
      logToMetadataFile('Page closed during Turnstile');
    };
    page.on('close', closeListener);

    // Turnstile iframe location (approximate center)
    const containerLocation = { x: 506, y: 257 };
    const checkboxBox = { x: 522, y: 280, width: 20, height: 20 };

    // Start mouse movement from random location
    let currentPosition = [0, 0];
    currentPosition = await moveTo(page, currentPosition, [
      containerLocation.x + Math.random() * 12 + 5,
      containerLocation.y + Math.random() * 12 + 5,
    ]);

    logger(`Waiting before checkbox click...`);
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Move to checkbox with realistic randomness
    const { x, y, width, height } = checkboxBox;
    currentPosition = await moveTo(page, currentPosition, [
      x + width / 5 + Math.random() * (width - width / 5),
      y + height / 5 + Math.random() * (height - height / 5),
    ]);

    // Click checkbox
    logger(`Clicking Turnstile checkbox...`);
    await page.mouse.click(...currentPosition);
    
    // Wait for challenge to complete
    logger(`Waiting for challenge completion (60s timeout)...`);
    await page.waitForNavigation({ timeout: 60_000 });
    
    logger(`✓ Turnstile challenge solved successfully`);
    logToMetadataFile('Turnstile solved', { result: 'success' });
    page.off('close', closeListener);
    
    return 'success';
    
  } catch (error) {
    logger(`✗ Turnstile challenge failed: ${error.message}`);
    logToMetadataFile('Turnstile failed', { error: error.message });
    return `failed: ${error.message}`;
  }
}

/**
 * Setup Cloudflare bypass for a page
 * Detects challenges and automatically solves them
 */
export async function setupCloudflareBypass(page) {
  logger(`Setting up Cloudflare bypass...`);
  
  const cfParam = '__cf_chl_rt_tk';
  
  // Update user agent to avoid headless detection
  const userAgent = await page.evaluate(() => navigator.userAgent);
  const newUA = userAgent.replace('HeadlessChrome/', 'Chrome/');
  logger(`Updating user agent: ${userAgent} → ${newUA}`);
  await page.setUserAgent(newUA);
  
  // Monitor navigation for Cloudflare challenges
  page.on('framenavigated', (frame) => {
    const url = frame.url();
    if (!url || url === 'about:blank') return;
    
    logger(`Frame navigated: ${url}`);
    logToMetadataFile('Frame navigated', { url });
    
    if (url.includes(cfParam)) {
      logger(`⚠ Cloudflare challenge detected at ${url}`);
      logToMetadataFile('Cloudflare challenge detected', { url });
      
      // Solve challenge asynchronously
      solveTurnstile(page).then(
        (result) => {
          logger(`Cloudflare resolved: ${result}`);
          logToMetadataFile('Cloudflare resolved', { result });
        },
        (error) => {
          logger(`Cloudflare solving error: ${error.message}`);
          logToMetadataFile('Cloudflare error', { error: error.message });
        }
      );
    }
  });
  
  logger(`Cloudflare bypass ready`);
}

export default { solveTurnstile, setupCloudflareBypass };
