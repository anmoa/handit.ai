'use strict';

import { Sequelize } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
export const up = async (queryInterface) => {
  const now = new Date();
  
  // Add new columns to EvaluationPrompts table
  await queryInterface.addColumn('EvaluationPrompts', 'type', {
    type: Sequelize.ENUM('prompt', 'function'),
    allowNull: false,
    defaultValue: 'prompt',
    after: 'name'
  });

  await queryInterface.addColumn('EvaluationPrompts', 'function_body', {
    type: Sequelize.TEXT,
    allowNull: true,
    after: 'prompt'
  });

  // Make prompt column nullable since function evaluators won't use it
  await queryInterface.changeColumn('EvaluationPrompts', 'prompt', {
    type: Sequelize.TEXT,
    allowNull: true
  });

  // Add constraint to ensure either prompt or function_body is provided
  await queryInterface.addConstraint('EvaluationPrompts', {
    fields: ['type', 'prompt', 'function_body'],
    type: 'check',
    name: 'check_prompt_or_function',
    where: {
      [Sequelize.Op.or]: [
        {
          type: 'prompt',
          prompt: { [Sequelize.Op.ne]: null }
        },
        {
          type: 'function',
          function_body: { [Sequelize.Op.ne]: null }
        }
      ]
    }
  });
};

export const down = async (queryInterface) => {
  // Remove the constraint first
  await queryInterface.removeConstraint('EvaluationPrompts', 'check_prompt_or_function');
  
  // Remove the new columns
  await queryInterface.removeColumn('EvaluationPrompts', 'function_body');
  await queryInterface.removeColumn('EvaluationPrompts', 'type');
  
  // Make prompt column required again
  await queryInterface.changeColumn('EvaluationPrompts', 'prompt', {
    type: Sequelize.TEXT,
    allowNull: false
  });
}; 