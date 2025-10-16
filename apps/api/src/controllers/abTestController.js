import db from '../../models/index.js';
import { redisService } from '../services/redisService.js';

const { Model, ModelGroup, ModelVersions } = db;

export const getABCorrectEntriesByDay = async (req, res) => {
  try {
    const cacheKey = `ab-correct-entries:${req.params.id}`;
    const cachedData = await redisService.get(cacheKey);
    
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    const model = await Model.findByPk(req.params.id);
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    const response = await model.saveABCorrectEntriesByDayInCache();
    res.status(200).json(response);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getABPrompts = async (req, res) => {
  const model = await Model.findByPk(req.params.id);
  if (!model) {
    return res.status(404).json({ error: 'Model not found' });
  }

  try {
    const prompts = await model.getABPrompts();
    res.status(200).json(prompts);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getABMetricsById = async (req, res) => {
  try {
    const cacheKey = `ab-metrics:${req.params.id}`;
    const cachedData = await redisService.get(cacheKey);
    
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    const model = await Model.findByPk(req.params.id);
    const response = await model.saveABMetricsInCache();
    res.status(200).json(response);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const runModelABBatch = async (req, res) => {
  try {
    const model = await Model.findByPk(req.params.id);
    await model.runABTestBatch();

    res.status(200).json({ message: 'AB Test Batch started' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getOptimizedModel = async (req, res) => {
  const model = await Model.findByPk(req.params.id);
  const optimizedModel = await model.getPrincipalABTestModel();
  res.status(200).json(optimizedModel);
};

export const getMetricsFullDate = async (req, res) => {
  try {
    const cacheKey = `metrics-full-date:${req.params.id}`;
    const cachedData = await redisService.get(cacheKey);
    
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    const model = await Model.findByPk(req.params.id);
    const response = await model.saveMetricsFullDateInCache();
    res.status(200).json(response);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getReferenceLines = async (req, res) => {
  if (!req.params.id || req.params.id === 'undefined' || req.params.id === 'null') {
    return res.status(200).json([]);
  }

  const model = await Model.findByPk(req.params.id);
  if (!model) {
    return res.status(200).json([]);
  }
  const modelGroup = await ModelGroup.findByPk(model.modelGroupId);
  const company = await modelGroup.getCompany();
  const referenceLines = [];
  if (company.testMode) {
    // make 2 reference lines one 10 days ago and another one 20 days ago
    let date = new Date();
    
    date.setDate(date.getDate() - 10);
    date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    let referenceLine = {
      date: date.toISOString().split('T')[0],
      label: 'V3',
      color: 'var(--mui-palette-primary-main)'
    }
    referenceLines.push(referenceLine);

    date.setDate(date.getDate() - 10);
    // date without hours, minutes and seconds
    date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    referenceLine = {
      date: date.toISOString().split('T')[0],
      label: 'V2',
      color: 'var(--mui-palette-primary-main)'
    }
    referenceLines.push(referenceLine);

    res.status(200).json(referenceLines);
  } else {
    const model = await Model.findByPk(req.params.id);
    
    const modelVersions = await ModelVersions.findAll({
      where: {
        modelId: model.id,
      },
    });

    const referenceLines = modelVersions.map((modelVersion) => {
      const date = modelVersion.createdAt.toISOString().split('T')[0];
      return {
        date: date,
        label: 'V '  + ((parseInt(modelVersion.version) || 0) + 1).toString(),
        color: 'var(--mui-palette-primary-main)',
      };
    });
    
    
    
    res.status(200).json(referenceLines);
  }
};
