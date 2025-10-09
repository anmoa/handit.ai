'use strict';
import { Model } from 'sequelize';
export default (sequelize, DataTypes) => {
  class ModelGroup extends Model {
    static associate(models) {
      ModelGroup.belongsTo(models.Company, { foreignKey: 'company_id' });
      ModelGroup.hasMany(models.Model, { foreignKey: 'model_group_id', as: 'Models' });
    }

    async getCompany() {
      const company = await sequelize.models.Company.findOne({
        where: {
          id: this.companyId,
        },
      });
      return company;
    }
  }
  ModelGroup.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'company_id'
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at'
    }
  }, {
    sequelize,
    modelName: 'ModelGroup',
    timestamps: true,
    paranoid: true,
  });
  return ModelGroup;
};
