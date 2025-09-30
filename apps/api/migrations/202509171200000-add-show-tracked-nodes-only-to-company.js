'use strict';

export const up = async (queryInterface, Sequelize) => {
  await queryInterface.addColumn('Companies', 'show_tracked_nodes_only', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Flag to indicate if company should show only tracked nodes in tracing instead of full structure'
  });
};

export const down = async (queryInterface) => {
  await queryInterface.removeColumn('Companies', 'showTrackedNodesOnly');
};
