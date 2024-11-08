interface Constants {
    confederacyURL: string;
    nanostoreURL: string;
    confederacyURLs: string[];
    nanostoreURLs: string[];
  }
  
  // Define the URLs for different environments
  const confederacyLocalhostURL = 'http://localhost:3002';
  const nanostoreLocalURL = 'http://localhost:3104';
  const confederacyDevStagingURL = 'https://staging-overlay.babbage.systems';
  const nanostoreDevStagingURL = 'https://staging-nanostore.babbage.systems';
  const confederacyProdURL = 'https://confederacy.babbage.systems';
  const nanostoreProdURL = 'https://nanostore.babbage.systems';
  
  // Define URL arrays for the dropdown options
  const confederacyURLs = [confederacyLocalhostURL, confederacyDevStagingURL, confederacyProdURL];
  const nanostoreURLs = [nanostoreLocalURL, nanostoreDevStagingURL, nanostoreProdURL];
  
  // Assign the appropriate URLs based on the environment
  let constants: Constants;
  
  if (window.location.host.startsWith('localhost')) {
    // Local environment
    constants = {
      confederacyURL: confederacyLocalhostURL,
      nanostoreURL: nanostoreLocalURL,
      confederacyURLs: confederacyURLs,
      nanostoreURLs: nanostoreURLs
    };
  } else if (window.location.host.startsWith('staging') || process.env.NODE_ENV === 'development') {
    // Staging/Development environment
    constants = {
      confederacyURL: confederacyDevStagingURL,
      nanostoreURL: nanostoreDevStagingURL,
      confederacyURLs: confederacyURLs,
      nanostoreURLs: nanostoreURLs
    };
  } else {
    // Production environment
    constants = {
      confederacyURL: confederacyProdURL,
      nanostoreURL: nanostoreProdURL,
      confederacyURLs: confederacyURLs,
      nanostoreURLs: nanostoreURLs
    };
  }
  
  export default constants;
  