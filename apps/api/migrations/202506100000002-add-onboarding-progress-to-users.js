'use strict';

import { Sequelize } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
export const up = async (queryInterface) => {
  await queryInterface.addColumn('Users', 'onboarding_current_tour', {
    type: Sequelize.STRING,
    allowNull: true,
    comment: 'Current active onboarding tour ID'
  });
};

export const down = async (queryInterface) => {
  await queryInterface.removeColumn('Users', 'onboarding_current_tour');
}; 