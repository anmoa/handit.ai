'use strict';

export const up = async (queryInterface, Sequelize) => {
  await queryInterface.addColumn('Companies', 'showTrackedNodesOnly', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'show_tracked_nodes_only',
    comment: 'Flag to indicate if company should show only tracked nodes in tracing instead of full structure'
  });
};

export const down = async (queryInterface) => {
  await queryInterface.removeColumn('Companies', 'showTrackedNodesOnly');
};
