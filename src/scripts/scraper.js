import { createScraper } from 'israeli-bank-scrapers';

// Scrape bank data
// @param {string} bank_type - Bank type
// @param {Record<string, string>} credentials - Bank login credentials
// @param {Date} startDate - Start date for transactions
// @returns {Promise<Object>} - Scrape result
export
async function scrape(bank_type, credentials,startDate) {
  
    // Log scraping start
    console.log(`Scraping data for bank: ${bank_type} starting from ${startDate.toISOString().split('T')[0]}`);


    const scraperOptions = {
    companyId: bank_type,
    startDate: startDate,
    args: ["--disable-dev-shm-usage", "--no-sandbox"],
    vebrose: true
  };


  const scraper = createScraper(scraperOptions);


  try {
    const result = await scraper.scrape(credentials);
    console.log(`✓ Scraping completed for bank: ${bank_type}`);
    console.log('Scrape result:', result);
    return result;
  } catch (error) {
    console.error(`✗ Scraping failed: ${error.message}`);
    return { success: false, error: error.message };
  }

 


}