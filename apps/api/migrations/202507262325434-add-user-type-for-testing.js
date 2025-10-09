'use strict';

import { Sequelize } from 'sequelize';

export const up = async (queryInterface, Sequelize) => {
  await queryInterface.addColumn('Users', 'user_type', {
    type: Sequelize.ENUM('regular', 'testing', 'admin'),
    allowNull: false,
    defaultValue: 'regular',
    field: 'user_type'
  });
};

export const down = async (queryInterface) => {
  await queryInterface.removeColumn('Users', 'user_type');
}; 