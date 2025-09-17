import { sendEmail } from "../services/emailService.js";
import { sendModelFailureNotification, sendTestModelFailureAlert } from "../services/emailService.js";
import db from '../../models/index.js';

const { ModelLog, Model, AgentLog, Agent, AgentNode, Company, Email, User } = db;

export const testSend = async (req, res) => {
  try {
    await sendEmail(
      {
        to: "gfcristhian98@gmail.com",
        subject: "Test Email",
        text: "This is a test email",
        html: "<p>This is a test email</p>",
        attachments: []
      }
    )
    res.status(201).json({});
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const testModelFailureNotification = async (req, res) => {
  try {
    const { modelLogId } = req.body;

    if (!modelLogId) {
      return res.status(400).json({ error: 'modelLogId is required' });
    }

    // Find the modelLog
    const modelLog = await ModelLog.findByPk(modelLogId);
    if (!modelLog) {
      return res.status(404).json({ error: `ModelLog with id ${modelLogId} not found` });
    }

    // Send the model failure notification
    await sendModelFailureNotification(
      modelLog, 
      Model, 
      AgentLog, 
      Agent, 
      AgentNode, 
      Company, 
      Email, 
      User,
    );

    res.status(200).json({ 
      message: 'Model failure notification sent successfully',
      modelLogId: modelLogId
    });
  } catch (error) {
    console.error('Error sending model failure notification:', error);
    res.status(500).json({ error: error.message });
  }
};

export const testModelFailureAlert = async (req, res) => {
  try {
    const { modelLogId } = req.body;

    if (!modelLogId) {
      return res.status(400).json({ error: 'modelLogId is required' });
    }

    // Use our new test function
    const result = await sendTestModelFailureAlert(modelLogId, db);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error sending test model failure alert:', error);
    res.status(500).json({ 
      success: false,
      message: `Failed to send test model failure alert: ${error.message}`,
      error: error.message 
    });
  }
};
