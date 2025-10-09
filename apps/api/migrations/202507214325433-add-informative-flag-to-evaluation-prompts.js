'use strict';

import { Sequelize } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
export const up = async (queryInterface) => {
  await queryInterface.addColumn('EvaluationPrompts', 'is_informative', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    after: 'type',
  });
};

export const down = async (queryInterface) => {
  await queryInterface.removeColumn('EvaluationPrompts', 'is_informative');
}; 