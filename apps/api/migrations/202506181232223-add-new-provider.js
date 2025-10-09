'use strict';

import { Sequelize } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
export const up = async (queryInterface) => {
  const now = new Date();
  
  // List of Anthropic models
  const anthropicModels = [
    'anthropic.claude-3-haiku-20240307-v1:0',
    'anthropic.claude-3-opus-20240229-v1:0',
    'anthropic.claude-3-sonnet-20240229-v1:0',
    'anthropic.claude-3-5-haiku-20241022-v1:0',
    'anthropic.claude-3-5-sonnet-20241022-v2:0',
    'anthropic.claude-3-5-sonnet-20240620-v1:0',
    'anthropic.claude-3-7-sonnet-20250219-v1:0',
    'anthropic.claude-opus-4-20250514-v1:0',
    'anthropic.claude-sonnet-4-20250514-v1:0',
    'anthropic.claude-v2:1',
    'anthropic.claude-v2'
  ];

  // Check if Anthropic provider already exists
  const [bedrock] = await queryInterface.sequelize.query(
    `SELECT id FROM "Providers" WHERE name = 'AWSBedrock'`
  );
  
  if (bedrock.length === 0) {
    await queryInterface.bulkInsert('Providers', [
      {
        name: 'AWSBedrock',
        type: 'AI',
        config: JSON.stringify({ models: anthropicModels }),
        created_at: now,
        updated_at: now,
      },
    ]);
  }
};

export const down = async (queryInterface) => {
  await queryInterface.bulkDelete('Providers', { name: 'Anthropic' });
}; 