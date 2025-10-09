import db from '../../models/index.js';

export const createIntegrationToken = async (req, res) => {
  try {
    const companyId = req.userObject?.companyId || req.company?.id;
    if (!companyId) return res.status(400).json({ error: 'Missing companyId' });
    const { providerId, name, token, accessKeyId, secretAccessKey, region, authMethod, secret, data, expiresAt } = req.body;
    
    if (!providerId) {
      return res.status(400).json({ error: 'providerId is required' });
    }

    // Get provider to check if it's AWSBedrock
    const provider = await db.Provider.findByPk(providerId);
    if (!provider) {
      return res.status(400).json({ error: 'Invalid providerId' });
    }

    let tokenData = {};
    let tokenValue = null;

    if (provider.name === 'AWSBedrock') {
      if (authMethod === 'awsCredentials') {
        // For AWS Bedrock with credentials, store credentials in data field
        if (!accessKeyId || !secretAccessKey || !region) {
          return res.status(400).json({ error: 'accessKeyId, secretAccessKey, and region are required for AWSBedrock with credentials' });
        }
        tokenData = {
          accessKeyId,
          secretAccessKey,
          region
        };
        tokenValue = 'aws-bedrock-credentials'; // Placeholder value
      } else {
        // For AWS Bedrock with API key, use token field
        if (!token) {
          return res.status(400).json({ error: 'API key is required for AWSBedrock with API key authentication' });
        }
        tokenValue = token;
      }
    } else {
      // For other providers, use token field
      if (!token) {
        return res.status(400).json({ error: 'token is required' });
      }
      tokenValue = token;
    }

    const integrationToken = await db.IntegrationToken.create({
      companyId,
      providerId,
      name,
      type: 'token',
      token: tokenValue,
      data: Object.keys(tokenData).length > 0 ? tokenData : data,
      secret,
      expiresAt,
    });
    res.status(201).json(integrationToken);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateIntegrationToken = async (req, res) => {
  try {
    const companyId = req.userObject?.companyId || req.company?.id;
    if (!companyId) return res.status(400).json({ error: 'Missing companyId' });
    const { id } = req.params;
    const integrationToken = await db.IntegrationToken.findOne({ where: { id, companyId } });
    if (!integrationToken) return res.status(404).json({ error: 'Token not found' });
    
    const { providerId, name, token, accessKeyId, secretAccessKey, region, authMethod, secret, data, expiresAt } = req.body;
    
    let updateData = { name, secret, expiresAt };
    
    if (providerId) {
      // Get provider to check if it's AWSBedrock
      const provider = await db.Provider.findByPk(providerId);
      if (!provider) {
        return res.status(400).json({ error: 'Invalid providerId' });
      }

      updateData.providerId = providerId;

      if (provider.name === 'AWSBedrock') {
        if (authMethod === 'awsCredentials') {
          // For AWS Bedrock with credentials, store credentials in data field
          if (!accessKeyId || !secretAccessKey || !region) {
            return res.status(400).json({ error: 'accessKeyId, secretAccessKey, and region are required for AWSBedrock with credentials' });
          }
          updateData.data = {
            accessKeyId,
            secretAccessKey,
            region
          };
          updateData.token = 'aws-bedrock-credentials'; // Placeholder value
        } else {
          // For AWS Bedrock with API key, use token field
          if (!token) {
            return res.status(400).json({ error: 'API key is required for AWSBedrock with API key authentication' });
          }
          updateData.token = token;
          updateData.data = data;
        }
      } else {
        // For other providers, use token field
        if (!token) {
          return res.status(400).json({ error: 'token is required' });
        }
        updateData.token = token;
        updateData.data = data;
      }
    } else {
      // If providerId is not being updated, check current provider
      const currentProvider = await db.Provider.findByPk(integrationToken.providerId);
      if (currentProvider?.name === 'AWSBedrock') {
        if (authMethod === 'awsCredentials') {
          if (!accessKeyId || !secretAccessKey || !region) {
            return res.status(400).json({ error: 'accessKeyId, secretAccessKey, and region are required for AWSBedrock with credentials' });
          }
          updateData.data = {
            accessKeyId,
            secretAccessKey,
            region
          };
          updateData.token = 'aws-bedrock-credentials'; // Placeholder value
        } else if (authMethod === 'apiKey') {
          if (!token) {
            return res.status(400).json({ error: 'API key is required for AWSBedrock with API key authentication' });
          }
          updateData.token = token;
          updateData.data = data;
        } else {
          // If no authMethod specified, try to determine from existing data
          if (accessKeyId || secretAccessKey || region) {
            if (!accessKeyId || !secretAccessKey || !region) {
              return res.status(400).json({ error: 'accessKeyId, secretAccessKey, and region are required for AWSBedrock with credentials' });
            }
            updateData.data = {
              accessKeyId,
              secretAccessKey,
              region
            };
            updateData.token = 'aws-bedrock-credentials'; // Placeholder value
          } else if (token) {
            updateData.token = token;
            updateData.data = data;
          }
        }
      } else {
        if (token) {
          updateData.token = token;
        }
        if (data) {
          updateData.data = data;
        }
      }
    }
    
    await integrationToken.update(updateData);
    res.json(integrationToken);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getIntegrationTokens = async (req, res) => {
  try {
    const companyId = req.userObject?.companyId || req.company?.id;
    if (!companyId) return res.status(400).json({ error: 'Missing companyId' });
    const tokens = await db.IntegrationToken.findAll({
      where: { companyId },
      include: [{ model: db.Provider, as: 'provider' }],
      order: [['createdAt', 'DESC']],
    });
    res.json(tokens);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const setOptimizationToken = async (req, res) => {
  try {
    const companyId = req.userObject?.companyId || req.company?.id;
    if (!companyId) return res.status(400).json({ error: 'Missing companyId' });
    const { tokenId } = req.body;
    if (!tokenId) return res.status(400).json({ error: 'Missing tokenId' });
    // Check that the token belongs to the company
    const token = await db.IntegrationToken.findOne({ where: { id: tokenId, companyId } });
    if (!token) return res.status(404).json({ error: 'Token not found or not owned by company' });
    // Update company
    const company = await db.Company.findByPk(companyId);
    company.optimizationTokenId = tokenId;
    await company.save();
    res.json({ success: true, company });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; 