'use strict';

export const up = async (queryInterface, Sequelize) => {
  // Add github_user_id column
  await queryInterface.addColumn('AgentLogs', 'session_id', {
    type: Sequelize.STRING,
    allowNull: true,
  });
};

export const down = async (queryInterface, Sequelize) => {
  // Remove oauth_provider column
  await queryInterface.removeColumn('AgentLogs', 'session_id');
};
