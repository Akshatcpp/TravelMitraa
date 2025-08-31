const axios = require('axios');
const logger = require('../utils/logger');

class TokenService {
    constructor() {
        this.clientId = process.env.MAPPLS_CLIENT_ID;
        this.clientSecret = process.env.MAPPLS_CLIENT_SECRET;
        this.staticAccessToken = process.env.MAPPLS_ACCESS_TOKEN;
        this.projectCode = process.env.MAPPLS_PROJECT_CODE;
        
        // OAuth token management
        this.accessToken = null;
        this.tokenExpiry = null;
        this.refreshTokenInterval = null;
        
        // Token endpoints
        this.oauthEndpoint = 'https://outpost.mappls.com/api/security/oauth/token';
        
        this.initialize();
    }

    /**
     * Initialize token service
     */
    async initialize() {
        try {
            // If we have static token, use it; otherwise, get OAuth token
            if (this.staticAccessToken) {
                this.accessToken = this.staticAccessToken;
                logger.info('Using static access token for Mappls API');
                
                // Test the static token
                const isValid = await this.validateToken(this.staticAccessToken);
                if (!isValid) {
                    logger.warn('Static token validation failed, falling back to OAuth');
                    await this.generateOAuthToken();
                }
            } else if (this.clientId && this.clientSecret) {
                await this.generateOAuthToken();
            } else {
                throw new Error('No valid Mappls credentials found');
            }
        } catch (error) {
            logger.error('Token service initialization failed:', error.message);
            throw error;
        }
    }

    /**
     * Generate OAuth2 token from Mappls
     */
    async generateOAuthToken() {
        try {
            const response = await axios.post(this.oauthEndpoint, {
                grant_type: 'client_credentials',
                client_id: this.clientId,
                client_secret: this.clientSecret
            }, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                transformRequest: [(data) => {
                    return Object.keys(data)
                        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
                        .join('&');
                }]
            });

            if (response.data && response.data.access_token) {
                this.accessToken = response.data.access_token;
                this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
                
                logger.info('OAuth token generated successfully', {
                    expiresIn: response.data.expires_in,
                    tokenType: response.data.token_type
                });

                // Set up automatic token refresh (refresh 5 minutes before expiry)
                this.setupTokenRefresh(response.data.expires_in);
                
                return this.accessToken;
            } else {
                throw new Error('Invalid OAuth response from Mappls');
            }
        } catch (error) {
            logger.error('OAuth token generation failed:', {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data
            });
            throw new Error('Failed to authenticate with Mappls API');
        }
    }

    /**
     * Setup automatic token refresh
     */
    setupTokenRefresh(expiresIn) {
        // Clear existing interval
        if (this.refreshTokenInterval) {
            clearInterval(this.refreshTokenInterval);
        }

        // Refresh 5 minutes before expiry
        const refreshTime = (expiresIn - 300) * 1000;
        
        this.refreshTokenInterval = setTimeout(async () => {
            try {
                await this.generateOAuthToken();
                logger.info('Token refreshed automatically');
            } catch (error) {
                logger.error('Automatic token refresh failed:', error.message);
            }
        }, refreshTime);
    }

    /**
     * Get current valid access token
     */
    async getAccessToken() {
        // Check if token is about to expire (5 minutes buffer)
        if (this.tokenExpiry && (Date.now() + 5 * 60 * 1000) >= this.tokenExpiry) {
            logger.info('Token expiring soon, refreshing...');
            await this.generateOAuthToken();
        }
        
        return this.accessToken;
    }

    /**
     * Validate token by making a test API call
     */
    async validateToken(token) {
        try {
            const testResponse = await axios.get('https://atlas.mappls.com/api/places/autosuggest', {
                params: {
                    query: 'test',
                    access_token: token
                },
                timeout: 5000
            });
            
            return testResponse.status === 200;
        } catch (error) {
            if (error.response?.status === 401) {
                return false;
            }
            // Other errors might be rate limiting, network issues, etc.
            logger.warn('Token validation test failed:', error.message);
            return true; // Assume token is valid if we can't test
        }
    }

    /**
     * Get token info for debugging
     */
    getTokenInfo() {
        return {
            hasToken: !!this.accessToken,
            isStatic: this.accessToken === this.staticAccessToken,
            expiresAt: this.tokenExpiry ? new Date(this.tokenExpiry).toISOString() : null,
            timeUntilExpiry: this.tokenExpiry ? Math.max(0, this.tokenExpiry - Date.now()) : null
        };
    }

    /**
     * Force token refresh
     */
    async forceRefresh() {
        this.accessToken = null;
        this.tokenExpiry = null;
        
        if (this.staticAccessToken) {
            // Test static token first
            const isValid = await this.validateToken(this.staticAccessToken);
            if (isValid) {
                this.accessToken = this.staticAccessToken;
                logger.info('Static token is valid, using it');
                return this.accessToken;
            }
        }
        
        // Generate new OAuth token
        return await this.generateOAuthToken();
    }
}

module.exports = new TokenService();
